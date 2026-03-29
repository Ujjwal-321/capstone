import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { MoodService, StatsService, EmojiService, ToastService } from '../../core/services/api.services';
import { MoodEntryResponse, MoodSummaryResponse, StreakResponse, EmojiResponse } from '../../core/models';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  template: `
    <div class="dashboard">

      <!-- ── Page Header ─────────────────────────── -->
      <div class="page-header animate-fadeInUp">
        <div class="greeting-block">
          <span class="greeting-label">Good {{ timeOfDay() }},</span>
          <h1 class="greeting-name">{{ userName() }} <span class="wave">👋</span></h1>
        </div>
        <div class="header-actions">
          <a routerLink="/stats/overview" class="btn btn-secondary btn-sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            View Stats
          </a>
        </div>
      </div>

      <!-- ── Stat Cards Row ──────────────────────── -->
      <div class="stats-row">
        <div class="stat-card animate-fadeInUp delay-1">
          <div class="stat-icon-wrap mood-icon">📊</div>
          <div class="stat-info">
            <span class="stat-label">Total Entries</span>
            <span class="stat-val">
              <ng-container *ngIf="!summaryLoading(); else skVal">{{ summary()?.totalEntries ?? 0 }}</ng-container>
            </span>
          </div>
        </div>
        <div class="stat-card animate-fadeInUp delay-2">
          <div class="stat-icon-wrap streak-icon">🔥</div>
          <div class="stat-info">
            <span class="stat-label">Current Streak</span>
            <span class="stat-val">
              <ng-container *ngIf="!streakLoading(); else skVal">{{ streak()?.currentStreak ?? 0 }} days</ng-container>
            </span>
          </div>
        </div>
        <div class="stat-card animate-fadeInUp delay-3">
          <div class="stat-icon-wrap best-icon">🏆</div>
          <div class="stat-info">
            <span class="stat-label">Best Streak</span>
            <span class="stat-val">
              <ng-container *ngIf="!streakLoading(); else skVal">{{ streak()?.longestStreak ?? 0 }} days</ng-container>
            </span>
          </div>
        </div>
        <div class="stat-card animate-fadeInUp delay-4">
          <div class="stat-icon-wrap avg-icon">✨</div>
          <div class="stat-info">
            <span class="stat-label">Avg Mood</span>
            <span class="stat-val">
              <ng-container *ngIf="!summaryLoading(); else skVal">
                {{ summary()?.averageMoodLabel ?? 'N/A' }}
              </ng-container>
            </span>
          </div>
        </div>
      </div>

      <!-- ── Main Grid ───────────────────────────── -->
      <div class="main-grid">

        <!-- Today's Mood Card -->
        <div class="today-card mc-card animate-fadeInUp delay-2">
          <div class="card-header">
            <h3>Today's Mood</h3>
            <span class="today-date">{{ today | date:'MMMM d' }}</span>
          </div>

          <!-- Already logged — read only -->
          <div class="today-logged" *ngIf="todayEntry()">
            <div class="logged-emoji">{{ todayEntry()!.emojiSymbol }}</div>
            <div class="logged-info">
              <div class="logged-mood-name">{{ todayEntry()!.emojiDescription }}</div>
              <div class="logged-score">
                <div class="score-dots">
                  <span class="dot" *ngFor="let d of [1,2,3,4,5]"
                    [class.active]="d <= todayEntry()!.moodScore"></span>
                </div>
                <span class="score-num">{{ todayEntry()!.moodScore }}/5</span>
              </div>
              <p class="logged-text">"{{ todayEntry()!.entryText }}"</p>
            </div>
            <div class="locked-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Locked
            </div>
          </div>

          <!-- Log Form — only if no entry today -->
          <div class="log-form" *ngIf="!todayEntry()">
            <p class="log-prompt">How are you feeling today?</p>

            <div class="emoji-grid" *ngIf="!emojisLoading()">
              <div class="emoji-option"
                *ngFor="let e of emojis()"
                [class.selected]="logForm.get('emojiId')?.value === e.emojiId"
                (click)="logForm.patchValue({ emojiId: e.emojiId })"
                [attr.data-tooltip]="e.description">
                <span class="emoji-symbol">{{ e.symbol }}</span>
                <span class="emoji-label">{{ e.description }}</span>
              </div>
            </div>

            <div class="emoji-grid-skeleton" *ngIf="emojisLoading()">
              <div class="skeleton sk-emoji" *ngFor="let i of [1,2,3,4,5]"></div>
            </div>

            <div class="form-group" style="margin-top: 16px;">
              <textarea class="form-control" [class.is-invalid]="logFormInvalid('entryText')"
                formControlName="entryText" [formGroup]="logForm"
                placeholder="Write a note about how you feel…"
                rows="3" maxlength="255">
              </textarea>
              <div class="char-count">{{ logForm.get('entryText')?.value?.length || 0 }}/255</div>
            </div>

            <div class="form-actions">
              <button class="btn btn-primary" (click)="submitLog()" [disabled]="logging()">
                <span class="spinner spinner-sm" *ngIf="logging()"></span>
                <span *ngIf="!logging()">Log Mood</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Recent History Card -->
        <div class="recent-card mc-card animate-fadeInUp delay-3">
          <div class="card-header">
            <h3>Recent History</h3>
            <a routerLink="/mood/history" class="view-all">View all →</a>
          </div>

          <div class="recent-loading" *ngIf="recentLoading()">
            <div class="skeleton sk-entry" *ngFor="let i of [1,2,3,4,5]"></div>
          </div>

          <div class="recent-list" *ngIf="!recentLoading()">
            <div class="recent-item" *ngFor="let e of recentEntries()">
              <div class="recent-emoji">{{ e.emojiSymbol }}</div>
              <div class="recent-info">
                <span class="recent-mood">{{ e.emojiDescription }}</span>
                <span class="recent-text">{{ e.entryText | slice:0:60 }}{{ e.entryText.length > 60 ? '…' : '' }}</span>
              </div>
              <div class="recent-meta">
                <span class="recent-date">{{ e.entryDate | date:'MMM d' }}</span>
                <div class="recent-score">
                  <span *ngFor="let d of [1,2,3,4,5]" class="mini-dot" [class.on]="d <= e.moodScore"></span>
                </div>
              </div>
            </div>

            <div class="empty-state" *ngIf="recentEntries().length === 0" style="padding: 32px 0">
              <span class="empty-icon">🌱</span>
              <h3>No entries yet</h3>
              <p>Start logging your mood to see your history here.</p>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Mood Bar ─────────────────────────────── -->
      <div class="mood-insight-bar mc-card animate-fadeInUp delay-4" *ngIf="summary()?.mostUsedMood">
        <div class="insight-icon">💡</div>
        <div class="insight-text">
          <strong>Mood Insight</strong>
          <span>Your most frequent mood this period is <em class="text-gold">{{ summary()?.mostUsedMood }}</em>.</span>
        </div>
        <a routerLink="/stats/overview" class="btn btn-secondary btn-sm">See full analysis</a>
      </div>

    </div>

    <ng-template #skVal><span class="skeleton" style="width:60px;height:20px;display:inline-block;border-radius:4px;"></span></ng-template>
  `,
  styles: [`
    .dashboard { max-width: 1100px; }

    .page-header {
      display: flex; align-items: flex-end; justify-content: space-between;
      margin-bottom: var(--space-8);
    }

    .greeting-label { font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; display: block; margin-bottom: 4px; }
    .greeting-name  { font-family: var(--font-display); font-size: clamp(1.8rem, 3vw, 2.4rem); font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 10px; }
    .wave { display: inline-block; animation: float 2.5s ease-in-out infinite; font-style: normal; }

    /* Stats Row */
    .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-5); margin-bottom: var(--space-8); }

    .stat-card {
      background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg);
      padding: var(--space-5); display: flex; align-items: center; gap: var(--space-4);
      transition: all var(--transition-base);
      &:hover { border-color: var(--border-accent); box-shadow: var(--shadow-gold); }
    }

    .stat-icon-wrap {
      width: 44px; height: 44px; border-radius: var(--radius-md);
      display: flex; align-items: center; justify-content: center; font-size: 1.3rem; flex-shrink: 0;
    }
    .mood-icon   { background: rgba(201,169,110,0.1); }
    .streak-icon { background: rgba(224,140,92,0.1); }
    .best-icon   { background: rgba(212,184,74,0.1); }
    .avg-icon    { background: rgba(94,207,190,0.1); }

    .stat-info { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
    .stat-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); font-weight: 600; }
    .stat-val   { font-family: var(--font-display); font-size: 1.4rem; font-weight: 700; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Main Grid */
    .main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-6); margin-bottom: var(--space-6); }

    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-5); }
    .card-header h3 { font-family: var(--font-display); font-size: 1.1rem; color: var(--text-primary); }
    .today-date  { font-size: 0.8rem; color: var(--text-muted); }
    .view-all    { font-size: 0.82rem; color: var(--accent-gold); &:hover { color: var(--accent-gold-lt); } }

    /* Today Logged */
    .today-logged { display: flex; gap: var(--space-4); align-items: flex-start; position: relative; }
    .logged-emoji { font-size: 3rem; flex-shrink: 0; animation: float 3s ease-in-out infinite; }
    .logged-info  { flex: 1; }
    .logged-mood-name { font-family: var(--font-display); font-size: 1.1rem; color: var(--text-primary); margin-bottom: 6px; }
    .logged-score { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
    .score-dots { display: flex; gap: 4px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border-default); &.active { background: var(--accent-gold); } }
    .score-num { font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono); }
    .logged-text { font-size: 0.875rem; color: var(--text-secondary); font-style: italic; line-height: 1.5; }
    .edit-btn { position: absolute; top: 0; right: 0; }

    .locked-badge {
      position: absolute; top: 0; right: 0;
      display: inline-flex; align-items: center; gap: 5px;
      font-size: 0.68rem; font-weight: 600; text-transform: uppercase;
      letter-spacing: 0.08em; color: var(--text-muted);
      background: var(--bg-overlay); border: 1px solid var(--border-subtle);
      padding: 4px 10px; border-radius: var(--radius-full);
    }

    /* Log Form */
    .log-prompt { font-size: 0.9rem; color: var(--text-secondary); margin-bottom: var(--space-4); }

    .emoji-grid-skeleton { display: flex; gap: 10px; flex-wrap: wrap; }
    .sk-emoji { width: 64px; height: 80px; border-radius: var(--radius-md); }

    .char-count { font-size: 0.72rem; color: var(--text-muted); text-align: right; margin-top: 4px; }

    .form-actions { display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-4); }

    /* Recent List */
    .recent-list { display: flex; flex-direction: column; gap: 0; }
    .sk-entry { height: 56px; border-radius: var(--radius-md); margin-bottom: 8px; }

    .recent-item {
      display: flex; align-items: center; gap: var(--space-4);
      padding: 12px 0; border-bottom: 1px solid var(--border-subtle);
      transition: background var(--transition-fast); border-radius: var(--radius-sm);
      &:last-child { border-bottom: none; }
      &:hover { background: var(--bg-elevated); padding-left: 8px; margin: 0 -8px; }
    }

    .recent-emoji  { font-size: 1.5rem; flex-shrink: 0; }
    .recent-info   { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .recent-mood   { font-size: 0.85rem; font-weight: 500; color: var(--text-primary); }
    .recent-text   { font-size: 0.78rem; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .recent-meta   { display: flex; flex-direction: column; align-items: flex-end; gap: 4px; flex-shrink: 0; }
    .recent-date   { font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono); }
    .recent-score  { display: flex; gap: 3px; }
    .mini-dot      { width: 6px; height: 6px; border-radius: 50%; background: var(--border-default); &.on { background: var(--accent-gold); } }

    /* Insight Bar */
    .mood-insight-bar {
      display: flex; align-items: center; gap: var(--space-4);
      background: linear-gradient(135deg, rgba(201,169,110,0.05), rgba(94,207,190,0.03));
    }
    .insight-icon { font-size: 1.5rem; flex-shrink: 0; }
    .insight-text { flex: 1; display: flex; flex-direction: column; gap: 2px;
      strong { font-size: 0.85rem; color: var(--text-primary); }
      span   { font-size: 0.82rem; color: var(--text-secondary); em { font-style: normal; } }
    }

    @media (max-width: 1024px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 768px)  { .main-grid { grid-template-columns: 1fr; } .stats-row { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 480px)  { .stats-row { grid-template-columns: repeat(2, 1fr); } .page-header { flex-direction: column; align-items: flex-start; gap: 16px; } }
  `]
})
export class DashboardComponent implements OnInit {
  private auth     = inject(AuthService);
  private moodSvc  = inject(MoodService);
  private statsSvc = inject(StatsService);
  private emojiSvc = inject(EmojiService);
  private toast    = inject(ToastService);
  private fb       = inject(FormBuilder);

  userName    = computed(() => this.auth.user()?.fullName?.split(' ')[0] ?? 'there');
  today       = new Date();
  summaryLoading = signal(true);
  streakLoading  = signal(true);
  recentLoading  = signal(true);
  emojisLoading  = signal(true);
  logging        = signal(false);

  summary        = signal<MoodSummaryResponse | null>(null);
  streak         = signal<StreakResponse | null>(null);
  todayEntry     = signal<MoodEntryResponse | null>(null);
  recentEntries  = signal<MoodEntryResponse[]>([]);
  emojis         = signal<EmojiResponse[]>([]);

  logForm = this.fb.group({
    emojiId:   [null as number | null, Validators.required],
    entryText: ['', [Validators.required, Validators.maxLength(255)]],
  });

  timeOfDay = computed(() => {
    const h = new Date().getHours();
    if (h < 12) return 'morning';
    if (h < 17) return 'afternoon';
    return 'evening';
  });

  ngOnInit() {
    this.loadAll();
  }

  logFormInvalid(f: string) { const c = this.logForm.get(f); return c?.invalid && c?.touched; }

  loadAll() {
    // Summary
    this.statsSvc.getSummary().subscribe({
      next: r => { this.summary.set(r.data); this.summaryLoading.set(false); },
      error: () => this.summaryLoading.set(false)
    });
    // Streak
    this.statsSvc.getStreak().subscribe({
      next: r => { this.streak.set(r.data); this.streakLoading.set(false); },
      error: () => this.streakLoading.set(false)
    });
    // Today's entry
    this.moodSvc.getTodayEntry().subscribe({
      next: r => { this.todayEntry.set(r.data); },
      error: () => {} // 404 is fine — no entry today
    });
    // Recent history
    this.moodSvc.getHistory({ page: 0, size: 6 }).subscribe({
      next: r => { this.recentEntries.set(r.data.content); this.recentLoading.set(false); },
      error: () => this.recentLoading.set(false)
    });
    // Emojis
    this.emojiSvc.getAll().subscribe({
      next: r => { this.emojis.set(r.data); this.emojisLoading.set(false); },
      error: () => this.emojisLoading.set(false)
    });
  }

  submitLog() {
    this.logForm.markAllAsTouched();
    if (this.logForm.invalid || this.logging()) return;

    this.logging.set(true);
    const payload = {
      ...this.logForm.value,
      entryDate: new Date().toISOString().split('T')[0]
    } as any;

    this.moodSvc.createEntry(payload).subscribe({
      next: r => {
        this.todayEntry.set(r.data);
        this.logging.set(false);
        this.toast.success('Mood logged! 🎉');
        this.loadAll();
      },
      error: err => {
        this.toast.error(err?.error?.message || 'Failed to log mood.');
        this.logging.set(false);
      }
    });
  }
}
