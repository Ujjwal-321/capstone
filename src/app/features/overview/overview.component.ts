import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OperatorFunction, catchError, forkJoin, map, of } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ProfileStore } from '../../core/services/profile.store';
import { Capsule, Moment, PlaceStat, Reflection, Streak, TrendPoint } from '../../core/models';
import { addDays, addMonths, greeting, hourIn, longDate, todayIn } from '../../core/utils/dates';
import { moodFace, score1 } from '../../core/utils/mood';
import { environment } from '../../../environments/environment';
import { MomentCardComponent } from '../../shared/components/moment-card/moment-card.component';
import { MoodWeeksComponent } from '../../shared/components/mood-weeks/mood-weeks.component';
import { DayPanelComponent } from '../../shared/components/day-panel/day-panel.component';

interface Memory { label: string; date: string; moments: Moment[]; }

/** Home of the web app: this week at a glance, today (read-only), on this day, capsules, mini pixels. */
@Component({
  selector: 'mc-overview',
  standalone: true,
  imports: [RouterLink, MomentCardComponent, MoodWeeksComponent, DayPanelComponent],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss'
})
export class OverviewComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private store = inject(ProfileStore);

  readonly playStoreUrl = environment.playStoreUrl;
  readonly zone = computed(() => this.store.profile()?.timezone ?? null);
  readonly today = computed(() => todayIn(this.zone()));
  readonly dateLine = computed(() => longDate(this.today()));
  readonly hello = computed(() => `${greeting(hourIn(this.zone()))}, ${this.auth.firstName()}`);

  readonly trend = signal<TrendPoint[] | null>(null);
  readonly streak = signal<Streak | null>(null);
  readonly todayMoments = signal<Moment[] | null>(null);
  readonly todayReflection = signal<Reflection | null>(null);
  readonly memories = signal<Memory[] | null>(null);
  readonly capsules = signal<Capsule[] | null>(null);
  readonly places = signal<PlaceStat[] | null>(null);
  readonly failed = signal(false);
  readonly openDay = signal<string | null>(null);

  /** Last 7 days including today. */
  readonly week = computed(() => {
    const points = this.trend();
    if (!points) return null;
    const from = addDays(this.today(), -6);
    const days = points.filter(p => p.date >= from && p.date <= this.today());
    const moments = days.reduce((s, p) => s + p.count, 0);
    const avg = days.length ? days.reduce((s, p) => s + p.averageScore, 0) / days.length : null;
    return { moments, days: days.length, avg: score1(avg), face: moodFace(avg) };
  });

  readonly capsuleInfo = computed(() => {
    const list = this.capsules();
    if (!list) return null;
    const ready = list.filter(c => c.ready && !c.opened);
    const sealed = list.filter(c => !c.ready && !c.opened).sort((a, b) => a.daysLeft - b.daysLeft);
    return { ready: ready.length, sealed: sealed.length, next: sealed[0] ?? null, opened: list.filter(c => c.opened).length };
  });

  readonly topPlaces = computed(() => (this.places() ?? []).filter(p => p.averageScore !== null).slice(0, 4));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.failed.set(false);
    const fail = <T>(fallback: T) => this.soft(fallback);

    this.api.trend(112).pipe(fail([] as TrendPoint[])).subscribe(t => this.trend.set(t));
    this.api.streak().pipe(fail({ currentStreak: 0, longestStreak: 0 })).subscribe(s => this.streak.set(s));
    this.api.todayMoments().pipe(fail([] as Moment[])).subscribe(m => this.todayMoments.set(m));
    this.api.capsules().pipe(fail([] as Capsule[])).subscribe(c => this.capsules.set(c));
    this.api.byPlace(30).pipe(fail([] as PlaceStat[])).subscribe(p => this.places.set(p));

    const today = this.today();
    this.api.reflections(today, today).pipe(fail([] as Reflection[]))
      .subscribe(r => this.todayReflection.set(r[0] ?? null));

    const ago = [
      { label: 'One week ago', date: addDays(today, -7) },
      { label: 'One month ago', date: addMonths(today, -1) },
      { label: 'One year ago', date: addMonths(today, -12) }
    ];
    forkJoin(ago.map(a => this.api.history({ startDate: a.date, endDate: a.date, page: 0, size: 3 }).pipe(
      map(page => ({ ...a, moments: page.content } as Memory)),
      catchError(() => of({ ...a, moments: [] } as Memory))
    ))).subscribe(list => this.memories.set(list.filter(m => m.moments.length > 0)));
  }

  /** A card that fails shows its empty state; a banner offers to retry. */
  private soft<T>(fallback: T): OperatorFunction<T, T> {
    return catchError(() => {
      this.failed.set(true);
      return of(fallback);
    });
  }

  barWidth(score: number | null): number {
    return score ? Math.max(6, (score / 5) * 100) : 0;
  }

  score1 = score1;
}
