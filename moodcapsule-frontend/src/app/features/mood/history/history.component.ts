import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MoodService, EmojiService } from '../../../core/services/api.services';
import { MoodEntryResponse, EmojiResponse } from '../../../core/models';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="history-page">
      <div class="page-top animate-fadeInUp">
        <h1>Mood History</h1>
        <p class="page-sub">Browse, search, and reflect on your emotional journey.</p>
      </div>

      <div class="filters-bar mc-card animate-fadeInUp delay-1" [formGroup]="filterForm">
        <div class="filter-group">
          <label class="form-label">From</label>
          <input type="date" class="form-control filter-input" formControlName="startDate" />
        </div>

        <div class="filter-group">
          <label class="form-label">To</label>
          <input type="date" class="form-control filter-input" formControlName="endDate" />
        </div>

        <div class="filter-group">
          <label class="form-label">Mood</label>
          <select class="form-control filter-input" formControlName="emojiId">
            <option value="">All moods</option>
            <option *ngFor="let e of emojis()" [value]="e.emojiId">
              {{ e.symbol }} {{ e.description }}
            </option>
          </select>
        </div>

        <div class="filter-group flex-1">
          <label class="form-label">Search</label>
          <input type="text" class="form-control filter-input" formControlName="keyword" placeholder="Search notes…" />
        </div>

        <div class="filter-actions">
          <button class="btn btn-primary" (click)="applyFilters()">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            Search
          </button>
          <button class="btn btn-ghost" (click)="clearFilters()">Clear</button>
        </div>
      </div>

      <div class="results-header animate-fadeInUp delay-2" *ngIf="!loading()">
        <span class="results-count">{{ totalElements() }} entries found</span>
        <span class="results-pages" *ngIf="totalPages() > 1">
          Page {{ currentPage() + 1 }} of {{ totalPages() }}
        </span>
      </div>

      <div class="entry-list" *ngIf="loading()">
        <div class="entry-card-skeleton mc-card" *ngFor="let i of [1,2,3,4,5]">
          <div class="skeleton sk-emoji-sm"></div>
          <div class="sk-body">
            <div class="skeleton sk-title"></div>
            <div class="skeleton sk-text"></div>
          </div>
        </div>
      </div>

      <div class="entry-list animate-fadeInUp delay-3" *ngIf="!loading()">
        <div class="entry-card mc-card" *ngFor="let e of entries(); let i = index"
             [style.animation-delay]="(i * 0.05) + 's'">
          <div class="entry-emoji">{{ e.emojiSymbol }}</div>

          <div class="entry-body">
            <div class="entry-top">
              <div class="entry-mood-info">
                <span class="entry-mood-name">{{ e.emojiDescription }}</span>
                <div class="entry-score-dots">
                  <span *ngFor="let d of [1,2,3,4,5]" class="edot" [class.on]="d <= e.moodScore"></span>
                </div>
              </div>

              <div class="entry-date-block">
                <span class="entry-date">{{ e.entryDate | date:'MMMM d, y' }}</span>
                <span class="entry-time">{{ e.createdAt | date:'h:mm a' }}</span>
              </div>
            </div>

            <p class="entry-text">{{ e.entryText }}</p>

            <div class="entry-insight insight-animate" *ngIf="e.insightText">
              <span class="entry-insight-label">AI Insight</span>
              <p class="entry-insight-text">💡 {{ e.insightText }}</p>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="entries().length === 0">
          <span class="empty-icon">🔍</span>
          <h3>No entries found</h3>
          <p>Try adjusting your filters or <a routerLink="/mood/log" class="text-gold">log a new mood</a>.</p>
        </div>
      </div>

      <div class="pagination" *ngIf="!loading() && totalPages() > 1">
        <button class="page-btn" [disabled]="currentPage() === 0" (click)="goToPage(currentPage() - 1)">‹ Prev</button>
        <button class="page-btn" *ngFor="let p of pageNumbers()"
          [class.active]="p === currentPage()"
          (click)="goToPage(p)">{{ p + 1 }}</button>
        <button class="page-btn" [disabled]="currentPage() === totalPages() - 1" (click)="goToPage(currentPage() + 1)">Next ›</button>
      </div>
    </div>
  `,
  styles: [`
    .history-page { max-width: 900px; }
    .page-top { margin-bottom: var(--space-6); }
    .page-top h1 { font-family: var(--font-display); font-size: clamp(1.8rem, 3vw, 2.4rem); margin-bottom: 8px; }
    .page-sub { color: var(--text-secondary); font-size: 0.95rem; }

    .filters-bar {
      display: flex; flex-wrap: wrap; gap: var(--space-4); align-items: flex-end;
      margin-bottom: var(--space-6);
    }

    .filter-group { display: flex; flex-direction: column; gap: 6px; }
    .filter-input { min-width: 140px; }
    .flex-1 { flex: 1; min-width: 160px; }
    .filter-actions { display: flex; gap: 8px; align-items: flex-end; padding-top: 22px; }

    select.form-control option { background: var(--bg-elevated); }

    .results-header {
      display: flex; justify-content: space-between; align-items: center;
      margin-bottom: var(--space-4);
    }

    .results-count { font-size: 0.85rem; color: var(--text-secondary); }
    .results-pages { font-size: 0.78rem; color: var(--text-muted); font-family: var(--font-mono); }

    .entry-list { display: flex; flex-direction: column; gap: var(--space-4); margin-bottom: var(--space-8); }

    .entry-card-skeleton { display: flex; gap: 16px; align-items: center; }
    .sk-emoji-sm { width: 50px; height: 50px; border-radius: var(--radius-md); flex-shrink: 0; }
    .sk-body { flex: 1; display: flex; flex-direction: column; gap: 8px; }
    .sk-title { height: 16px; width: 40%; border-radius: 4px; }
    .sk-text  { height: 12px; width: 80%; border-radius: 4px; }

    .entry-card {
      display: flex; gap: var(--space-5); align-items: flex-start;
      animation: fadeInUp 0.4s ease forwards; opacity: 0;
    }

    .entry-emoji { font-size: 2.2rem; flex-shrink: 0; margin-top: 2px; }
    .entry-body  { flex: 1; }

    .entry-top {
      display: flex; justify-content: space-between; align-items: flex-start;
      margin-bottom: 8px;
    }

    .entry-mood-info { display: flex; flex-direction: column; gap: 4px; }
    .entry-mood-name {
      font-family: var(--font-display); font-size: 1rem;
      color: var(--text-primary); font-weight: 600;
    }

    .entry-score-dots { display: flex; gap: 4px; }
    .edot { width: 8px; height: 8px; border-radius: 50%; background: var(--border-default); }
    .edot.on { background: var(--accent-gold); }

    .entry-date-block { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
    .entry-date { font-size: 0.8rem; color: var(--text-secondary); }
    .entry-time { font-size: 0.7rem; color: var(--text-muted); font-family: var(--font-mono); }

    .entry-text {
      font-size: 0.875rem; color: var(--text-secondary);
      line-height: 1.65;
    }

    .entry-insight {
      margin-top: 12px;
      padding: 10px 12px;
      border-left: 3px solid var(--accent-gold);
      background: rgba(201,169,110,0.06);
      border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    }

    .entry-insight-label {
      display: inline-block;
      margin-bottom: 4px;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--accent-gold);
    }

    .entry-insight-text {
      margin: 0;
      font-size: 0.82rem;
      color: var(--text-secondary);
      line-height: 1.55;
    }

    .insight-animate { animation: insightFadeIn 0.45s ease; }

    @keyframes insightFadeIn {
      from { opacity: 0; transform: translateY(8px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .empty-state { text-align: center; padding: 60px 20px; }
    .empty-state a { color: var(--accent-gold); }

    @media (max-width: 600px) {
      .filters-bar  { flex-direction: column; }
      .filter-input { min-width: unset; width: 100%; }
      .filter-group { width: 100%; }
      .entry-card   { flex-direction: column; }
      .entry-top    { flex-direction: column; gap: 8px; }
      .entry-date-block { align-items: flex-start; }
    }
  `]
})
export class HistoryComponent implements OnInit {
  private moodSvc  = inject(MoodService);
  private emojiSvc = inject(EmojiService);
  private fb       = inject(FormBuilder);

  loading       = signal(true);
  entries       = signal<MoodEntryResponse[]>([]);
  emojis        = signal<EmojiResponse[]>([]);
  totalElements = signal(0);
  totalPages    = signal(0);
  currentPage   = signal(0);
  pageSize      = 10;

  filterForm = this.fb.group({
    startDate: [''],
    endDate:   [''],
    emojiId:   [''],
    keyword:   [''],
  });

  pageNumbers = () => {
    const total = this.totalPages();
    const cur   = this.currentPage();
    const pages: number[] = [];
    const start = Math.max(0, cur - 2);
    const end   = Math.min(total - 1, cur + 2);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  };

  ngOnInit() {
    this.emojiSvc.getAll().subscribe({ next: r => this.emojis.set(r.data) });
    this.fetchPage(0);
  }

  fetchPage(page: number) {
    this.loading.set(true);
    const f = this.filterForm.value;

    this.moodSvc.getHistory({
      startDate: f.startDate || undefined,
      endDate:   f.endDate   || undefined,
      emojiId:   f.emojiId   ? +f.emojiId : undefined,
      keyword:   f.keyword   || undefined,
      page,
      size: this.pageSize
    }).subscribe({
      next: r => {
        this.entries.set(r.data.content);
        this.totalElements.set(r.data.totalElements);
        this.totalPages.set(r.data.totalPages);
        this.currentPage.set(page);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  applyFilters() { this.fetchPage(0); }

  clearFilters() {
    this.filterForm.reset();
    this.fetchPage(0);
  }

  goToPage(p: number) { this.fetchPage(p); }
}