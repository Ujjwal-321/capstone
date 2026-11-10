import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ProfileStore } from '../../core/services/profile.store';
import { Moment, Reflection } from '../../core/models';
import { WEEKDAYS, addDays, longDate, mediumDate, parseYmd, todayIn } from '../../core/utils/dates';
import { moodColor, moodFace, score1 } from '../../core/utils/mood';
import { errorMessage } from '../../core/utils/errors';
import { DayPanelComponent } from '../../shared/components/day-panel/day-panel.component';

interface DayCell { date: string; name: string; short: string; avg: number | null; count: number; future: boolean; }
interface Group { key: string; label: string; icon: string; avg: number; count: number; }

const PERIODS = [
  { key: 'MORNING', label: 'Mornings', icon: '🌅', from: 5, to: 12 },
  { key: 'AFTERNOON', label: 'Afternoons', icon: '☀️', from: 12, to: 17 },
  { key: 'EVENING', label: 'Evenings', icon: '🌆', from: 17, to: 21 },
  { key: 'NIGHT', label: 'Nights', icon: '🌙', from: 21, to: 29 }
];

/** Web-only weekly review: the last 7 days at a glance, compared with the week before. */
@Component({
  selector: 'mc-weekly',
  standalone: true,
  imports: [RouterLink, DayPanelComponent],
  templateUrl: './weekly.component.html',
  styleUrl: './weekly.component.scss'
})
export class WeeklyComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private store = inject(ProfileStore);

  readonly today = computed(() => todayIn(this.store.profile()?.timezone));
  /** Monday of the week being shown. */
  readonly weekStart = signal('');
  readonly moments = signal<Moment[] | null>(null);
  readonly previous = signal<Moment[]>([]);
  readonly reflections = signal<Reflection[]>([]);
  readonly error = signal('');
  readonly openDay = signal<string | null>(null);

  readonly weekEnd = computed(() => addDays(this.weekStart(), 6));
  readonly isCurrent = computed(() => this.weekEnd() >= this.today());
  readonly title = computed(() => this.isCurrent() ? 'This week' :
    this.weekEnd() === addDays(this.thisMonday(), -1) ? 'Last week' : `Week of ${mediumDate(this.weekStart())}`);
  readonly range = computed(() => `${mediumDate(this.weekStart())} – ${mediumDate(this.weekEnd())}`);

  readonly days = computed<DayCell[]>(() => {
    const list = this.moments() ?? [];
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(this.weekStart(), i);
      const ms = list.filter(m => m.entryDate === date);
      const name = WEEKDAYS[parseYmd(date).getDay()];
      return {
        date, name, short: name.slice(0, 3), count: ms.length, future: date > this.today(),
        avg: ms.length ? ms.reduce((s, m) => s + m.moodScore, 0) / ms.length : null
      };
    });
  });

  readonly stats = computed(() => {
    const list = this.moments() ?? [];
    const logged = this.days().filter(d => d.count > 0);
    const avg = logged.length ? logged.reduce((s, d) => s + (d.avg ?? 0), 0) / logged.length : null;
    const prevAvg = this.dailyAverage(this.previous());
    const best = logged.length ? logged.reduce((a, b) => ((b.avg ?? 0) > (a.avg ?? 0) ? b : a)) : null;
    const worst = logged.length ? logged.reduce((a, b) => ((b.avg ?? 9) < (a.avg ?? 9) ? b : a)) : null;
    const top = this.topEmoji(list);
    return { moments: list.length, days: logged.length, avg, prevAvg, best, worst, top };
  });

  readonly places = computed<Group[]>(() => this.group(this.moments() ?? [],
    m => m.placeId ? { key: String(m.placeId), label: m.placeName ?? 'Place', icon: m.placeIcon ?? '📍' } : null));

  readonly times = computed<Group[]>(() => this.group(this.moments() ?? [], m => {
    if (!m.entryTime) return null;
    let h = Number(m.entryTime.slice(0, 2));
    if (h < 5) h += 24;
    const p = PERIODS.find(x => h >= x.from && h < x.to);
    return p ? { key: p.key, label: p.label, icon: p.icon } : null;
  }));

  /** A short, kind summary of the week, written from the numbers. */
  readonly summary = computed(() => {
    const s = this.stats();
    if (!s.moments) return this.isCurrent()
      ? "Nothing logged yet this week. One emoji and one sentence is all it takes."
      : 'No moments this week. That\'s okay, every week is a fresh start.';
    const parts: string[] = [];
    const avg = s.avg ?? 0;
    parts.push(avg >= 4.2 ? 'What a bright week!' : avg >= 3.5 ? 'A good, steady week.' : avg >= 2.7 ? 'A mixed week, with ups and downs.' : 'A heavy week. Be gentle with yourself.');
    parts.push(`You logged ${s.days} of 7 days`);
    if (s.best && s.days > 1) parts[1] += ` and felt best on ${s.best.name}`;
    const place = this.places()[0];
    if (place && place.count >= 2) parts[1] += ` (${place.icon} ${place.label} was your happiest place)`;
    parts[1] += '.';
    if (s.prevAvg !== null && s.avg !== null) {
      const diff = s.avg - s.prevAvg;
      if (diff >= 0.3) parts.push('That\'s a lift from the week before 🌱');
      else if (diff <= -0.3) parts.push('A little lower than last week. Small moments still matter.');
    }
    return parts.join(' ');
  });

  ngOnInit(): void {
    this.weekStart.set(this.thisMonday());
    this.load();
  }

  move(weeks: number): void {
    const next = addDays(this.weekStart(), weeks * 7);
    if (next > this.today()) return;
    this.weekStart.set(next);
    this.load();
  }

  load(): void {
    const start = this.weekStart();
    const end = addDays(start, 6);
    this.moments.set(null);
    this.error.set('');
    forkJoin({
      week: this.api.allMoments(start, end),
      prev: this.api.allMoments(addDays(start, -7), addDays(start, -1)).pipe(catchError(() => of([] as Moment[]))),
      refl: this.api.reflections(start, end).pipe(catchError(() => of([] as Reflection[])))
    }).subscribe({
      next: ({ week, prev, refl }) => {
        this.moments.set(week);
        this.previous.set(prev);
        this.reflections.set(refl);
      },
      error: err => {
        this.moments.set([]);
        this.error.set(errorMessage(err, "Couldn't load this week."));
      }
    });
  }

  color = moodColor;
  face = moodFace;
  score1 = score1;
  long = longDate;
  firstName = () => this.auth.firstName();

  delta(): string {
    const s = this.stats();
    if (s.avg === null || s.prevAvg === null) return '';
    const d = s.avg - s.prevAvg;
    return `${d >= 0 ? '▲' : '▼'} ${Math.abs(d).toFixed(1)} vs week before`;
  }

  private thisMonday(): string {
    const t = this.today();
    const dow = parseYmd(t).getDay();
    return addDays(t, -((dow + 6) % 7));
  }

  private dailyAverage(list: Moment[]): number | null {
    const byDay = new Map<string, number[]>();
    for (const m of list) byDay.set(m.entryDate, [...(byDay.get(m.entryDate) ?? []), m.moodScore]);
    const avgs = [...byDay.values()].map(v => v.reduce((a, b) => a + b, 0) / v.length);
    return avgs.length ? avgs.reduce((a, b) => a + b, 0) / avgs.length : null;
  }

  private topEmoji(list: Moment[]): { symbol: string; label: string; n: number } | null {
    const counts = new Map<string, { symbol: string; label: string; n: number }>();
    for (const m of list) {
      const c = counts.get(m.emojiSymbol) ?? { symbol: m.emojiSymbol, label: m.emojiDescription, n: 0 };
      c.n++;
      counts.set(m.emojiSymbol, c);
    }
    return [...counts.values()].sort((a, b) => b.n - a.n)[0] ?? null;
  }

  private group(list: Moment[], keyOf: (m: Moment) => { key: string; label: string; icon: string } | null): Group[] {
    const map2 = new Map<string, Group & { sum: number }>();
    for (const m of list) {
      const k = keyOf(m);
      if (!k) continue;
      const g = map2.get(k.key) ?? { ...k, avg: 0, count: 0, sum: 0 };
      g.sum += m.moodScore;
      g.count++;
      g.avg = g.sum / g.count;
      map2.set(k.key, g);
    }
    return [...map2.values()].sort((a, b) => b.avg - a.avg || b.count - a.count);
  }
}
