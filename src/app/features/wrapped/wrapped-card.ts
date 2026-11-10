/** Draws the shareable Capsule Wrapped card (1080×1350) on a canvas. Pure drawing, no Angular. */

export interface WrapData {
  kind: 'month' | 'year';
  title: string;            // "November 2026"
  moments: number;
  days: number;
  avg: number | null;
  face: string;
  top: { symbol: string; label: string; n: number } | null;
  bestPlace: { icon: string; label: string } | null;
  bestWhen: string;         // "Saturdays" / "October"
  streak: number;
  mix: number[];            // days per level, index 0 = level 1
  pixels: (number | null)[]; // month: one per day; year: one per month (average score or null)
  personality: string;
}

export const CARD_W = 1080;
export const CARD_H = 1350;

const FONT = 'Poppins, system-ui, sans-serif';
const EMOJI = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
const MOOD = ['#F1EFF5', '#7F8BA8', '#A9B3E0', '#C4B3F4', '#F6B3CB', '#FF7F9F'];

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function glass(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r = 34): void {
  rr(ctx, x, y, w, h, r);
  ctx.fillStyle = 'rgba(255,255,255,0.20)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.38)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function fit(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + '…').width > max) t = t.slice(0, -1);
  return t + '…';
}

function level(score: number | null): number {
  return score === null || score <= 0 ? 0 : Math.min(5, Math.max(1, Math.round(score)));
}

export async function drawWrapped(canvas: HTMLCanvasElement, d: WrapData, logo?: HTMLImageElement): Promise<void> {
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d')!;
  try { await (document as any).fonts?.ready; } catch { /* ignore */ }

  // Background
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H);
  bg.addColorStop(0, '#7C6CF2');
  bg.addColorStop(0.55, '#A77BF3');
  bg.addColorStop(1, '#FF8FA3');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  for (const [cx, cy, r, a] of [[930, 120, 380, 0.35], [80, 1250, 320, 0.25], [540, 620, 520, 0.1]] as const) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
  }

  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'alphabetic';

  // Header
  if (logo) ctx.drawImage(logo, 80, 76, 76, 76);
  ctx.font = `600 30px ${FONT}`;
  ctx.globalAlpha = 0.92;
  ctx.fillText('MoodCapsule Wrapped', logo ? 176 : 80, 108);
  ctx.font = `400 24px ${FONT}`;
  ctx.fillText(d.kind === 'month' ? 'your month in moments' : 'your year in moments', logo ? 176 : 80, 142);
  ctx.globalAlpha = 1;

  ctx.font = `700 92px ${FONT}`;
  ctx.fillText(fit(ctx, d.title, 920), 80, 280);

  // Big mood
  ctx.save();
  ctx.beginPath();
  ctx.arc(190, 430, 110, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fill();
  ctx.restore();
  ctx.font = `120px ${EMOJI}`;
  ctx.textAlign = 'center';
  ctx.fillText(d.top?.symbol ?? d.face, 190, 474);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff';
  ctx.font = `500 28px ${FONT}`;
  ctx.globalAlpha = 0.9;
  ctx.fillText(d.kind === 'month' ? 'Mood of the month' : 'Mood of the year', 340, 400);
  ctx.globalAlpha = 1;
  ctx.font = `700 56px ${FONT}`;
  ctx.fillText(fit(ctx, d.top ? d.top.label : 'Still warming up', 660), 340, 462);
  ctx.font = `400 26px ${FONT}`;
  ctx.globalAlpha = 0.9;
  ctx.fillText(!d.top ? 'log a few moments to fill this in' : d.top.n > 0 ? `logged ${d.top.n} time${d.top.n === 1 ? '' : 's'}` : 'your most logged mood', 340, 504);
  ctx.globalAlpha = 1;

  // Tiles
  const tiles: [string, string][] = [
    [String(d.moments), 'moments'],
    [String(d.days), 'days logged'],
    [`${d.avg === null ? '–' : d.avg.toFixed(1)}`, 'average day'],
    [`${d.streak}`, 'day streak']
  ];
  const tw = 214, th = 170, gap = 22, ty = 590;
  tiles.forEach(([big, small], i) => {
    const x = 80 + i * (tw + gap);
    glass(ctx, x, ty, tw, th);
    ctx.fillStyle = '#fff';
    ctx.font = `700 64px ${FONT}`;
    ctx.fillText(fit(ctx, big, tw - 44), x + 26, ty + 88);
    ctx.font = `500 24px ${FONT}`;
    ctx.globalAlpha = 0.9;
    ctx.fillText(small, x + 26, ty + 132);
    ctx.globalAlpha = 1;
  });
  // the face next to the average
  ctx.fillStyle = '#fff';
  ctx.font = `40px ${EMOJI}`;
  ctx.fillText(d.face, 80 + 2 * (tw + gap) + tw - 66, ty + 56);

  // Best place / best time
  const by = 800;
  glass(ctx, 80, by, 445, 150);
  glass(ctx, 555, by, 445, 150);
  ctx.fillStyle = '#fff'; // colour emoji take the alpha of fillStyle
  ctx.font = `48px ${EMOJI}`;
  ctx.fillText(d.bestPlace?.icon ?? '📍', 108, by + 92);
  ctx.fillText(d.kind === 'month' ? '📅' : '🗓️', 583, by + 92);
  ctx.fillStyle = '#fff';
  ctx.font = `500 22px ${FONT}`;
  ctx.globalAlpha = 0.9;
  ctx.fillText('Happiest place', 180, by + 56);
  ctx.fillText(d.kind === 'month' ? 'Best days' : 'Best month', 655, by + 56);
  ctx.globalAlpha = 1;
  ctx.font = `700 38px ${FONT}`;
  ctx.fillText(fit(ctx, d.bestPlace?.label ?? '–', 320), 180, by + 104);
  ctx.fillText(fit(ctx, d.bestWhen || '–', 320), 655, by + 104);

  // Pixels
  const py = 1000;
  ctx.font = `600 24px ${FONT}`;
  ctx.globalAlpha = 0.92;
  ctx.fillText(d.kind === 'month' ? 'Every day, in colour' : 'Every month, in colour', 80, py);
  ctx.globalAlpha = 1;
  const n = d.pixels.length;
  const cols = d.kind === 'month' ? Math.min(16, n) : 12;
  const rows = Math.ceil(n / cols);
  const cell = Math.floor((920 - (cols - 1) * 10) / cols);
  const ch = d.kind === 'month' ? Math.min(cell, 44) : 56;
  d.pixels.forEach((v, i) => {
    const x = 80 + (i % cols) * (cell + 10);
    const y = py + 22 + Math.floor(i / cols) * (ch + 10);
    rr(ctx, x, y, cell, ch, 10);
    const lv = level(v);
    ctx.fillStyle = lv ? MOOD[lv] : 'rgba(255,255,255,0.22)';
    ctx.fill();
  });

  // Mood mix bar
  const my = py + 22 + rows * (ch + 10) + 30;
  const total = d.mix.reduce((a, b) => a + b, 0);
  if (total > 0) {
    let x = 80;
    for (let l = 5; l >= 1; l--) {
      const w = (d.mix[l - 1] / total) * 920;
      if (w < 1) continue;
      rr(ctx, x, my, Math.max(w - 4, 2), 22, 11);
      ctx.fillStyle = MOOD[l];
      ctx.fill();
      x += w;
    }
  }

  // Personality + footer
  ctx.fillStyle = '#fff';
  ctx.font = `italic 600 34px ${FONT}`;
  ctx.fillText(fit(ctx, `✦ ${d.personality}`, 920), 80, CARD_H - 104);
  ctx.font = `400 22px ${FONT}`;
  ctx.globalAlpha = 0.85;
  ctx.fillText('one emoji · one sentence · moodcapsule', 80, CARD_H - 58);
  ctx.globalAlpha = 1;
}

/** A friendly label from the numbers (months have no server-side "personality"). */
export function personalityFor(avg: number | null, days: number, totalDays: number): string {
  if (!days || avg === null) return 'A quiet chapter, waiting for its first line';
  const steady = days / Math.max(1, totalDays) >= 0.6;
  if (avg >= 4.3) return steady ? 'The Daily Sunshine' : 'The Bright Spark';
  if (avg >= 3.6) return steady ? 'The Steady Optimist' : 'The Gentle Optimist';
  if (avg >= 2.9) return steady ? 'The Honest Balancer' : 'The Quiet Observer';
  return steady ? 'The Brave Feeler' : 'The Weathered Heart';
}
