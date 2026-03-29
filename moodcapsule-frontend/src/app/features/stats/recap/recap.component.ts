import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatsService } from '../../../core/services/api.services';
import { YearlyRecapResponse } from '../../../core/models';

@Component({
  selector: 'app-recap',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="recap-page">
      <!-- Header -->
      <div class="recap-header animate-fadeInUp">
        <div class="year-selector">
          <button class="yr-btn" (click)="changeYear(-1)">‹</button>
          <span class="yr-display">{{ selectedYear() }}</span>
          <button class="yr-btn" (click)="changeYear(1)" [disabled]="selectedYear() >= currentYear">›</button>
        </div>
        <h1 class="recap-title">Your Year in Moods</h1>
        <p class="recap-sub">A look back at {{ selectedYear() }}'s emotional journey.</p>
      </div>

      <!-- Loading -->
      <div class="recap-loading" *ngIf="loading()">
        <div class="spinner" style="width:48px;height:48px;border-width:4px;"></div>
        <p>Generating your {{ selectedYear() }} recap…</p>
      </div>

      <!-- No Data -->
      <div class="no-data-state" *ngIf="!loading() && !recap()">
        <span class="empty-icon">🌱</span>
        <h3>No entries for {{ selectedYear() }}</h3>
        <p>Start logging your mood to see your yearly recap here.</p>
      </div>

      <!-- Recap Content -->
      <div class="recap-grid animate-fadeInUp delay-1" *ngIf="!loading() && recap()">

        <!-- Hero Card -->
        <div class="hero-card mc-card">
          <div class="hero-orb"></div>
          <div class="hero-content">
            <div class="personality-badge">{{ recap()!.moodPersonality }}</div>
            <p class="hero-desc">You logged <strong class="text-gold">{{ recap()!.totalEntries }}</strong> mood entries in {{ recap()!.year }}. Your average mood was <strong class="text-gold">{{ recap()!.averageMoodLabel }}</strong>.</p>
            <div class="avg-score-visual">
              <div class="avg-bar">
                <div class="avg-fill" [style.width]="((recap()!.averageMoodScore / 5) * 100) + '%'"></div>
              </div>
              <span class="avg-num">{{ recap()!.averageMoodScore | number:'1.1-1' }} / 5</span>
            </div>
          </div>
        </div>

        <!-- Most Used Emoji -->
        <div class="emoji-feat-card mc-card">
          <div class="feat-label">Most Used Mood</div>
          <div class="feat-emoji">{{ recap()!.mostUsedEmojiSymbol }}</div>
          <div class="feat-name">{{ recap()!.mostUsedEmojiDescription }}</div>
          <p class="feat-desc">This was your go-to mood throughout the year.</p>
        </div>

        <!-- Rarest Emoji -->
        <div class="emoji-feat-card mc-card rarest">
          <div class="feat-label">Rarest Mood</div>
          <div class="feat-emoji">{{ recap()!.rarestEmojiSymbol }}</div>
          <div class="feat-name">{{ recap()!.rarestEmojiDescription }}</div>
          <p class="feat-desc">You only felt this way a handful of times.</p>
        </div>

        <!-- Streak -->
        <div class="streak-feat-card mc-card">
          <div class="streak-fire">🔥</div>
          <div class="streak-val">{{ recap()!.longestStreak }}</div>
          <div class="streak-unit">day streak</div>
          <p class="streak-desc">Your longest logging streak of the year.</p>
        </div>

        <!-- Best Month -->
        <div class="month-card mc-card best-month">
          <div class="month-tag">☀️ Best Month</div>
          <div class="month-name">{{ recap()!.bestMonth }}</div>
          <div class="month-score">
            <div class="score-bar">
              <div class="score-fill best-fill" [style.width]="((recap()!.bestMonthAvgScore / 5) * 100) + '%'"></div>
            </div>
            <span>{{ recap()!.bestMonthAvgScore | number:'1.1-1' }} avg</span>
          </div>
        </div>

        <!-- Worst Month -->
        <div class="month-card mc-card worst-month">
          <div class="month-tag">🌧️ Hardest Month</div>
          <div class="month-name">{{ recap()!.worstMonth }}</div>
          <div class="month-score">
            <div class="score-bar">
              <div class="score-fill worst-fill" [style.width]="((recap()!.worstMonthAvgScore / 5) * 100) + '%'"></div>
            </div>
            <span>{{ recap()!.worstMonthAvgScore | number:'1.1-1' }} avg</span>
          </div>
        </div>

        <!-- Full Year Stats Bar -->
        <div class="full-stats mc-card">
          <h3>At a Glance</h3>
          <div class="stat-bars">
            <div class="sbar-row">
              <span class="sbar-label">Total Entries</span>
              <div class="sbar-wrap"><div class="sbar-fill" [style.width]="Math.min(recap()!.totalEntries / 365 * 100, 100) + '%'"></div></div>
              <span class="sbar-val">{{ recap()!.totalEntries }}</span>
            </div>
            <div class="sbar-row">
              <span class="sbar-label">Best Streak</span>
              <div class="sbar-wrap"><div class="sbar-fill streak-color" [style.width]="Math.min(recap()!.longestStreak / 30 * 100, 100) + '%'"></div></div>
              <span class="sbar-val">{{ recap()!.longestStreak }}d</span>
            </div>
            <div class="sbar-row">
              <span class="sbar-label">Avg Score</span>
              <div class="sbar-wrap"><div class="sbar-fill avg-color" [style.width]="(recap()!.averageMoodScore / 5 * 100) + '%'"></div></div>
              <span class="sbar-val">{{ recap()!.averageMoodScore | number:'1.1-1' }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .recap-page { max-width: 1000px; }
    .recap-header { text-align: center; margin-bottom: var(--space-10); }

    .year-selector {
      display: inline-flex; align-items: center; gap: 16px;
      background: var(--bg-elevated); border: 1px solid var(--border-subtle);
      border-radius: var(--radius-full); padding: 6px 18px; margin-bottom: 20px;
    }
    .yr-btn {
      background: none; border: none; color: var(--accent-gold); font-size: 1.1rem;
      cursor: pointer; padding: 0 4px; line-height: 1; transition: opacity var(--transition-fast);
      &:hover   { opacity: 0.7; }
      &:disabled { opacity: 0.3; cursor: not-allowed; }
    }
    .yr-display { font-family: var(--font-mono); font-size: 1rem; color: var(--text-primary); font-weight: 600; }

    .recap-title { font-family: var(--font-display); font-size: clamp(2rem, 4vw, 3rem); color: var(--text-primary); margin-bottom: 8px; }
    .recap-sub   { color: var(--text-secondary); font-size: 1rem; }

    .recap-loading { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 80px; color: var(--text-secondary); }
    .no-data-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px; text-align: center; }
    .empty-icon { font-size: 4rem; opacity: 0.5; }

    /* Grid Layout */
    .recap-grid {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      grid-template-rows: auto;
      gap: var(--space-5);
    }

    /* Hero Card */
    .hero-card {
      grid-column: 1; grid-row: 1 / 3;
      position: relative; overflow: hidden;
      background: linear-gradient(145deg, #13161e, #1a1d28);
    }
    .hero-orb {
      position: absolute; width: 300px; height: 300px;
      background: radial-gradient(circle, rgba(201,169,110,0.15), transparent 70%);
      top: -80px; right: -80px; border-radius: 50%; pointer-events: none;
    }
    .hero-content { position: relative; z-index: 1; }
    .personality-badge {
      display: inline-block; font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.12em; background: rgba(201,169,110,0.12); border: 1px solid rgba(201,169,110,0.3);
      color: var(--accent-gold); padding: 5px 14px; border-radius: var(--radius-full); margin-bottom: 16px;
    }
    .hero-desc { font-size: 1rem; color: var(--text-secondary); line-height: 1.7; margin-bottom: 24px; strong { color: var(--accent-gold); } }
    .avg-score-visual { display: flex; align-items: center; gap: 14px; }
    .avg-bar { flex: 1; height: 8px; background: var(--bg-overlay); border-radius: var(--radius-full); overflow: hidden; }
    .avg-fill { height: 100%; background: linear-gradient(90deg, var(--accent-gold-dk), var(--accent-gold-lt)); border-radius: var(--radius-full); transition: width 1.2s cubic-bezier(0.4,0,0.2,1); }
    .avg-num { font-family: var(--font-mono); font-size: 0.85rem; color: var(--accent-gold); white-space: nowrap; }

    /* Emoji Feat Cards */
    .emoji-feat-card {
      text-align: center; display: flex; flex-direction: column; align-items: center; gap: 8px;
    }
    .feat-label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); font-weight: 600; }
    .feat-emoji { font-size: 3rem; animation: float 3s ease-in-out infinite; }
    .feat-name  { font-family: var(--font-display); font-size: 1rem; color: var(--text-primary); font-weight: 600; }
    .feat-desc  { font-size: 0.78rem; color: var(--text-secondary); text-align: center; }
    .rarest .feat-emoji { animation-delay: -1.5s; }

    /* Streak Card */
    .streak-feat-card {
      text-align: center; display: flex; flex-direction: column; align-items: center; gap: 4px;
      background: linear-gradient(145deg, rgba(224,140,92,0.06), rgba(224,92,92,0.04));
    }
    .streak-fire { font-size: 2rem; }
    .streak-val  { font-family: var(--font-display); font-size: 3rem; font-weight: 700; color: #e08c5c; line-height: 1; }
    .streak-unit { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.1em; color: var(--text-muted); margin-bottom: 4px; }
    .streak-desc { font-size: 0.78rem; color: var(--text-secondary); }

    /* Month Cards */
    .month-card { display: flex; flex-direction: column; gap: 8px; }
    .month-tag  { font-size: 0.72rem; color: var(--text-muted); }
    .month-name { font-family: var(--font-display); font-size: 1.2rem; color: var(--text-primary); font-weight: 600; }
    .month-score { display: flex; align-items: center; gap: 10px;
      .score-bar  { flex: 1; height: 5px; background: var(--bg-overlay); border-radius: var(--radius-full); overflow: hidden; }
      .score-fill { height: 100%; border-radius: var(--radius-full); transition: width 1s ease; }
      .best-fill  { background: linear-gradient(90deg, #3aad9c, #5ecfbe); }
      .worst-fill { background: linear-gradient(90deg, #c04a4a, #e05c5c); }
      span { font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap; }
    }

    /* Full Stats */
    .full-stats { grid-column: 1 / -1;
      h3 { font-family: var(--font-display); font-size: 1.1rem; margin-bottom: 20px; }
    }
    .stat-bars { display: flex; flex-direction: column; gap: 14px; }
    .sbar-row  { display: flex; align-items: center; gap: 16px; }
    .sbar-label { font-size: 0.78rem; color: var(--text-secondary); width: 100px; flex-shrink: 0; }
    .sbar-wrap  { flex: 1; height: 6px; background: var(--bg-overlay); border-radius: var(--radius-full); overflow: hidden; }
    .sbar-fill  { height: 100%; background: linear-gradient(90deg, var(--accent-gold-dk), var(--accent-gold)); border-radius: var(--radius-full); transition: width 1s cubic-bezier(0.4,0,0.2,1); }
    .streak-color { background: linear-gradient(90deg, #c04a00, #e08c5c); }
    .avg-color    { background: linear-gradient(90deg, #3aad9c, #5ecfbe); }
    .sbar-val   { font-family: var(--font-mono); font-size: 0.78rem; color: var(--text-muted); width: 48px; text-align: right; }

    @media (max-width: 900px) {
      .recap-grid { grid-template-columns: 1fr 1fr; }
      .hero-card  { grid-column: 1 / -1; grid-row: auto; }
    }
    @media (max-width: 600px) {
      .recap-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class RecapComponent implements OnInit {
  private statsSvc = inject(StatsService);

  loading      = signal(true);
  recap        = signal<YearlyRecapResponse | null>(null);
  currentYear  = new Date().getFullYear();
  selectedYear = signal(new Date().getFullYear());

  Math = Math;

  ngOnInit() { this.loadRecap(); }

  changeYear(delta: number) {
    const newYear = this.selectedYear() + delta;
    if (newYear > this.currentYear) return;
    this.selectedYear.set(newYear);
    this.loadRecap();
  }

  loadRecap() {
    this.loading.set(true);
    this.recap.set(null);
    this.statsSvc.getRecap(this.selectedYear()).subscribe({
      next: (r: any) => { this.recap.set(r.data); this.loading.set(false); },
      error: ()      => this.loading.set(false)
    });
  }
}
