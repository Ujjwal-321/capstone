import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { ProfileStore } from '../../core/services/profile.store';
import { TrendPoint } from '../../core/models';
import { MONTHS_LONG, MONTHS_SHORT, addDays, mediumDate, todayIn } from '../../core/utils/dates';
import { MOOD_LEGEND, moodColor, moodFace, moodLabel, score1 } from '../../core/utils/mood';
import { errorMessage } from '../../core/utils/errors';
import { DayPanelComponent } from '../../shared/components/day-panel/day-panel.component';

interface Pixel { date: string; valid: boolean; future: boolean; color: string; title: string; logged: boolean; }
interface MonthStat { name: string; short: string; avg: number | null; days: number; moments: number; }

/**
 * Year in Pixels: one square per day, coloured by that day's average mood.
 * Data comes from /api/stats/trend (max 366 days back), so it covers this year and the end of last year.
 */
@Component({
  selector: 'mc-pixels',
  standalone: true,
  imports: [DayPanelComponent],
  templateUrl: './pixels.component.html',
  styleUrl: './pixels.component.scss'
})
export class PixelsComponent implements OnInit {
  private api = inject(ApiService);
  private store = inject(ProfileStore);

  readonly months = MONTHS_SHORT;
  readonly legend = MOOD_LEGEND;
  readonly days = Array.from({ length: 31 }, (_, i) => i + 1);

  readonly today = computed(() => todayIn(this.store.profile()?.timezone));
  readonly points = signal<TrendPoint[] | null>(null);
  readonly error = signal('');
  readonly year = signal(new Date().getFullYear());
  readonly openDay = signal<string | null>(null);

  private readonly byDate = computed(() => new Map((this.points() ?? []).map(p => [p.date, p])));

  /** Years that have data (always includes this year). */
  readonly years = computed(() => {
    const ys = new Set<number>([Number(this.today().slice(0, 4))]);
    for (const p of this.points() ?? []) ys.add(Number(p.date.slice(0, 4)));
    return [...ys].sort((a, b) => b - a);
  });

  /** rows[day-1][month] */
  readonly rows = computed<Pixel[][]>(() => {
    const y = this.year();
    const map = this.byDate();
    const today = this.today();
    return this.days.map(day => MONTHS_SHORT.map((_, m) => {
      const valid = day <= new Date(y, m + 1, 0).getDate();
      const date = `${y}-${String(m + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const p = valid ? map.get(date) : undefined;
      const future = date > today;
      return {
        date, valid, future, logged: !!p,
        color: !valid ? 'transparent' : future ? 'var(--mood-0)' : moodColor(p?.averageScore),
        title: !valid || future ? '' : p
          ? `${mediumDate(date)} · ${p.emojiSymbol} ${moodLabel(p.averageScore)} (${score1(p.averageScore)}) · ${p.count} moment${p.count === 1 ? '' : 's'}`
          : `${mediumDate(date)} · no moments`
      };
    }));
  });

  readonly yearPoints = computed(() => (this.points() ?? []).filter(p => p.date.startsWith(String(this.year()))));

  readonly stats = computed(() => {
    const pts = this.yearPoints();
    const avg = pts.length ? pts.reduce((s, p) => s + p.averageScore, 0) / pts.length : null;
    const moments = pts.reduce((s, p) => s + p.count, 0);
    // A month needs 5+ logged days to count as the "best" one
    const best = [...this.monthStats()].filter(m => m.avg !== null && m.days >= 5).sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))[0];
    const great = pts.filter(p => p.averageScore >= 4.5).length;
    return { days: pts.length, moments, avg: score1(avg), face: moodFace(avg), best: best?.name ?? '–', great };
  });

  readonly monthStats = computed<MonthStat[]>(() => {
    const pts = this.yearPoints();
    return MONTHS_LONG.map((name, m) => {
      const prefix = `${this.year()}-${String(m + 1).padStart(2, '0')}`;
      const inMonth = pts.filter(p => p.date.startsWith(prefix));
      return {
        name, short: MONTHS_SHORT[m],
        avg: inMonth.length ? inMonth.reduce((s, p) => s + p.averageScore, 0) / inMonth.length : null,
        days: inMonth.length,
        moments: inMonth.reduce((s, p) => s + p.count, 0)
      };
    });
  });

  /** Earliest date the trend endpoint can return – older days show as empty. */
  readonly windowStart = computed(() => addDays(this.today(), -365));
  readonly partialYear = computed(() => `${this.year()}-01-01` < this.windowStart());

  ngOnInit(): void {
    this.year.set(Number(this.today().slice(0, 4)));
    this.load();
  }

  load(): void {
    this.error.set('');
    this.points.set(null);
    this.api.trend(366).subscribe({
      next: p => this.points.set(p),
      error: err => this.error.set(errorMessage(err, "Couldn't load your year."))
    });
  }

  open(p: Pixel): void {
    if (p.valid && !p.future) this.openDay.set(p.date);
  }

  monthColor(avg: number | null): string {
    return moodColor(avg);
  }

  score1 = score1;
}
