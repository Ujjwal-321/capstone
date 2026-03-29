import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MoodService, EmojiService, ToastService } from '../../../core/services/api.services';
import { EmojiResponse } from '../../../core/models';

@Component({
  selector: 'app-log-mood',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="log-mood-page">
      <div class="page-top animate-fadeInUp">
        <h1>Log Your Mood</h1>
        <p class="page-sub">Take a moment to check in with yourself. How are you feeling right now?</p>
        <span class="today-chip">{{ today | date:'EEEE, MMMM d' }}</span>
      </div>

      <div class="log-layout animate-fadeInUp delay-1">
        <!-- Step 1: Emoji -->
        <div class="log-step mc-card">
          <div class="step-badge">Step 1</div>
          <h3>Choose an emoji that matches your mood</h3>
          <p class="step-hint">Pick the one that feels most true right now.</p>

          <div class="emoji-grid-lg" *ngIf="!loading()">
            <div class="emoji-tile"
              *ngFor="let e of emojis()"
              [class.selected]="form.get('emojiId')?.value === e.emojiId"
              (click)="selectEmoji(e)">
              <div class="tile-emoji">{{ e.symbol }}</div>
              <div class="tile-name">{{ e.description }}</div>
              <div class="tile-score">
                <span class="score-dot" *ngFor="let d of [1,2,3,4,5]" [class.on]="d <= e.moodScore"></span>
              </div>
              <div class="tile-check" *ngIf="form.get('emojiId')?.value === e.emojiId">✓</div>
            </div>
          </div>

          <div class="emoji-grid-lg" *ngIf="loading()">
            <div class="skeleton emoji-skeleton" *ngFor="let i of [1,2,3,4,5,6]"></div>
          </div>

          <div class="selected-preview" *ngIf="selectedEmoji()">
            <span class="preview-emoji">{{ selectedEmoji()!.symbol }}</span>
            <div class="preview-info">
              <strong>{{ selectedEmoji()!.description }}</strong>
              <span>Mood score: {{ selectedEmoji()!.moodScore }}/5</span>
            </div>
          </div>
        </div>

        <!-- Step 2: Journal -->
        <div class="log-step mc-card" [class.step-disabled]="!selectedEmoji()">
          <div class="step-badge" [class.badge-active]="selectedEmoji()">Step 2</div>
          <h3>Write a note</h3>
          <p class="step-hint">What's on your mind? A few words are enough.</p>

          <textarea
            class="form-control journal-area"
            [class.is-invalid]="form.get('entryText')?.invalid && form.get('entryText')?.touched"
            formControlName="entryText"
            [formGroup]="form"
            placeholder="Today I'm feeling this way because…"
            rows="5"
            maxlength="255"
            [disabled]="!selectedEmoji()">
          </textarea>
          <div class="char-row">
            <span class="form-error" *ngIf="form.get('entryText')?.invalid && form.get('entryText')?.touched">Please add a short note.</span>
            <span class="char-count">{{ form.get('entryText')?.value?.length || 0 }} / 255</span>
          </div>
        </div>

        <!-- Submit -->
        <div class="submit-row">
          <div class="submit-preview" *ngIf="selectedEmoji()">
            <span class="submit-emoji">{{ selectedEmoji()!.symbol }}</span>
            <span class="submit-text">
              Logging <strong>{{ selectedEmoji()!.description }}</strong> for <strong>today</strong>
            </span>
          </div>
          <button class="btn btn-primary btn-lg" (click)="onSubmit()" [disabled]="submitting()">
            <span class="spinner spinner-sm" *ngIf="submitting()"></span>
            <span *ngIf="!submitting()">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:6px">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              Save Mood Entry
            </span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .log-mood-page { max-width: 860px; }
    .page-top { margin-bottom: var(--space-8); }
    .page-top h1 { font-family: var(--font-display); font-size: clamp(1.8rem, 3vw, 2.4rem); margin-bottom: 8px; }
    .page-sub { font-size: 0.95rem; color: var(--text-secondary); margin-bottom: 12px; }
    .today-chip {
      display: inline-flex; align-items: center;
      background: rgba(201,169,110,0.1); border: 1px solid rgba(201,169,110,0.25);
      color: var(--accent-gold); font-size: 0.78rem; font-weight: 600;
      padding: 5px 14px; border-radius: var(--radius-full); letter-spacing: 0.04em;
    }

    .log-layout { display: flex; flex-direction: column; gap: var(--space-5); }
    .log-step   { position: relative; }

    .step-badge {
      display: inline-block; font-size: 0.65rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.1em; background: var(--bg-overlay); color: var(--text-muted);
      padding: 3px 10px; border-radius: var(--radius-full); border: 1px solid var(--border-subtle);
      margin-bottom: 12px;
      &.badge-active { background: rgba(201,169,110,0.1); color: var(--accent-gold); border-color: rgba(201,169,110,0.3); }
    }
    .optional-badge { background: rgba(94,207,190,0.08); color: var(--accent-teal); border-color: rgba(94,207,190,0.2); }

    .log-step h3 { font-family: var(--font-display); font-size: 1.1rem; color: var(--text-primary); margin-bottom: 6px; }
    .step-hint   { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 20px; }
    .step-disabled { opacity: 0.5; pointer-events: none; }

    .emoji-grid-lg {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 12px; margin-bottom: 20px;
    }

    .emoji-tile {
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
      padding: 16px 10px; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg);
      background: var(--bg-elevated); cursor: pointer; transition: all var(--transition-base);
      position: relative; text-align: center;
      &:hover { border-color: var(--border-accent); background: var(--bg-overlay); transform: translateY(-2px); }
      &.selected {
        border-color: var(--accent-gold); background: var(--accent-glow);
        box-shadow: 0 0 20px rgba(201,169,110,0.2);
      }
    }

    .tile-emoji  { font-size: 2rem; }
    .tile-name   { font-size: 0.72rem; color: var(--text-secondary); text-align: center; line-height: 1.3; }
    .tile-score  { display: flex; gap: 3px; }
    .score-dot   { width: 5px; height: 5px; border-radius: 50%; background: var(--border-default); &.on { background: var(--accent-gold); } }

    .tile-check {
      position: absolute; top: 6px; right: 8px;
      font-size: 0.7rem; color: var(--accent-gold); font-weight: 700;
    }

    .emoji-skeleton { height: 110px; border-radius: var(--radius-lg); }

    .selected-preview {
      display: flex; align-items: center; gap: 14px;
      background: var(--accent-glow); border: 1px solid var(--border-accent);
      border-radius: var(--radius-md); padding: 12px 16px;
    }
    .preview-emoji { font-size: 2rem; }
    .preview-info  { display: flex; flex-direction: column; gap: 2px;
      strong { font-size: 0.9rem; color: var(--text-primary); }
      span   { font-size: 0.78rem; color: var(--text-secondary); }
    }

    .journal-area { resize: none; font-size: 0.95rem; line-height: 1.7; }
    .char-row { display: flex; justify-content: space-between; margin-top: 6px; }
    .char-count { font-size: 0.72rem; color: var(--text-muted); text-align: right; }

    .submit-row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-5); }
    .submit-preview { display: flex; align-items: center; gap: 10px;
      .submit-emoji { font-size: 1.8rem; }
      .submit-text  { font-size: 0.875rem; color: var(--text-secondary);
        strong { color: var(--text-primary); }
      }
    }

    @media (max-width: 600px) {
      .emoji-grid-lg { grid-template-columns: repeat(3, 1fr); }
      .submit-row { flex-direction: column; align-items: stretch; .btn { width: 100%; } }
    }
  `]
})
export class LogMoodComponent implements OnInit {
  private moodSvc  = inject(MoodService);
  private emojiSvc = inject(EmojiService);
  private toast    = inject(ToastService);
  private router   = inject(Router);
  private fb       = inject(FormBuilder);

  loading    = signal(true);
  submitting = signal(false);
  emojis     = signal<EmojiResponse[]>([]);
  selectedEmoji = signal<EmojiResponse | null>(null);
  today      = new Date();

  todayStr = () => new Date().toISOString().split('T')[0];

  form = this.fb.group({
    emojiId:   [null as number | null, Validators.required],
    entryText: ['', [Validators.required, Validators.maxLength(255)]],
    entryDate: [this.todayStr(), Validators.required],
  });

  ngOnInit() {
    this.emojiSvc.getAll().subscribe({
      next: r => { this.emojis.set(r.data); this.loading.set(false); },
      error: () => this.loading.set(false)
    });
  }

  selectEmoji(e: EmojiResponse) {
    this.selectedEmoji.set(e);
    this.form.patchValue({ emojiId: e.emojiId });
  }

  isInvalid(f: string) { const c = this.form.get(f); return c?.invalid && c?.touched; }

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);

    this.moodSvc.createEntry(this.form.value as any).subscribe({
      next: () => {
        this.toast.success('Mood entry saved! ✨');
        this.router.navigate(['/dashboard']);
      },
      error: err => {
        this.toast.error(err?.error?.message || 'Failed to save mood.');
        this.submitting.set(false);
      }
    });
  }
}
