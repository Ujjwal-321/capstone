import { AfterViewInit, Component, ElementRef, OnInit, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, forkJoin, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ProfileStore } from '../../core/services/profile.store';
import { ToastService } from '../../core/services/toast.service';
import { Moment, TrendPoint, YearlyRecap } from '../../core/models';
import { MONTHS_LONG, WEEKDAYS, addDays, dayOfYear, parseYmd, todayIn } from '../../core/utils/dates';
import { moodFace } from '../../core/utils/mood';
import { errorMessage } from '../../core/utils/errors';
import { WrapData, drawWrapped, personalityFor } from './wrapped-card';

interface Option { key: string; label: string; }

/** Capsule Wrapped: a monthly or yearly recap card you can download as a PNG and share. */
@Component({
  selector: 'mc-wrapped',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './wrapped.component.html',
  styleUrl: './wrapped.component.scss'
})
export class WrappedComponent implements OnInit, AfterViewInit {
  private api = inject(ApiService);
  private store = inject(ProfileStore);
  private toast = inject(ToastService);

  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('card');
  private logo?: HTMLImageElement;

  readonly today = computed(() => todayIn(this.store.profile()?.timezone));
  readonly kind = signal<'month' | 'year'>('month');
  readonly month = signal('');   // 'yyyy-MM'
  readonly year = signal(0);
  readonly data = signal<WrapData | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly canShare = typeof navigator !== 'undefined' && !!navigator.share;

  readonly months = computed<Option[]>(() => {
    const t = parseYmd(this.today());
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(t.getFullYear(), t.getMonth() - i, 1);
      return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}` };
    });
  });
  readonly years = computed(() => {
    const y = Number(this.today().slice(0, 4));
    return [y, y - 1];
  });

  ngOnInit(): void {
    this.month.set(this.months()[0].key);
    this.year.set(this.years()[0]);
  }

  ngAfterViewInit(): void {
    const img = new Image();
    img.onload = () => { this.logo = img; this.redraw(); };
    img.src = 'assets/brand/moodcapsule-icon.svg';
    this.load();
  }

  setKind(k: 'month' | 'year'): void {
    this.kind.set(k);
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    if (this.kind() === 'month') this.loadMonth(); else this.loadYear();
  }

  private loadMonth(): void {
    const key = this.month();
    const [y, m] = key.split('-').map(Number);
    const first = `${key}-01`;
    const last = `${key}-${String(new Date(y, m, 0).getDate()).padStart(2, '0')}`;
    this.api.allMoments(first, last).subscribe({
      next: list => this.show(this.fromMoments(list, first, last, `${MONTHS_LONG[m - 1]} ${y}`)),
      error: err => this.fail(err)
    });
  }

  private loadYear(): void {
    const y = this.year();
    const thisYear = Number(this.today().slice(0, 4));
    const days = y === thisYear ? dayOfYear(this.today()) : 366;
    forkJoin({
      recap: this.api.recap(y).pipe(catchError(() => of(null as YearlyRecap | null))),
      trend: this.api.trend(366).pipe(catchError(() => of([] as TrendPoint[]))),
      places: y === thisYear ? this.api.byPlace(Math.min(366, days)).pipe(catchError(() => of([]))) : of([])
    }).subscribe({
      next: ({ recap, trend, places }) => {
        const pts = trend.filter(p => p.date.startsWith(String(y)));
        const avg = pts.length ? pts.reduce((s, p) => s + p.averageScore, 0) / pts.length : null;
        const monthAvgs = MONTHS_LONG.map((_, i) => {
          const inM = pts.filter(p => p.date.startsWith(`${y}-${String(i + 1).padStart(2, '0')}`));
          return inM.length ? inM.reduce((s, p) => s + p.averageScore, 0) / inM.length : null;
        });
        const mix = [0, 0, 0, 0, 0];
        for (const p of pts) mix[Math.min(5, Math.max(1, Math.round(p.averageScore))) - 1]++;
        const best = places.find(p => p.averageScore !== null && p.count >= 2) ?? null;
        const bestMonth = recap?.bestMonth ? recap.bestMonth.charAt(0) + recap.bestMonth.slice(1).toLowerCase() : '–';
        this.show({
          kind: 'year',
          title: `${y}`,
          moments: recap?.totalEntries ?? pts.reduce((s, p) => s + p.count, 0),
          days: recap?.daysLogged ?? pts.length,
          avg: recap?.averageMoodScore || avg,
          face: moodFace(recap?.averageMoodScore || avg),
          top: recap?.mostUsedEmojiSymbol ? { symbol: recap.mostUsedEmojiSymbol, label: recap.mostUsedEmojiDescription ?? '', n: 0 } : null,
          bestPlace: best ? { icon: best.placeIcon, label: best.placeName } : null,
          bestWhen: bestMonth,
          streak: recap?.longestStreak ?? 0,
          mix,
          pixels: monthAvgs,
          personality: recap?.moodPersonality || personalityFor(avg, pts.length, days)
        });
      },
      error: err => this.fail(err)
    });
  }

  private fromMoments(list: Moment[], first: string, last: string, title: string): WrapData {
    const byDay = new Map<string, number[]>();
    for (const m of list) byDay.set(m.entryDate, [...(byDay.get(m.entryDate) ?? []), m.moodScore]);
    const dayAvg = new Map([...byDay.entries()].map(([d, v]) => [d, v.reduce((a, b) => a + b, 0) / v.length]));
    const avgs = [...dayAvg.values()];
    const avg = avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;

    const counts = new Map<string, { symbol: string; label: string; n: number }>();
    for (const m of list) {
      const c = counts.get(m.emojiSymbol) ?? { symbol: m.emojiSymbol, label: m.emojiDescription, n: 0 };
      c.n++;
      counts.set(m.emojiSymbol, c);
    }
    const top = [...counts.values()].sort((a, b) => b.n - a.n)[0] ?? null;

    const places = new Map<string, { icon: string; label: string; sum: number; n: number }>();
    for (const m of list) {
      if (!m.placeId) continue;
      const p = places.get(String(m.placeId)) ?? { icon: m.placeIcon ?? '📍', label: m.placeName ?? '', sum: 0, n: 0 };
      p.sum += m.moodScore; p.n++;
      places.set(String(m.placeId), p);
    }
    const bestPlace = [...places.values()].filter(p => p.n >= 2).sort((a, b) => b.sum / b.n - a.sum / a.n)[0] ?? null;

    const wd = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }));
    for (const [d, a] of dayAvg) { const i = parseYmd(d).getDay(); wd[i].sum += a; wd[i].n++; }
    const bestWd = wd.map((w, i) => ({ i, avg: w.n ? w.sum / w.n : -1 })).sort((a, b) => b.avg - a.avg)[0];

    const pixels: (number | null)[] = [];
    let streak = 0, run = 0;
    for (let d = first; d <= last; d = addDays(d, 1)) {
      const v = dayAvg.get(d) ?? null;
      if (d <= this.today()) pixels.push(v); else pixels.push(null);
      run = v !== null ? run + 1 : 0;
      streak = Math.max(streak, run);
    }
    const mix = [0, 0, 0, 0, 0];
    for (const a of avgs) mix[Math.min(5, Math.max(1, Math.round(a))) - 1]++;
    const elapsed = Math.min(pixels.length, Math.max(1, pixels.filter((_, i) => addDays(first, i) <= this.today()).length));

    return {
      kind: 'month', title, moments: list.length, days: dayAvg.size, avg, face: moodFace(avg), top,
      bestPlace: bestPlace ? { icon: bestPlace.icon, label: bestPlace.label } : null,
      bestWhen: bestWd && bestWd.avg > 0 ? `${WEEKDAYS[bestWd.i]}s` : '–',
      streak, mix, pixels, personality: personalityFor(avg, dayAvg.size, elapsed)
    };
  }

  private show(d: WrapData): void {
    this.data.set(d);
    this.loading.set(false);
    this.redraw();
  }

  private fail(err: unknown): void {
    this.loading.set(false);
    this.error.set(errorMessage(err, "Couldn't build your recap."));
  }

  private redraw(): void {
    const d = this.data();
    if (d) drawWrapped(this.canvas().nativeElement, d, this.logo);
  }

  private fileName(): string {
    const d = this.data();
    return `moodcapsule-wrapped-${(d?.title ?? 'recap').toLowerCase().replace(/\s+/g, '-')}.png`;
  }

  download(): void {
    this.canvas().nativeElement.toBlob(blob => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = this.fileName();
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }, 'image/png');
  }

  share(): void {
    this.canvas().nativeElement.toBlob(async blob => {
      if (!blob) return;
      const file = new File([blob], this.fileName(), { type: 'image/png' });
      try {
        if ((navigator as any).canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title: 'My MoodCapsule Wrapped' });
        } else {
          this.download();
        }
      } catch (e) {
        if ((e as Error)?.name !== 'AbortError') this.toast.error("Couldn't share. The image was downloaded instead.");
      }
    }, 'image/png');
  }
}
