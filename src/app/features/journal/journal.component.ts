import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ProfileStore } from '../../core/services/profile.store';
import { Emoji, HistoryQuery, Moment, Place, Reflection } from '../../core/models';
import { dayHeader, longDate, todayIn } from '../../core/utils/dates';
import { moodFace, score1 } from '../../core/utils/mood';
import { errorMessage } from '../../core/utils/errors';
import { MomentCardComponent } from '../../shared/components/moment-card/moment-card.component';

interface DayGroup { date: string; header: string; full: string; moments: Moment[]; avg: string; face: string; reflection: Reflection | null; }

const PAGE_SIZE = 40;

/** Journal in reading mode: every moment grouped by day, with search and filters. Read-only. */
@Component({
  selector: 'mc-journal',
  standalone: true,
  imports: [FormsModule, MomentCardComponent],
  templateUrl: './journal.component.html',
  styleUrl: './journal.component.scss'
})
export class JournalComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private store = inject(ProfileStore);

  readonly today = computed(() => todayIn(this.store.profile()?.timezone));

  // Filters
  keyword = '';
  readonly placeId = signal<number | null>(null);
  readonly emojiId = signal<number | null>(null);
  startDate = '';
  endDate = '';

  readonly places = signal<Place[]>([]);
  readonly emojis = signal<Emoji[]>([]);
  readonly moments = signal<Moment[]>([]);
  readonly reflections = signal<Map<string, Reflection>>(new Map());
  readonly total = signal(0);
  readonly page = signal(0);
  readonly last = signal(true);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal('');

  private keyword$ = new Subject<string>();
  private sub?: Subscription;
  private request?: Subscription;

  readonly filtered = computed(() => !!(this.placeId() || this.emojiId()) || this.hasText());
  private readonly hasText = signal(false);

  readonly groups = computed<DayGroup[]>(() => {
    const byDay = new Map<string, Moment[]>();
    for (const m of this.moments()) {
      const list = byDay.get(m.entryDate) ?? [];
      list.push(m);
      byDay.set(m.entryDate, list);
    }
    const refl = this.reflections();
    return [...byDay.entries()].map(([date, list]) => {
      const sorted = [...list].sort((a, b) => (a.entryTime ?? '').localeCompare(b.entryTime ?? ''));
      const avg = sorted.reduce((s, m) => s + m.moodScore, 0) / sorted.length;
      return {
        date, moments: sorted, header: dayHeader(date, this.today()), full: longDate(date),
        avg: score1(avg), face: moodFace(avg), reflection: refl.get(date) ?? null
      };
    });
  });

  ngOnInit(): void {
    this.api.places(true).subscribe({ next: p => this.places.set(p), error: () => {} });
    this.api.emojis().subscribe({ next: e => this.emojis.set(e), error: () => {} });
    this.sub = this.keyword$.pipe(debounceTime(350), distinctUntilChanged()).subscribe(() => this.search());
    this.search();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
    this.request?.unsubscribe();
  }

  onKeyword(value: string): void {
    this.keyword = value;
    this.keyword$.next(value.trim());
  }

  togglePlace(id: number): void {
    this.placeId.set(this.placeId() === id ? null : id);
    this.search();
  }

  setEmoji(value: string): void {
    this.emojiId.set(value ? Number(value) : null);
    this.search();
  }

  clear(): void {
    this.keyword = '';
    this.placeId.set(null);
    this.emojiId.set(null);
    this.startDate = '';
    this.endDate = '';
    this.search();
  }

  search(): void {
    this.hasText.set(!!this.keyword.trim() || !!this.startDate || !!this.endDate);
    this.loading.set(true);
    this.error.set('');
    this.fetch(0, false);
  }

  more(): void {
    if (this.last() || this.loadingMore()) return;
    this.loadingMore.set(true);
    this.fetch(this.page() + 1, true);
  }

  private fetch(page: number, append: boolean): void {
    const q: HistoryQuery = {
      keyword: this.keyword.trim() || undefined,
      placeId: this.placeId() ?? undefined,
      emojiId: this.emojiId() ?? undefined,
      startDate: this.startDate || undefined,
      endDate: this.endDate || undefined,
      page,
      size: PAGE_SIZE
    };
    this.request?.unsubscribe();
    this.request = this.api.history(q).subscribe({
      next: res => {
        const list = append ? [...this.moments(), ...res.content] : res.content;
        this.moments.set(list);
        this.total.set(res.totalElements);
        this.page.set(res.page);
        this.last.set(res.last);
        this.loading.set(false);
        this.loadingMore.set(false);
        this.loadReflections(list);
      },
      error: err => {
        this.error.set(errorMessage(err, "Couldn't load your journal."));
        this.loading.set(false);
        this.loadingMore.set(false);
      }
    });
  }

  /** Reflections for the days on screen (one request for the whole range). */
  private loadReflections(list: Moment[]): void {
    if (!list.length) {
      this.reflections.set(new Map());
      return;
    }
    const dates = list.map(m => m.entryDate).sort();
    this.api.reflections(dates[0], dates[dates.length - 1]).subscribe({
      next: rs => this.reflections.set(new Map(rs.map(r => [r.reflectionDate, r]))),
      error: () => {}
    });
  }
}
