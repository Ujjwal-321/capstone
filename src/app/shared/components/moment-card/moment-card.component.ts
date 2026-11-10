import { Component, computed, input } from '@angular/core';
import { Moment } from '../../../core/models';
import { clockTime, mediumDate } from '../../../core/utils/dates';

/** One saved moment (read-only): emoji tile, place chip, time, sentence and the AI insight line. */
@Component({
  selector: 'mc-moment-card',
  standalone: true,
  template: `
    @let m = moment();
    <article class="moment">
      <div class="emo" [title]="m.emojiDescription">{{ m.emojiSymbol }}</div>
      <div>
        <div class="top">
          @if (m.placeName) {
            <span class="chip" [class.pink]="pink()"><span class="emoji">{{ m.placeIcon || '📍' }}</span> {{ m.placeName }}</span>
          } @else {
            <span class="chip">{{ m.emojiDescription }}</span>
          }
          <span class="time">{{ time() }}</span>
        </div>
        <p class="text">{{ m.entryText }}</p>
        @if (m.insightText) {
          <p class="ins">✦ {{ m.insightText }}</p>
        }
      </div>
    </article>
  `
})
export class MomentCardComponent {
  readonly moment = input.required<Moment>();
  /** Show the date instead of the time (e.g. "On this day"). */
  readonly showDate = input(false);

  readonly time = computed(() => {
    const m = this.moment();
    if (this.showDate()) return mediumDate(m.entryDate);
    return clockTime(m.entryTime) || '';
  });

  /** Alternate chip colours by place so a day reads like the Android timeline. */
  readonly pink = computed(() => (this.moment().placeId ?? 0) % 2 === 0);
}
