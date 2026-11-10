import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OperatorFunction, catchError, forkJoin, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { PlaceStat, Streak, Summary, TimeOfDayStat, TrendPoint, YearlyRecap } from '../../core/models';
import { MONTHS_SHORT, WEEKDAYS, parseYmd } from '../../core/utils/dates';
import { moodColor, moodFace, moodLabel, score1 } from '../../core/utils/mood';
import { LinePoint, MoodLineComponent } from '../../shared/components/mood-line/mood-line.component';

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '3 months' },
  { days: 366, label: 'Year' }
];

/** Patterns: trend, places, time of day, weekdays, mood mix and the year so far. */
@Component({
  selector: 'mc-insights',
  standalone: true,
  imports: [RouterLink, MoodLineComponent],
  templateUrl: './insights.component.html',
  styleUrl: './insights.component.scss'
})
export class InsightsComponent implements OnInit {
  private api = inject(ApiService);

  readonly ranges = RANGES;
  readonly range = signal(30);

  readonly summary = signal<Summary | null>(null);
  readonly streak = signal<Streak | null>(null);
  readonly recap = signal<YearlyRecap | null>(null);
  readonly trend = signal<TrendPoint[] | null>(null);
  readonly places = signal<PlaceStat[] | null>(null);
  readonly times = signal<TimeOfDayStat[] | null>(null);
  readonly failed = signal(false);

  /** Daily points; for long ranges, weekly averages so the line stays readable. */
  readonly line = computed<LinePoint[]>(() => {
    const pts = this.trend() ?? [];
    if (this.range() <= 90) return pts.map(p => ({ date: p.date, value: p.averageScore, count: p.count }));
    const weeks = new Map<string, { sum: number; n: number; count: number; first: string }>();
    for (const p of pts) {
      const d = parseYmd(p.date);
      d.setDate(d.getDate() - d.getDay());
      const key = d.toDateString();
      const w = weeks.get(key) ?? { sum: 0, n: 0, count: 0, first: p.date };
      w.sum += p.averageScore; w.n++; w.count += p.count;
      weeks.set(key, w);
    }
    return [...weeks.values()].map(w => ({
      date: w.first, value: w.sum / w.n, count: w.count,
      label: 'Week of ' + parseYmd(w.first).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }));
  });

  readonly rangeAvg = computed(() => {
    const pts = this.trend() ?? [];
    return pts.length ? pts.reduce((s, p) => s + p.averageScore, 0) / pts.length : null;
  });

  readonly weekdays = computed(() => {
    const sums = Array.from({ length: 7 }, () => ({ sum: 0, n: 0 }));
    for (const p of this.trend() ?? []) {
      const d = parseYmd(p.date).getDay();
      sums[d].sum += p.averageScore;
      sums[d].n++;
    }
    // Monday first
    return [1, 2, 3, 4, 5, 6, 0].map(d => {
      const avg = sums[d].n ? sums[d].sum / sums[d].n : null;
      return { name: WEEKDAYS[d], short: WEEKDAYS[d].slice(0, 3), avg, n: sums[d].n, color: moodColor(avg), height: avg ? (avg / 5) * 100 : 0 };
    });
  });

  readonly weekdayInsight = computed(() => {
    const ds = this.weekdays().filter(d => d.avg !== null && d.n >= 2);
    if (ds.length < 3) return '';
    const best = ds.reduce((a, b) => ((b.avg ?? 0) > (a.avg ?? 0) ? b : a));
    const worst = ds.reduce((a, b) => ((b.avg ?? 9) < (a.avg ?? 9) ? b : a));
    return best === worst ? '' : `${best.name}s tend to feel best; ${worst.name}s are the heaviest.`;
  });

  /** How many days landed in each mood level. */
  readonly mix = computed(() => {
    const pts = this.trend() ?? [];
    const counts = [0, 0, 0, 0, 0];
    for (const p of pts) counts[Math.min(5, Math.max(1, Math.round(p.averageScore))) - 1]++;
    const total = pts.length || 1;
    return [5, 4, 3, 2, 1].map(l => ({ level: l, label: moodLabel(l), face: moodFace(l), n: counts[l - 1], pct: (counts[l - 1] / total) * 100 }));
  });

  readonly placeRows = computed(() => (this.places() ?? []).filter(p => p.averageScore !== null));

  readonly placeInsight = computed(() => {
    const ps = this.placeRows().filter(p => p.count >= 2);
    if (ps.length < 2) return '';
    return `You feel best at ${ps[0].placeIcon} ${ps[0].placeName} and lowest at ${ps[ps.length - 1].placeIcon} ${ps[ps.length - 1].placeName}.`;
  });

  readonly timeInsight = computed(() => {
    const ts = (this.times() ?? []).filter(t => t.averageScore !== null && t.count > 0);
    if (ts.length < 2) return '';
    const best = ts.reduce((a, b) => ((b.averageScore ?? 0) > (a.averageScore ?? 0) ? b : a));
    const worst = ts.reduce((a, b) => ((b.averageScore ?? 9) < (a.averageScore ?? 9) ? b : a));
    return best === worst ? '' : `${best.label}s feel best; ${worst.label.toLowerCase()}s are the toughest.`;
  });

  readonly recapMonth = computed(() => {
    const r = this.recap();
    const month = (m: string | null) => m ? m.charAt(0) + m.slice(1).toLowerCase() : '–';
    return r ? { best: month(r.bestMonth), worst: month(r.worstMonth) } : null;
  });

  ngOnInit(): void {
    this.api.summary().pipe(this.soft<Summary | null>(null)).subscribe(s => this.summary.set(s));
    this.api.streak().pipe(this.soft<Streak | null>(null)).subscribe(s => this.streak.set(s));
    this.api.recap().pipe(this.soft<YearlyRecap | null>(null)).subscribe(r => this.recap.set(r));
    this.loadRange();
  }

  setRange(days: number): void {
    if (days === this.range()) return;
    this.range.set(days);
    this.loadRange();
  }

  loadRange(): void {
    const days = this.range();
    const statsDays = Math.min(days, 366);
    this.trend.set(null);
    this.places.set(null);
    this.times.set(null);
    forkJoin({
      trend: this.api.trend(days).pipe(this.soft<TrendPoint[]>([])),
      places: this.api.byPlace(statsDays).pipe(catchError(() => of([] as PlaceStat[]))),
      times: this.api.byTimeOfDay(statsDays).pipe(catchError(() => of([] as TimeOfDayStat[])))
    }).subscribe(({ trend, places, times }) => {
      this.trend.set(trend);
      this.places.set(places);
      this.times.set(times);
    });
  }

  private soft<T>(fallback: T): OperatorFunction<T, T> {
    return catchError(() => {
      this.failed.set(true);
      return of(fallback);
    });
  }

  bar(score: number | null): number {
    return score ? Math.max(4, (score / 5) * 100) : 0;
  }

  /** 17 → "5pm" */
  hour(h: number): string {
    const h12 = ((h + 11) % 12) + 1;
    return `${h12}${h < 12 || h === 24 ? 'am' : 'pm'}`;
  }

  score1 = score1;
  face = moodFace;
  months = MONTHS_SHORT;
}
