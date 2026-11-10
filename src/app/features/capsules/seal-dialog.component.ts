import { Component, HostListener, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { Capsule, Emoji } from '../../core/models';
import { addDays, addMonths, mediumDate } from '../../core/utils/dates';
import { errorMessage } from '../../core/utils/errors';

const MIN_DAYS = 7;
const MAX_YEARS = 10;

type Choice = '1m' | '6m' | '1y' | 'ny' | 'pick';

/** "Letter to future you": one sentence, an optional mood, and an unlock date at least a week away. */
@Component({
  selector: 'mc-seal-dialog',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="scrim" (click)="closed.emit()"></div>
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="seal-title">
      <header>
        <div class="seal-icon">💌</div>
        <div>
          <h2 id="seal-title">Seal a time capsule</h2>
          <p class="muted">Write one line to your future self. You can't read it again until it opens.</p>
        </div>
        <button type="button" class="x" (click)="closed.emit()" aria-label="Close">✕</button>
      </header>

      @if (error()) { <div class="form-error">{{ error() }}</div> }

      <div class="field">
        <label for="msg">Your message</label>
        <textarea id="msg" maxlength="255" rows="3" [(ngModel)]="message"
                  placeholder="Hi future me, I hope you…"></textarea>
        <span class="counter">{{ message.length }} / 255</span>
      </div>

      <div class="field">
        <label>How do you feel right now? <span class="hint">(optional)</span></label>
        <div class="emojis">
          @for (e of emojis(); track e.emojiId) {
            <button type="button" class="emo" [class.on]="emojiId() === e.emojiId" [title]="e.description"
                    [attr.aria-label]="e.description" [attr.aria-pressed]="emojiId() === e.emojiId"
                    (click)="emojiId.set(emojiId() === e.emojiId ? null : e.emojiId)">{{ e.symbol }}</button>
          }
        </div>
      </div>

      <div class="field">
        <label>Open it in…</label>
        <div class="chips">
          @for (o of options; track o.key) {
            <button type="button" class="chip" [class.on]="choice() === o.key" (click)="choice.set(o.key)">{{ o.label }}</button>
          }
        </div>
        @if (choice() === 'pick') {
          <input class="input pick" type="date" [min]="minDate()" [max]="maxDate()" [(ngModel)]="picked" aria-label="Unlock date" />
        }
        @if (unlockDate(); as d) {
          <p class="when">🔓 Opens on <b>{{ pretty(d) }}</b></p>
        }
      </div>

      <button type="button" class="btn block" (click)="seal()" [disabled]="!canSeal()">
        @if (busy()) { <span class="spinner"></span> } Seal capsule 🔒
      </button>
      <p class="hint center">Up to 10 sealed capsules at a time · it can't be edited or opened early</p>
    </div>
  `,
  styles: [`
    .scrim { position: fixed; inset: 0; background: rgba(20, 12, 40, .45); z-index: 70; animation: fade .2s; }
    .dialog {
      position: fixed; z-index: 71; left: 50%; top: 50%; transform: translate(-50%, -50%);
      width: min(560px, calc(100vw - 24px)); max-height: calc(100vh - 24px); overflow-y: auto;
      background: var(--bg); border-radius: 26px; padding: 22px 24px 20px; box-shadow: var(--shadow-pop);
      animation: pop .25s ease;
    }
    header { display: flex; gap: 14px; align-items: flex-start; margin-bottom: 16px; }
    header > div:nth-child(2) { flex: 1; }
    header p { font-size: 13px; margin-top: 2px; }
    .seal-icon { width: 52px; height: 52px; border-radius: 16px; background: var(--grad-btn); display: grid; place-items: center; font-size: 26px; flex: none; font-family: var(--emoji); }
    .x { width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--stroke-2); background: var(--surface); color: var(--ink); cursor: pointer; flex: none; }
    .emojis { display: grid; grid-template-columns: repeat(auto-fill, minmax(42px, 1fr)); gap: 6px; max-height: 148px; overflow-y: auto; padding: 2px; }
    .emo {
      height: 42px; border-radius: 13px; border: 1.5px solid transparent; background: var(--grad-tint);
      font-size: 22px; cursor: pointer; font-family: var(--emoji); transition: transform .12s;
      &:hover { transform: scale(1.08); }
      &.on { border-color: var(--primary); box-shadow: 0 0 0 2px color-mix(in srgb, var(--primary) 30%, transparent); }
    }
    .pick { margin-top: 10px; max-width: 220px; }
    .when { margin-top: 10px; font-size: 13.5px; }
    .center { text-align: center; margin-top: 10px; }
    @keyframes pop { from { opacity: 0; transform: translate(-50%, -46%) scale(.97); } }
    @keyframes fade { from { opacity: 0; } }
  `]
})
export class SealDialogComponent implements OnInit {
  private api = inject(ApiService);

  readonly today = input.required<string>();
  readonly closed = output<void>();
  readonly sealed = output<Capsule>();

  readonly options: { key: Choice; label: string }[] = [
    { key: '1m', label: '1 month' },
    { key: '6m', label: '6 months' },
    { key: '1y', label: '1 year' },
    { key: 'ny', label: 'New Year 🎆' },
    { key: 'pick', label: 'Pick a date' }
  ];

  message = '';
  picked = '';
  readonly emojis = signal<Emoji[]>([]);
  readonly emojiId = signal<number | null>(null);
  readonly choice = signal<Choice>('6m');
  readonly busy = signal(false);
  readonly error = signal('');

  readonly minDate = computed(() => addDays(this.today(), MIN_DAYS));
  readonly maxDate = computed(() => addMonths(this.today(), MAX_YEARS * 12));

  /** Recomputed on every change detection because `picked` is a plain field bound with ngModel. */
  unlockDate(): string | null {
    const t = this.today();
    switch (this.choice()) {
      case '1m': return addMonths(t, 1);
      case '6m': return addMonths(t, 6);
      case '1y': return addMonths(t, 12);
      case 'ny': {
        let year = Number(t.slice(0, 4)) + 1;
        if (`${year}-01-01` < this.minDate()) year++;
        return `${year}-01-01`;
      }
      case 'pick': return this.picked && this.picked >= this.minDate() && this.picked <= this.maxDate() ? this.picked : null;
    }
  }

  ngOnInit(): void {
    this.api.emojis().subscribe({ next: e => this.emojis.set(e), error: () => {} });
  }

  @HostListener('document:keydown.escape') onEsc(): void {
    if (!this.busy()) this.closed.emit();
  }

  canSeal(): boolean {
    return !this.busy() && !!this.message.trim() && !!this.unlockDate();
  }

  seal(): void {
    const unlockDate = this.unlockDate();
    if (!this.canSeal() || !unlockDate) return;
    this.busy.set(true);
    this.error.set('');
    this.api.sealCapsule({ message: this.message.trim(), emojiId: this.emojiId(), unlockDate }).subscribe({
      next: c => this.sealed.emit(c),
      error: err => {
        this.busy.set(false);
        this.error.set(errorMessage(err, "Couldn't seal the capsule. Please try again."));
      }
    });
  }

  pretty = mediumDate;
}
