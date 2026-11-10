import { AfterViewInit, Component, ElementRef, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { mediumDate } from '../../../core/utils/dates';
import { moodFace, score1 } from '../../../core/utils/mood';

export interface LinePoint { date: string; value: number; count: number; label?: string; }

const W = 720;
const H = 230;
const PAD = { l: 34, r: 12, t: 14, b: 26 };

/**
 * Mood over time: one smooth gradient line (scores 1–5) with a soft fill,
 * a crosshair + tooltip on hover, and an accessible table underneath for screen readers.
 */
@Component({
  selector: 'mc-mood-line',
  standalone: true,
  template: `
    <div class="wrap" (mouseleave)="hover.set(null)">
      <svg [attr.viewBox]="'0 0 ' + w() + ' ' + h" role="img"
           [attr.aria-label]="'Mood over time, ' + points().length + ' points'"
           (mousemove)="move($event)" (touchstart)="touch($event)">
        <defs>
          <linearGradient id="mcLine" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stop-color="#7C6CF2" /><stop offset="1" stop-color="#FF8FA3" />
          </linearGradient>
          <linearGradient id="mcFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stop-color="#A77BF3" stop-opacity=".28" /><stop offset="1" stop-color="#FF8FA3" stop-opacity="0" />
          </linearGradient>
        </defs>
        @for (g of grid; track g.v) {
          <line class="grid" [attr.x1]="pad.l" [attr.x2]="w() - pad.r" [attr.y1]="y(g.v)" [attr.y2]="y(g.v)" />
          <text class="ylab" [attr.x]="pad.l - 8" [attr.y]="y(g.v) + 4">{{ g.face }}</text>
        }
        @for (t of ticks(); track t.x) {
          <text class="xlab" [attr.x]="t.x" [attr.y]="h - 6">{{ t.label }}</text>
        }
        @if (points().length > 1) {
          <path [attr.d]="area()" fill="url(#mcFill)" />
          <path [attr.d]="line()" fill="none" stroke="url(#mcLine)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
                />
        }
        @if (points().length === 1) {
          <circle [attr.cx]="x(0)" [attr.cy]="y(points()[0].value)" r="5" fill="#A77BF3" />
        }
        @if (hover(); as hv) {
          <line class="cross" [attr.x1]="x(hv)" [attr.x2]="x(hv)" [attr.y1]="pad.t" [attr.y2]="h - pad.b" />
          <circle class="dot" [attr.cx]="x(hv)" [attr.cy]="y(points()[hv].value)" r="5" />
        }
      </svg>
      @if (hover(); as hv) {
        <div class="tip" [style.left.%]="(x(hv) / w()) * 100">
          <b>{{ face(points()[hv].value) }} {{ fmt(points()[hv].value) }}</b>
          <span>{{ points()[hv].label || date(points()[hv].date) }} · {{ points()[hv].count }} moment{{ points()[hv].count === 1 ? '' : 's' }}</span>
        </div>
      }
    </div>
    <table class="sr-only">
      <caption>Mood over time</caption>
      <tr><th>Date</th><th>Average mood</th><th>Moments</th></tr>
      @for (p of points(); track p.date) { <tr><td>{{ p.label || p.date }}</td><td>{{ fmt(p.value) }}</td><td>{{ p.count }}</td></tr> }
    </table>
  `,
  styles: [`
    :host { display: block; }
    .wrap { position: relative; }
    svg { width: 100%; height: 230px; display: block; overflow: visible; }
    .grid { stroke: var(--stroke); stroke-width: 1; vector-effect: non-scaling-stroke; }
    .ylab { font-size: 12px; text-anchor: end; font-family: var(--emoji); }
    .xlab { font-size: 11px; fill: var(--text-2); text-anchor: middle; font-family: var(--font); }
    .cross { stroke: var(--hint); stroke-dasharray: 3 3; vector-effect: non-scaling-stroke; }
    .dot { fill: var(--surface); stroke: #A77BF3; stroke-width: 2.5; vector-effect: non-scaling-stroke; }
    .tip {
      position: absolute; top: -6px; transform: translate(-50%, -100%); pointer-events: none; white-space: nowrap;
      background: #1F1B2D; color: #fff; border-radius: 10px; padding: 6px 10px; font-size: 12px; box-shadow: var(--shadow-pop);
      b { display: block; font-size: 13px; }
      span { opacity: .85; }
    }
  `]
})
export class MoodLineComponent implements AfterViewInit, OnDestroy {
  readonly points = input.required<LinePoint[]>();

  private readonly host = inject(ElementRef<HTMLElement>);
  private observer?: ResizeObserver;
  /** Drawn at the real width so text and lines never stretch. */
  readonly w = signal(W);
  readonly h = H;
  readonly pad = PAD;
  readonly grid = [1, 2, 3, 4, 5].map(v => ({ v, face: moodFace(v) }));
  readonly hover = signal<number | null>(null);

  ngAfterViewInit(): void {
    const el = this.host.nativeElement as HTMLElement;
    this.observer = new ResizeObserver(() => this.w.set(Math.max(280, Math.round(el.clientWidth || W))));
    this.observer.observe(el);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  /** Position on the time axis (0…1) by date, so days without moments leave a real gap in time. */
  private readonly offsets = computed(() => {
    const pts = this.points();
    if (pts.length < 2) return pts.map(() => 0.5);
    const t = pts.map(p => new Date(p.date + 'T00:00').getTime());
    const span = t[t.length - 1] - t[0] || 1;
    return t.map(v => (v - t[0]) / span);
  });

  x(i: number): number {
    const width = this.w();
    return PAD.l + (this.offsets()[i] ?? 0.5) * (width - PAD.l - PAD.r);
  }

  y(v: number): number {
    return PAD.t + ((5 - v) / 4) * (H - PAD.t - PAD.b);
  }

  /** Smooth curve through the points (monotone-ish cubic). */
  readonly line = computed(() => this.path(false));
  readonly area = computed(() => this.path(true));

  readonly ticks = computed(() => {
    this.w();
    const pts = this.points();
    if (pts.length < 2) return [];
    const count = Math.min(6, pts.length);
    return Array.from({ length: count }, (_, k) => {
      const i = Math.round((k / (count - 1)) * (pts.length - 1));
      return { x: this.x(i), label: pts[i].label ?? new Date(pts[i].date + 'T00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
    });
  });

  move(e: MouseEvent): void {
    this.pick((e.currentTarget as SVGSVGElement).getBoundingClientRect(), e.clientX);
  }

  touch(e: TouchEvent): void {
    const t = e.touches[0];
    if (t) this.pick((e.currentTarget as SVGSVGElement).getBoundingClientRect(), t.clientX);
  }

  face = moodFace;
  fmt = score1;
  date = mediumDate;

  private pick(rect: DOMRect, clientX: number): void {
    const n = this.points().length;
    if (!n) return;
    const width = this.w();
    const pos = (((clientX - rect.left) / rect.width) * width - PAD.l) / (width - PAD.l - PAD.r);
    // Nearest point in time
    let best = 0;
    this.offsets().forEach((o, i) => { if (Math.abs(o - pos) < Math.abs(this.offsets()[best] - pos)) best = i; });
    this.hover.set(best);
  }

  private path(closed: boolean): string {
    this.w();
    const pts = this.points().map((p, i) => [this.x(i), this.y(p.value)] as const);
    if (pts.length < 2) return '';
    let d = `M${pts[0][0]},${pts[0][1]}`;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const cx = (x0 + x1) / 2;
      d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
    }
    if (closed) {
      const base = this.y(1);
      d += ` L${pts[pts.length - 1][0]},${base} L${pts[0][0]},${base} Z`;
    }
    return d;
  }
}
