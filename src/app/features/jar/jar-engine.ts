/**
 * Mood Jar physics + drawing on a <canvas>. No libraries: simple position-based (Verlet) circles
 * with gravity, ball–ball collisions and a glass jar with a rounded bottom.
 * Each marble is one moment (or one day) coloured by its mood.
 */

export interface Marble {
  id: number;
  x: number; y: number; px: number; py: number;
  r: number;
  level: number;      // 1–5 mood level
  emoji: string;
  label: string;      // tooltip text
  born: number;       // time it was dropped (ms) – for the little pop-in
}

export interface MarbleInput { level: number; emoji: string; label: string; }

interface Jar { left: number; right: number; top: number; bottom: number; corner: number; cx: number; }

const SUBSTEPS = 2;
const ITERATIONS = 5;
const DAMPING = 0.992;

export class JarEngine {
  private ctx: CanvasRenderingContext2D;
  private marbles: Marble[] = [];
  private queue: MarbleInput[] = [];
  private jar!: Jar;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private radius = 14;
  private raf = 0;
  private lastSpawn = 0;
  private spawnEvery = 30;
  private gx = 0;
  private gy = 0.45;            // gravity (px per frame²)
  private dragged: Marble | null = null;
  private pointer = { x: 0, y: 0, px: 0, py: 0 };
  private nextId = 0;
  private colors: string[] = ['#F1EFF5', '#7F8BA8', '#A9B3E0', '#C4B3F4', '#F6B3CB', '#FF7F9F'];
  private dark = false;
  /** Called when the pointer is over a marble (or null). */
  onHover: (m: Marble | null, x: number, y: number) => void = () => {};

  constructor(private canvas: HTMLCanvasElement, private reducedMotion = false) {
    this.ctx = canvas.getContext('2d')!;
  }

  setTheme(colors: string[], dark: boolean): void {
    this.colors = colors;
    this.dark = dark;
  }

  resize(cssW: number, cssH: number): void {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const oldJar = this.jar;
    this.w = cssW;
    this.h = cssH;
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    const jw = Math.min(cssW * 0.78, cssH * 0.7);
    const cx = cssW / 2;
    this.jar = {
      cx,
      left: cx - jw / 2,
      right: cx + jw / 2,
      top: cssH * 0.14,
      bottom: cssH - 18,
      corner: jw * 0.2
    };
    // Keep marbles where they were relative to the jar after a resize
    if (oldJar && this.marbles.length) {
      const sx = (this.jar.right - this.jar.left) / (oldJar.right - oldJar.left);
      for (const m of this.marbles) {
        const nx = this.jar.left + (m.x - oldJar.left) * sx;
        const ny = this.jar.bottom - (oldJar.bottom - m.y) * sx;
        m.x = m.px = nx;
        m.y = m.py = ny;
        m.r *= sx;
      }
    }
  }

  /** Replace the jar's contents. Marbles drop in one after another (all at once when motion is reduced). */
  fill(items: MarbleInput[]): void {
    this.marbles = [];
    this.queue = [...items];
    const area = (this.jar.right - this.jar.left) * (this.jar.bottom - this.jar.top) * 0.62;
    const n = Math.max(1, items.length);
    this.radius = Math.max(6, Math.min(34, Math.sqrt(area / (n * Math.PI))));
    this.spawnEvery = Math.max(4, Math.min(60, 2600 / n));
    this.lastSpawn = 0;
    if (this.reducedMotion) {
      while (this.queue.length) this.spawn(performance.now() - 1000);
      for (let i = 0; i < 240; i++) this.physics();
    }
  }

  get count(): number { return this.marbles.length + this.queue.length; }

  start(): void {
    const loop = (t: number) => {
      this.frame(t);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  /** Throw the marbles up – like shaking the jar. */
  shake(strength = 1): void {
    for (const m of this.marbles) {
      m.px = m.x + (Math.random() - 0.5) * 14 * strength;
      m.py = m.y + (8 + Math.random() * 16) * strength;
    }
  }

  /** Phone tilt: gravity follows the device (values in g, roughly −1…1). */
  tilt(ax: number, ay: number): void {
    const len = Math.hypot(ax, ay) || 1;
    const k = Math.min(1, len);
    this.gx = (ax / len) * 0.45 * k;
    this.gy = Math.max(0.12, (ay / len) * 0.45 * k);
  }

  resetGravity(): void {
    this.gx = 0;
    this.gy = 0.45;
  }

  // ─── Pointer: drag a marble around / hover for its label ───
  pointerDown(x: number, y: number): boolean {
    const m = this.hit(x, y);
    this.pointer = { x, y, px: x, py: y };
    if (m) this.dragged = m;
    return !!m;
  }

  pointerMove(x: number, y: number): void {
    this.pointer.px = this.pointer.x;
    this.pointer.py = this.pointer.y;
    this.pointer.x = x;
    this.pointer.y = y;
    if (!this.dragged) {
      const m = this.hit(x, y);
      this.onHover(m, x, y);
    }
  }

  pointerUp(): void {
    if (this.dragged) {
      // Fling: keep the pointer's last velocity
      const d = this.dragged;
      d.px = d.x - (this.pointer.x - this.pointer.px) * 0.8;
      d.py = d.y - (this.pointer.y - this.pointer.py) * 0.8;
    }
    this.dragged = null;
  }

  pointerLeave(): void {
    this.pointerUp();
    this.onHover(null, 0, 0);
  }

  /** PNG of the jar on a soft background (for "Save image"). */
  snapshot(title: string, subtitle: string): string {
    const out = document.createElement('canvas');
    const W = 1080, H = 1350;
    out.width = W; out.height = H;
    const c = out.getContext('2d')!;
    const g = c.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#7C6CF2'); g.addColorStop(0.55, '#A77BF3'); g.addColorStop(1, '#FF8FA3');
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
    c.fillStyle = '#fff';
    c.font = '700 64px Poppins, sans-serif';
    c.fillText(title, 80, 150);
    c.font = '400 30px Poppins, sans-serif';
    c.globalAlpha = 0.9;
    c.fillText(subtitle, 80, 200);
    c.globalAlpha = 1;
    // Jar panel
    c.fillStyle = 'rgba(255,255,255,0.92)';
    const px = 80, py = 250, pw = W - 160, ph = H - 380;
    c.beginPath();
    c.roundRect(px, py, pw, ph, 40);
    c.fill();
    const scale = Math.min(pw / this.canvas.width, ph / this.canvas.height);
    const dw = this.canvas.width * scale, dh = this.canvas.height * scale;
    c.drawImage(this.canvas, px + (pw - dw) / 2, py + (ph - dh) / 2, dw, dh);
    c.fillStyle = '#fff';
    c.font = '400 26px Poppins, sans-serif';
    c.globalAlpha = 0.85;
    c.fillText('one emoji · one sentence · moodcapsule', 80, H - 60);
    return out.toDataURL('image/png');
  }

  // ─── internals ───
  private frame(t: number): void {
    // Drop queued marbles from the top of the jar
    while (this.queue.length && t - this.lastSpawn >= this.spawnEvery) {
      this.spawn(t);
      this.lastSpawn = this.lastSpawn === 0 ? t : this.lastSpawn + this.spawnEvery;
      if (this.reducedMotion) break;
    }
    this.physics();
    this.draw(t);
  }

  private spawn(t: number): void {
    const it = this.queue.shift();
    if (!it) return;
    const j = this.jar;
    const r = this.radius * (0.85 + Math.random() * 0.3);
    const x = j.cx + (Math.random() - 0.5) * (j.right - j.left - 2 * r) * 0.6;
    const y = j.top + r + 2;
    this.marbles.push({ id: this.nextId++, x, y, px: x - (Math.random() - 0.5) * 2, py: y - 2, r, level: it.level, emoji: it.emoji, label: it.label, born: t });
  }

  private physics(): void {
    const ms = this.marbles;
    for (let s = 0; s < SUBSTEPS; s++) {
      const gx = this.gx / SUBSTEPS, gy = this.gy / SUBSTEPS;
      for (const m of ms) {
        if (m === this.dragged) {
          m.px = m.x; m.py = m.y;
          m.x += (this.pointer.x - m.x) * 0.5;
          m.y += (this.pointer.y - m.y) * 0.5;
          continue;
        }
        const vx = (m.x - m.px) * DAMPING;
        const vy = (m.y - m.py) * DAMPING;
        m.px = m.x; m.py = m.y;
        m.x += vx + gx;
        m.y += vy + gy;
      }
      for (let k = 0; k < ITERATIONS; k++) {
        this.collide();
        for (const m of ms) this.contain(m);
      }
    }
  }

  /** Ball–ball collisions using a uniform grid. */
  private collide(): void {
    const ms = this.marbles;
    if (ms.length < 2) return;
    const cell = this.radius * 2.4;
    const grid = new Map<number, Marble[]>();
    const key = (gx: number, gy: number) => gx * 73856093 ^ gy * 19349663;
    for (const m of ms) {
      const k = key(Math.floor(m.x / cell), Math.floor(m.y / cell));
      const list = grid.get(k);
      if (list) list.push(m); else grid.set(k, [m]);
    }
    for (const m of ms) {
      const cx = Math.floor(m.x / cell), cy = Math.floor(m.y / cell);
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const list = grid.get(key(cx + dx, cy + dy));
          if (!list) continue;
          for (const o of list) {
            if (o.id <= m.id) continue;
            const ddx = o.x - m.x, ddy = o.y - m.y;
            const min = m.r + o.r;
            const d2 = ddx * ddx + ddy * ddy;
            if (d2 >= min * min || d2 === 0) continue;
            const d = Math.sqrt(d2);
            const push = (min - d) / 2 / d;
            const wm = m === this.dragged ? 0 : 1;
            const wo = o === this.dragged ? 0 : 1;
            const total = wm + wo || 1;
            m.x -= ddx * push * (2 * wm / total);
            m.y -= ddy * push * (2 * wm / total);
            o.x += ddx * push * (2 * wo / total);
            o.y += ddy * push * (2 * wo / total);
          }
        }
      }
    }
  }

  /** Keep a marble inside the glass (straight sides, rounded bottom corners, lid on top). */
  private contain(m: Marble): void {
    const j = this.jar;
    const r = m.r;
    if (m.y < j.top + r) m.y = j.top + r;
    const cornerTop = j.bottom - j.corner;
    if (m.y > cornerTop) {
      const ccx = m.x < j.left + j.corner ? j.left + j.corner : m.x > j.right - j.corner ? j.right - j.corner : null;
      if (ccx !== null) {
        const dx = m.x - ccx, dy = m.y - cornerTop;
        const d = Math.hypot(dx, dy);
        const max = j.corner - r;
        if (d > max && d > 0) {
          m.x = ccx + (dx / d) * max;
          m.y = cornerTop + (dy / d) * max;
        }
        return;
      }
    }
    if (m.x < j.left + r) m.x = j.left + r;
    if (m.x > j.right - r) m.x = j.right - r;
    if (m.y > j.bottom - r) m.y = j.bottom - r;
  }

  private hit(x: number, y: number): Marble | null {
    for (let i = this.marbles.length - 1; i >= 0; i--) {
      const m = this.marbles[i];
      if ((m.x - x) ** 2 + (m.y - y) ** 2 <= (m.r + 4) ** 2) return m;
    }
    return null;
  }

  private draw(t: number): void {
    const c = this.ctx;
    const j = this.jar;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.w, this.h);

    // Shadow under the jar
    c.save();
    c.fillStyle = this.dark ? 'rgba(0,0,0,.35)' : 'rgba(124,108,242,.16)';
    c.beginPath();
    c.ellipse(j.cx, j.bottom + 8, (j.right - j.left) * 0.48, 10, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // Glass body (back)
    const glassPath = () => {
      c.beginPath();
      c.moveTo(j.left, j.top);
      c.lineTo(j.left, j.bottom - j.corner);
      c.quadraticCurveTo(j.left, j.bottom, j.left + j.corner, j.bottom);
      c.lineTo(j.right - j.corner, j.bottom);
      c.quadraticCurveTo(j.right, j.bottom, j.right, j.bottom - j.corner);
      c.lineTo(j.right, j.top);
    };
    c.save();
    glassPath();
    c.closePath();
    const back = c.createLinearGradient(j.left, 0, j.right, 0);
    back.addColorStop(0, this.dark ? 'rgba(181,169,255,.10)' : 'rgba(124,108,242,.06)');
    back.addColorStop(1, this.dark ? 'rgba(255,179,193,.10)' : 'rgba(255,143,163,.06)');
    c.fillStyle = back;
    c.fill();
    c.restore();

    // Marbles
    for (const m of this.marbles) {
      const age = Math.min(1, (t - m.born) / 220);
      const r = m.r * (0.4 + 0.6 * age);
      const base = this.colors[m.level] ?? this.colors[3];
      const g = c.createRadialGradient(m.x - r * 0.35, m.y - r * 0.4, r * 0.1, m.x, m.y, r);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.35, base);
      g.addColorStop(1, this.shade(base, -0.18));
      c.beginPath();
      c.arc(m.x, m.y, r, 0, Math.PI * 2);
      c.fillStyle = g;
      c.fill();
      if (m === this.dragged) {
        c.lineWidth = 3;
        c.strokeStyle = this.dark ? '#fff' : '#6A59E8';
        c.stroke();
      }
      if (r >= 13 && m.emoji) {
        c.font = `${Math.round(r * 1.05)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.globalAlpha = 0.95;
        c.fillStyle = '#000';
        c.fillText(m.emoji, m.x, m.y + r * 0.05);
        c.globalAlpha = 1;
      }
    }

    // Glass outline + shine (front)
    c.save();
    glassPath();
    c.lineWidth = 4;
    c.strokeStyle = this.dark ? 'rgba(244,238,255,.55)' : 'rgba(124,108,242,.45)';
    c.stroke();
    c.beginPath();
    c.moveTo(j.left + 14, j.top + 30);
    c.lineTo(j.left + 14, j.bottom - j.corner - 10);
    c.lineWidth = 6;
    c.lineCap = 'round';
    c.strokeStyle = 'rgba(255,255,255,.45)';
    c.stroke();
    c.restore();

    // Lid (cork-style band with the gradient)
    const lidH = Math.max(16, (j.right - j.left) * 0.07);
    const lidG = c.createLinearGradient(j.left, 0, j.right, 0);
    lidG.addColorStop(0, '#7C6CF2'); lidG.addColorStop(0.55, '#A77BF3'); lidG.addColorStop(1, '#FF8FA3');
    c.fillStyle = lidG;
    c.beginPath();
    c.roundRect(j.left - 10, j.top - lidH, j.right - j.left + 20, lidH, 10);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,.35)';
    c.beginPath();
    c.roundRect(j.left - 4, j.top - lidH + 4, (j.right - j.left) * 0.5, 4, 2);
    c.fill();
  }

  private shade(hex: string, amt: number): string {
    const m = hex.trim().match(/^#?([0-9a-f]{6})$/i);
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    const f = (v: number) => Math.max(0, Math.min(255, Math.round(v + v * amt)));
    const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
    return `rgb(${r},${g},${b})`;
  }
}
