import {
  AfterViewInit, Component, ElementRef, NgZone, OnDestroy, computed, effect, inject, signal, viewChild
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { ProfileStore } from '../../core/services/profile.store';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { MONTHS_LONG, clockTime, mediumDate, parseYmd, todayIn } from '../../core/utils/dates';
import { MOOD_LEGEND, moodLevel } from '../../core/utils/mood';
import { errorMessage } from '../../core/utils/errors';
import { JarEngine, Marble, MarbleInput } from './jar-engine';

interface Option { key: string; label: string; }

/**
 * Mood Jar: every moment drops into a glass jar as a marble in its mood colour.
 * Drag and fling marbles, shake the jar, or tilt your phone and watch them roll.
 * "Month" = one marble per moment; "Year" = one marble per day.
 */
@Component({
  selector: 'mc-jar',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './jar.component.html',
  styleUrl: './jar.component.scss'
})
export class JarComponent implements AfterViewInit, OnDestroy {
  private api = inject(ApiService);
  private store = inject(ProfileStore);
  private theme = inject(ThemeService);
  private toast = inject(ToastService);
  private zone = inject(NgZone);

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('jar');
  private readonly box = viewChild.required<ElementRef<HTMLDivElement>>('box');
  private engine?: JarEngine;
  private resizeObserver?: ResizeObserver;
  private motionHandler?: (e: DeviceMotionEvent) => void;
  private orientationHandler?: (e: DeviceOrientationEvent) => void;
  private lastShake = 0;

  readonly legend = MOOD_LEGEND;
  readonly today = computed(() => todayIn(this.store.profile()?.timezone));
  readonly mode = signal<'month' | 'year'>('month');
  readonly month = signal('');
  readonly items = signal<MarbleInput[] | null>(null);
  readonly error = signal('');
  readonly hover = signal<{ label: string; x: number; y: number } | null>(null);
  readonly tilting = signal(false);
  readonly touchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  readonly months = computed<Option[]>(() => {
    const t = parseYmd(this.today());
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(t.getFullYear(), t.getMonth() - i, 1);
      return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}` };
    });
  });

  readonly title = computed(() => this.mode() === 'year'
    ? `${this.today().slice(0, 4)} in a jar`
    : `${this.months().find(m => m.key === this.month())?.label ?? ''} in a jar`);

  readonly stats = computed(() => {
    const list = this.items() ?? [];
    const counts = [0, 0, 0, 0, 0, 0];
    const emojis = new Map<string, number>();
    for (const i of list) {
      counts[i.level]++;
      if (i.emoji) emojis.set(i.emoji, (emojis.get(i.emoji) ?? 0) + 1);
    }
    const top = [...emojis.entries()].sort((a, b) => b[1] - a[1])[0];
    const bright = counts[4] + counts[5];
    return {
      total: list.length,
      top: top?.[0] ?? '·',
      brightPct: list.length ? Math.round((bright / list.length) * 100) : 0,
      mix: [5, 4, 3, 2, 1].map(l => ({ level: l, n: counts[l], pct: list.length ? (counts[l] / list.length) * 100 : 0 }))
    };
  });

  constructor() {
    // Re-colour the marbles when the theme changes
    effect(() => {
      const dark = this.theme.dark();
      this.engine?.setTheme(this.palette(), dark);
    });
  }

  ngAfterViewInit(): void {
    this.month.set(this.months()[0].key);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.engine = new JarEngine(this.canvas().nativeElement, reduced);
    this.engine.setTheme(this.palette(), this.theme.dark());
    this.engine.onHover = (m: Marble | null, x: number, y: number) =>
      this.zone.run(() => this.hover.set(m ? { label: m.label, x, y } : null));
    this.fit();
    this.resizeObserver = new ResizeObserver(() => this.fit());
    this.resizeObserver.observe(this.box().nativeElement);
    // The animation loop runs outside Angular so it doesn't trigger change detection 60×/s
    this.zone.runOutsideAngular(() => this.engine!.start());
    this.load();
  }

  ngOnDestroy(): void {
    this.engine?.stop();
    this.resizeObserver?.disconnect();
    this.stopTilt();
  }

  setMode(m: 'month' | 'year'): void {
    if (this.mode() === m) return;
    this.mode.set(m);
    this.load();
  }

  setMonth(key: string): void {
    this.month.set(key);
    this.load();
  }

  load(): void {
    this.items.set(null);
    this.error.set('');
    this.hover.set(null);
    if (this.mode() === 'month') {
      const key = this.month();
      const [y, m] = key.split('-').map(Number);
      const last = `${key}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
      this.api.allMoments(`${key}-01`, last).subscribe({
        next: list => this.show([...list]
          .sort((a, b) => (a.entryDate + (a.entryTime ?? '')).localeCompare(b.entryDate + (b.entryTime ?? '')))
          .map(x => ({
            level: moodLevel(x.moodScore) || 3,
            emoji: x.emojiSymbol,
            label: `${x.emojiSymbol} ${x.emojiDescription} · ${mediumDate(x.entryDate)}${x.entryTime ? ' · ' + clockTime(x.entryTime) : ''}${x.placeName ? ' · ' + (x.placeIcon ?? '') + ' ' + x.placeName : ''}`
          }))),
        error: err => this.fail(err)
      });
    } else {
      const year = this.today().slice(0, 4);
      this.api.trend(366).subscribe({
        next: pts => this.show(pts.filter(p => p.date.startsWith(year)).map(p => ({
          level: moodLevel(p.averageScore) || 3,
          emoji: p.emojiSymbol,
          label: `${mediumDate(p.date)} · ${p.emojiSymbol} ${p.count} moment${p.count === 1 ? '' : 's'} · day average ${p.averageScore.toFixed(1)}`
        }))),
        error: err => this.fail(err)
      });
    }
  }

  shake(): void {
    this.engine?.shake(1.2);
  }

  refill(): void {
    const list = this.items();
    if (list) this.engine?.fill(list);
  }

  /** Tilt + shake with the phone (iPhone asks for permission first). */
  async toggleTilt(): Promise<void> {
    if (this.tilting()) {
      this.stopTilt();
      return;
    }
    try {
      const DOE = (window as any).DeviceOrientationEvent;
      if (DOE?.requestPermission) {
        const res = await DOE.requestPermission();
        if (res !== 'granted') {
          this.toast.show('Motion access was not allowed.');
          return;
        }
      }
    } catch {
      this.toast.show("This browser doesn't allow motion access.");
      return;
    }
    this.orientationHandler = (e: DeviceOrientationEvent) => {
      const g = ((e.gamma ?? 0) * Math.PI) / 180;   // left/right
      const b = ((e.beta ?? 90) * Math.PI) / 180;   // front/back
      this.engine?.tilt(Math.sin(g), Math.sin(b));
    };
    this.motionHandler = (e: DeviceMotionEvent) => {
      const a = e.acceleration;
      if (!a) return;
      const mag = Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0);
      const now = Date.now();
      if (mag > 14 && now - this.lastShake > 400) {
        this.lastShake = now;
        this.engine?.shake(Math.min(2, mag / 14));
      }
    };
    window.addEventListener('deviceorientation', this.orientationHandler);
    window.addEventListener('devicemotion', this.motionHandler);
    this.tilting.set(true);
  }

  saveImage(): void {
    if (!this.engine) return;
    const s = this.stats();
    const sub = this.mode() === 'year' ? `${s.total} days · ${s.brightPct}% bright days` : `${s.total} moments · ${s.brightPct}% bright moments`;
    const url = this.engine.snapshot(this.title(), sub);
    const a = document.createElement('a');
    a.href = url;
    a.download = `moodcapsule-jar-${this.mode() === 'year' ? this.today().slice(0, 4) : this.month()}.png`;
    a.click();
  }

  // Pointer events (mouse + touch) on the canvas
  down(e: PointerEvent): void {
    const p = this.pos(e);
    if (this.engine?.pointerDown(p.x, p.y)) {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      this.hover.set(null);
    }
  }

  move(e: PointerEvent): void {
    const p = this.pos(e);
    this.engine?.pointerMove(p.x, p.y);
  }

  up(): void {
    this.engine?.pointerUp();
  }

  leave(): void {
    this.engine?.pointerLeave();
  }

  private show(list: MarbleInput[]): void {
    this.items.set(list);
    this.engine?.fill(list);
  }

  private fail(err: unknown): void {
    this.items.set([]);
    this.engine?.fill([]);
    this.error.set(errorMessage(err, "Couldn't fill your jar."));
  }

  private fit(): void {
    const el = this.box().nativeElement;
    const w = Math.max(280, el.clientWidth);
    const h = Math.round(Math.min(640, Math.max(420, w * 1.05)));
    this.engine?.resize(w, h);
  }

  private pos(e: PointerEvent): { x: number; y: number } {
    const r = this.canvas().nativeElement.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private stopTilt(): void {
    if (this.orientationHandler) window.removeEventListener('deviceorientation', this.orientationHandler);
    if (this.motionHandler) window.removeEventListener('devicemotion', this.motionHandler);
    this.orientationHandler = undefined;
    this.motionHandler = undefined;
    this.engine?.resetGravity();
    this.tilting.set(false);
  }

  /** Read the --mood-N colours from the stylesheet so the jar matches the rest of the app. */
  private palette(): string[] {
    const css = getComputedStyle(document.documentElement);
    return [0, 1, 2, 3, 4, 5].map(i => css.getPropertyValue(`--mood-${i}`).trim() || '#C4B3F4');
  }
}
