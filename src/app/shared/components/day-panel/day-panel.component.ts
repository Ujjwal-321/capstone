import { Component, HostListener, OnChanges, inject, input, output, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ApiService } from '../../../core/services/api.service';
import { Moment, Reflection } from '../../../core/models';
import { longDate } from '../../../core/utils/dates';
import { moodColor, moodFace, score1 } from '../../../core/utils/mood';
import { errorMessage } from '../../../core/utils/errors';
import { MomentCardComponent } from '../moment-card/moment-card.component';

/** Side drawer with everything from one day: average, reflection and moments (read-only). */
@Component({
  selector: 'mc-day-panel',
  standalone: true,
  imports: [MomentCardComponent],
  template: `
    <div class="scrim" (click)="closed.emit()"></div>
    <aside class="drawer" role="dialog" aria-modal="true" [attr.aria-label]="title()">
      <header>
        <div>
          <p class="eyebrow">{{ year() }}</p>
          <h2>{{ title() }}</h2>
        </div>
        <button type="button" class="x" (click)="closed.emit()" aria-label="Close">✕</button>
      </header>

      @if (loading()) {
        <div class="skeleton" style="height: 64px; margin-bottom: 12px"></div>
        <div class="skeleton" style="height: 120px"></div>
      } @else if (error()) {
        <div class="form-error">{{ error() }}</div>
      } @else {
        @if (moments().length) {
          <div class="avg" [style.--c]="color()">
            <span class="emoji">{{ face() }}</span>
            <div><b>{{ avg() }}</b><span>day average · {{ moments().length }} moment{{ moments().length === 1 ? '' : 's' }}</span></div>
          </div>
        }
        @if (reflection(); as r) {
          <div class="tint refl">
            <b>🌙 REFLECTION · locked</b>
            <p>{{ r.text }}</p>
          </div>
        }
        @for (m of moments(); track m.entryId) {
          <mc-moment-card [moment]="m" />
        } @empty {
          <div class="empty">
            <span class="big">🫧</span>
            <h3>No moments this day</h3>
            <p>Days you log on your phone fill in here.</p>
          </div>
        }
      }
    </aside>
  `,
  styles: [`
    .scrim { position: fixed; inset: 0; background: rgba(20, 12, 40, .35); z-index: 60; animation: fade .2s; }
    .drawer {
      position: fixed; top: 0; right: 0; bottom: 0; width: min(440px, 100vw); z-index: 61;
      background: var(--bg); border-left: 1px solid var(--stroke); box-shadow: var(--shadow-pop);
      padding: 22px 22px 32px; overflow-y: auto; animation: slide .25s ease;
    }
    header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; }
    .eyebrow { font-size: 12px; color: var(--text-2); }
    .x { width: 38px; height: 38px; border-radius: 50%; border: 1px solid var(--stroke-2); background: var(--surface); color: var(--ink); cursor: pointer; }
    .avg {
      display: flex; gap: 12px; align-items: center; margin-bottom: 12px; padding: 12px 14px; border-radius: 16px;
      background: color-mix(in srgb, var(--c) 28%, var(--surface)); border: 1px solid var(--stroke);
    }
    .avg .emoji { font-size: 30px; }
    .avg b { display: block; font-size: 20px; }
    .avg span { font-size: 12px; color: var(--text-2); }
    .refl { margin-bottom: 8px; }
    .refl b { font-size: 11px; letter-spacing: .06em; color: var(--chip-lav-fg); }
    .refl p { margin-top: 4px; font-size: 13.5px; }
    @keyframes slide { from { transform: translateX(30px); opacity: 0; } to { transform: none; opacity: 1; } }
    @keyframes fade { from { opacity: 0; } }
  `]
})
export class DayPanelComponent implements OnChanges {
  private api = inject(ApiService);

  readonly date = input.required<string>();
  readonly closed = output<void>();

  readonly loading = signal(true);
  readonly error = signal('');
  readonly moments = signal<Moment[]>([]);
  readonly reflection = signal<Reflection | null>(null);
  readonly title = signal('');
  readonly year = signal('');
  readonly avg = signal('–');
  readonly face = signal('·');
  readonly color = signal('var(--mood-0)');

  @HostListener('document:keydown.escape') onEsc(): void {
    this.closed.emit();
  }

  ngOnChanges(): void {
    const d = this.date();
    this.title.set(longDate(d));
    this.year.set(d.slice(0, 4));
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      page: this.api.history({ startDate: d, endDate: d, page: 0, size: 10 }),
      refl: this.api.reflections(d, d)
    }).subscribe({
      next: ({ page, refl }) => {
        // History is newest first; read the day from morning to night
        const list = [...page.content].sort((a, b) => (a.entryTime ?? '').localeCompare(b.entryTime ?? ''));
        this.moments.set(list);
        this.reflection.set(refl[0] ?? null);
        const average = list.length ? list.reduce((s, m) => s + m.moodScore, 0) / list.length : null;
        this.avg.set(score1(average));
        this.face.set(moodFace(average));
        this.color.set(moodColor(average));
        this.loading.set(false);
      },
      error: err => {
        this.error.set(errorMessage(err, "Couldn't load this day."));
        this.loading.set(false);
      }
    });
  }
}
