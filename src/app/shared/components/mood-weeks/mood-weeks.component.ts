import { Component, computed, input, output } from '@angular/core';
import { TrendPoint } from '../../../core/models';
import { addDays, mediumDate, parseYmd } from '../../../core/utils/dates';
import { moodColor, moodLabel, score1 } from '../../../core/utils/mood';

interface Cell { date: string; color: string; title: string; future: boolean; }

/** Compact mood heatmap: one column per week (Sun → Sat), newest week on the right. */
@Component({
  selector: 'mc-mood-weeks',
  standalone: true,
  template: `
    <div class="weeks" [style.--n]="weeks()">
      @for (week of grid(); track $index) {
        <div class="col">
          @for (c of week; track c.date) {
            <button type="button" class="px" [class.future]="c.future" [style.background]="c.color"
                    [title]="c.title" [attr.aria-label]="c.title" [disabled]="c.future" (click)="pick.emit(c.date)"></button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .weeks { display: grid; grid-template-columns: repeat(var(--n), 1fr); gap: 4px; }
    .col { display: grid; grid-template-rows: repeat(7, 1fr); gap: 4px; }
    .px { aspect-ratio: 1; width: 100%; border: 0; border-radius: 4px; padding: 0; cursor: pointer; transition: transform .12s; }
    .px:hover:not(.future) { transform: scale(1.25); box-shadow: 0 2px 6px rgba(0,0,0,.15); }
    .px.future { opacity: .25; cursor: default; }
  `]
})
export class MoodWeeksComponent {
  readonly points = input.required<TrendPoint[]>();
  readonly today = input.required<string>();
  readonly weeks = input(15);
  readonly pick = output<string>();

  readonly grid = computed<Cell[][]>(() => {
    const byDate = new Map(this.points().map(p => [p.date, p]));
    const today = this.today();
    // End on the Saturday of this week so columns are whole weeks
    const end = addDays(today, 6 - parseYmd(today).getDay());
    const start = addDays(end, -(this.weeks() * 7 - 1));
    const cols: Cell[][] = [];
    for (let w = 0; w < this.weeks(); w++) {
      const col: Cell[] = [];
      for (let d = 0; d < 7; d++) {
        const date = addDays(start, w * 7 + d);
        const p = byDate.get(date);
        const future = date > today;
        col.push({
          date,
          future,
          color: future ? 'var(--mood-0)' : moodColor(p?.averageScore),
          title: future ? '' : p
            ? `${mediumDate(date)} · ${moodLabel(p.averageScore)} ${score1(p.averageScore)} · ${p.count} moment${p.count === 1 ? '' : 's'}`
            : `${mediumDate(date)} · no moments`
        });
      }
      cols.push(col);
    }
    return cols;
  });
}
