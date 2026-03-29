import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { StatsService } from '../../../core/services/api.services';
import { MoodSummaryResponse, MoodTrendPointResponse, StreakResponse } from '../../../core/models';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.scss'
})
export class OverviewComponent implements OnInit {
  private statsSvc = inject(StatsService);

  activePeriod = signal(7);
  trendLoading = signal(true);
  summary      = signal<MoodSummaryResponse | null>(null);
  streak       = signal<StreakResponse | null>(null);
  trend        = signal<MoodTrendPointResponse[]>([]);
  currentYear  = new Date().getFullYear();

  periods = [
    { label: '7 days',  days: 7  },
    { label: '14 days', days: 14 },
    { label: '30 days', days: 30 },
  ];

  private readonly X_START = 40;
  private readonly X_END   = 680;
  private readonly Y_MIN   = 20;
  private readonly Y_MAX   = 175;

  gridYs  = [20, 55, 90, 125, 160];
  yLabels = [
    { y: 20,  label: '5' },
    { y: 55,  label: '4' },
    { y: 90,  label: '3' },
    { y: 125, label: '2' },
    { y: 160, label: '1' },
  ];

  ngOnInit() { this.loadAll(); }

  setPeriod(days: number) { this.activePeriod.set(days); this.loadTrend(days); }

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

  private xFor(i: number, total: number): number {
    if (total <= 1) return (this.X_START + this.X_END) / 2;
    return this.X_START + (i / (total - 1)) * (this.X_END - this.X_START);
  }

  private yFor(score: number): number {
    return this.Y_MAX - ((score - 1) / 4) * (this.Y_MAX - this.Y_MIN);
  }

  trendPoints() {
    return this.trend().map((pt, i) => ({
      x: this.xFor(i, this.trend().length),
      y: this.yFor(pt.moodScore),
      emoji: pt.emojiSymbol,
    }));
  }

  trendLabels() {
    const data = this.trend();
    return data
      .map((pt, i) => ({
        x: this.xFor(i, data.length),
        label: new Date(pt.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      }))
      .filter((_, i) => data.length <= 14 || i % Math.ceil(data.length / 10) === 0);
  }

  linePath(): string {
    const pts = this.trendPoints();
    if (!pts.length) return '';
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }

  areaPath(): string {
    const pts = this.trendPoints();
    if (!pts.length) return '';
    const line  = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const last  = pts[pts.length - 1];
    const first = pts[0];
    return `${line} L ${last.x} ${this.Y_MAX + 10} L ${first.x} ${this.Y_MAX + 10} Z`;
  }

  moodDistribution() {
    const data = this.trend();
    const map: Record<string, { emoji: string; name: string; count: number }> = {};
    data.forEach(pt => {
      if (!map[pt.emojiSymbol]) map[pt.emojiSymbol] = { emoji: pt.emojiSymbol, name: pt.emojiDescription, count: 0 };
      map[pt.emojiSymbol].count++;
    });
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .map(d => ({ ...d, pct: data.length > 0 ? Math.round((d.count / data.length) * 100) : 0 }));
  }
}
