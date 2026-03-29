import { Component, OnInit, signal, inject, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StatsService } from '../../../core/services/api.services';
import { MoodSummaryResponse, MoodTrendPointResponse, StreakResponse } from '../../../core/models';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="overview-page">
      <div class="page-top animate-fadeInUp">
        <h1>Statistics</h1>
        <p class="page-sub">Understand your emotional patterns at a glance.</p>
        <div class="period-tabs">
          <button class="period-btn" *ngFor="let p of periods"
            [class.active]="activePeriod() === p.days"
            (click)="setPeriod(p.days)">{{ p.label }}</button>
        </div>
      </div>

      <!-- Summary Stats -->
      <div class="summary-row animate-fadeInUp delay-1">
        <div class="summary-card mc-card">
          <div class="sc-icon">📝</div>
          <div class="sc-body">
            <span class="sc-label">Total Entries</span>
            <span class="sc-value">{{ summary()?.totalEntries ?? 0 }}</span>
          </div>
        </div>
        <div class="summary-card mc-card">
          <div class="sc-icon">😊</div>
          <div class="sc-body">
            <span class="sc-label">Average Mood</span>
            <span class="sc-value">{{ summary()?.averageMoodLabel ?? '—' }}</span>
          </div>
        </div>
        <div class="summary-card mc-card">
          <div class="sc-icon">🔥</div>
          <div class="sc-body">
            <span class="sc-label">Current Streak</span>
            <span class="sc-value">{{ streak()?.currentStreak ?? 0 }}<span class="sc-unit">d</span></span>
          </div>
        </div>
        <div class="summary-card mc-card">
          <div class="sc-icon">🏆</div>
          <div class="sc-body">
            <span class="sc-label">Best Streak</span>
            <span class="sc-value">{{ streak()?.longestStreak ?? 0 }}<span class="sc-unit">d</span></span>
          </div>
        </div>
        <div class="summary-card mc-card">
          <div class="sc-icon">❤️</div>
          <div class="sc-body">
            <span class="sc-label">Top Mood</span>
            <span class="sc-value small">{{ summary()?.mostUsedMood ?? '—' }}</span>
          </div>
        </div>
      </div>

      <!-- Trend Chart -->
      <div class="trend-card mc-card animate-fadeInUp delay-2">
        <div class="card-header">
          <h3>Mood Trend</h3>
          <span class="trend-period">Last {{ activePeriod() }} days</span>
        </div>

        <div class="chart-loading" *ngIf="trendLoading()">
          <div class="skeleton chart-skel"></div>
        </div>

        <div class="chart-area" *ngIf="!trendLoading()">
          <!-- SVG Trend Chart -->
          <svg class="trend-svg" viewBox="0 0 700 200" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <!-- Grid lines -->
            <line *ngFor="let y of gridYs" [attr.x1]="40" [attr.y1]="y" [attr.x2]="680" [attr.y2]="y"
              stroke="rgba(255,255,255,0.04)" stroke-width="1"/>

            <!-- Y-axis labels -->
            <text *ngFor="let l of yLabels" [attr.x]="32" [attr.y]="l.y + 4" fill="rgba(255,255,255,0.3)"
              font-size="10" text-anchor="end" font-family="DM Mono, monospace">{{ l.label }}</text>

            <!-- Area fill -->
            <path *ngIf="trend().length > 0"
              [attr.d]="areaPath()"
              fill="url(#areaGrad)"
              opacity="0.3"/>

            <!-- Line -->
            <path *ngIf="trend().length > 0"
              [attr.d]="linePath()"
              fill="none"
              stroke="url(#lineGrad)"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"/>

            <!-- Dots -->
            <g *ngFor="let pt of trendPoints(); let i = index">
              <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="5"
                fill="var(--bg-card)" stroke="var(--accent-gold)" stroke-width="2"/>
              <text [attr.x]="pt.x" [attr.y]="pt.y - 12"
                fill="rgba(255,255,255,0.6)" font-size="14" text-anchor="middle">{{ pt.emoji }}</text>
            </g>

            <!-- X-axis date labels -->
            <text *ngFor="let pt of trendPointsLabeled()"
              [attr.x]="pt.x" y="195" fill="rgba(255,255,255,0.3)"
              font-size="9" text-anchor="middle" font-family="DM Mono, monospace">{{ pt.label }}</text>

            <!-- Gradients -->
            <defs>
              <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stop-color="#9a7a4a"/>
                <stop offset="100%" stop-color="#c9a96e"/>
              </linearGradient>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#c9a96e" stop-opacity="0.6"/>
                <stop offset="100%" stop-color="#c9a96e" stop-opacity="0"/>
              </linearGradient>
            </defs>
          </svg>

          <!-- No data -->
          <div class="no-data" *ngIf="trend().length === 0">
            <span>📉</span>
            <p>Not enough data for this period. Keep logging your mood!</p>
          </div>
        </div>
      </div>

      <!-- Mood Distribution -->
      <div class="distribution-card mc-card animate-fadeInUp delay-3" *ngIf="trend().length > 0">
        <div class="card-header">
          <h3>Mood Distribution</h3>
          <span class="trend-period">{{ activePeriod() }} days</span>
        </div>
        <div class="distribution-list">
          <div class="dist-item" *ngFor="let d of moodDistribution()">
            <span class="dist-emoji">{{ d.emoji }}</span>
            <span class="dist-name">{{ d.name }}</span>
            <div class="dist-bar-wrap">
              <div class="dist-bar" [style.width]="d.pct + '%'"></div>
            </div>
            <span class="dist-count">{{ d.count }}</span>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="recap-cta mc-card animate-fadeInUp delay-4">
        <div class="cta-left">
          <span class="cta-icon">🌟</span>
          <div>
            <strong>Your {{ currentYear }} Recap is ready</strong>
            <p>See your full emotional year — best months, personality type, and more.</p>
          </div>
        </div>
        <a routerLink="/stats/recap" class="btn btn-primary">View Recap →</a>
      </div>
    </div>
  `,
  styles: [`
    .overview-page { max-width: 1000px; }
    .page-top { margin-bottom: var(--space-8); }
    .page-top h1 { font-family: var(--font-display); font-size: clamp(1.8rem, 3vw, 2.4rem); margin-bottom: 8px; }
    .page-sub { color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 20px; }

    .period-tabs { display: flex; gap: 8px; }
    .period-btn {
      background: var(--bg-elevated); border: 1px solid var(--border-subtle);
      color: var(--text-secondary); font-size: 0.8rem; padding: 6px 16px;
      border-radius: var(--radius-full); cursor: pointer; transition: all var(--transition-fast);
      font-family: var(--font-body);
      &:hover { border-color: var(--border-accent); color: var(--accent-gold); }
      &.active { background: var(--accent-glow); border-color: var(--border-gold); color: var(--accent-gold); font-weight: 600; }
    }

    .summary-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: var(--space-4); margin-bottom: var(--space-6); }
    .summary-card {
      display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 20px 12px;
    }
    .sc-icon  { font-size: 1.4rem; }
    .sc-body  { display: flex; flex-direction: column; gap: 3px; }
    .sc-label { font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
    .sc-value { font-family: var(--font-display); font-size: 1.3rem; font-weight: 700; color: var(--text-primary); &.small { font-size: 0.85rem; } }
    .sc-unit  { font-size: 0.8rem; color: var(--text-secondary); margin-left: 2px; }

    /* Trend Chart */
    .trend-card  { margin-bottom: var(--space-6); }
    .card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
    .card-header h3 { font-family: var(--font-display); font-size: 1.1rem; }
    .trend-period { font-size: 0.78rem; color: var(--text-muted); font-family: var(--font-mono); }

    .chart-loading { height: 220px; display: flex; align-items: center; justify-content: center; }
    .chart-skel    { width: 100%; height: 180px; }
    .chart-area    { position: relative; }
    .trend-svg     { width: 100%; height: 220px; overflow: visible; }
    .no-data { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 60px 0; color: var(--text-muted); font-size: 0.9rem; span { font-size: 2rem; } }

    /* Distribution */
    .distribution-card { margin-bottom: var(--space-6); }
    .distribution-list { display: flex; flex-direction: column; gap: 12px; }
    .dist-item { display: flex; align-items: center; gap: 12px; }
    .dist-emoji { font-size: 1.2rem; width: 28px; text-align: center; flex-shrink: 0; }
    .dist-name  { font-size: 0.82rem; color: var(--text-secondary); width: 90px; flex-shrink: 0; }
    .dist-bar-wrap { flex: 1; height: 6px; background: var(--bg-elevated); border-radius: var(--radius-full); overflow: hidden; }
    .dist-bar { height: 100%; background: linear-gradient(90deg, var(--accent-gold-dk), var(--accent-gold)); border-radius: var(--radius-full); transition: width 0.8s cubic-bezier(0.4,0,0.2,1); }
    .dist-count { font-size: 0.75rem; color: var(--text-muted); font-family: var(--font-mono); width: 24px; text-align: right; }

    /* CTA */
    .recap-cta { display: flex; align-items: center; justify-content: space-between; gap: var(--space-5); background: linear-gradient(135deg, rgba(201,169,110,0.06), rgba(94,207,190,0.04)); }
    .cta-left  { display: flex; align-items: center; gap: 16px;
      .cta-icon { font-size: 2rem; flex-shrink: 0; }
      strong { display: block; font-size: 0.95rem; color: var(--text-primary); margin-bottom: 3px; }
      p      { font-size: 0.82rem; color: var(--text-secondary); }
    }

    @media (max-width: 900px) { .summary-row { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 600px) { .summary-row { grid-template-columns: repeat(2, 1fr); } .recap-cta { flex-direction: column; align-items: flex-start; .btn { width: 100%; } } }
  `]
})
export class OverviewComponent implements OnInit {
  private statsSvc = inject(StatsService);

  activePeriod  = signal(7);
  trendLoading  = signal(true);
  summary       = signal<MoodSummaryResponse | null>(null);
  streak        = signal<StreakResponse | null>(null);
  trend         = signal<MoodTrendPointResponse[]>([]);
  currentYear   = new Date().getFullYear();

  periods = [
    { label: '7 days',  days: 7  },
    { label: '14 days', days: 14 },
    { label: '30 days', days: 30 },
  ];

  // Chart constants
  private readonly CHART_X_START = 40;
  private readonly CHART_X_END   = 680;
  private readonly CHART_Y_MIN   = 20;
  private readonly CHART_Y_MAX   = 175;

  gridYs   = [20, 55, 90, 125, 160];
  yLabels  = [
    { y: 20,  label: '5' },
    { y: 55,  label: '4' },
    { y: 90,  label: '3' },
    { y: 125, label: '2' },
    { y: 160, label: '1' },
  ];

  ngOnInit() {
    this.loadAll();
  }

  setPeriod(days: number) {
    this.activePeriod.set(days);
    this.loadTrend(days);
  }

  loadAll() {
    this.statsSvc.getSummary().subscribe({ next: r => this.summary.set(r.data) });
    this.statsSvc.getStreak().subscribe({ next: r => this.streak.set(r.data) });
    this.loadTrend(this.activePeriod());
  }

  loadTrend(days: number) {
    this.trendLoading.set(true);
    this.statsSvc.getTrend(days).subscribe({
      next: r => { this.trend.set(r.data); this.trendLoading.set(false); },
      error: () => this.trendLoading.set(false)
    });
  }

  private xForIndex(i: number, total: number): number {
    if (total <= 1) return (this.CHART_X_START + this.CHART_X_END) / 2;
    return this.CHART_X_START + (i / (total - 1)) * (this.CHART_X_END - this.CHART_X_START);
  }

  private yForScore(score: number): number {
    // score 1..5 maps to CHART_Y_MAX..CHART_Y_MIN
    return this.CHART_Y_MAX - ((score - 1) / 4) * (this.CHART_Y_MAX - this.CHART_Y_MIN);
  }

  trendPoints() {
    const data  = this.trend();
    return data.map((pt, i) => ({
      x: this.xForIndex(i, data.length),
      y: this.yForScore(pt.moodScore),
      emoji: pt.emojiSymbol,
    }));
  }

  trendPointsLabeled() {
    const data = this.trend();
    return data.map((pt, i) => ({
      x: this.xForIndex(i, data.length),
      label: new Date(pt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    })).filter((_, i) => data.length <= 14 || i % Math.ceil(data.length / 10) === 0);
  }

  linePath(): string {
    const pts = this.trendPoints();
    if (!pts.length) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }

  areaPath(): string {
    const pts = this.trendPoints();
    if (!pts.length) return '';
    const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const last = pts[pts.length - 1];
    const first = pts[0];
    return `${line} L ${last.x} ${this.CHART_Y_MAX + 10} L ${first.x} ${this.CHART_Y_MAX + 10} Z`;
  }

  moodDistribution() {
    const data = this.trend();
    const map: Record<string, { emoji: string; name: string; count: number }> = {};
    data.forEach(pt => {
      const key = pt.emojiSymbol;
      if (!map[key]) map[key] = { emoji: pt.emojiSymbol, name: pt.emojiDescription, count: 0 };
      map[key].count++;
    });
    const total = data.length;
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .map(d => ({ ...d, pct: total > 0 ? Math.round((d.count / total) * 100) : 0 }));
  }
}
