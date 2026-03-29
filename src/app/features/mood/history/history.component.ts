import { Component, OnInit, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { MoodService, EmojiService } from '../../../core/services/api.services';
import { MoodEntryResponse, EmojiResponse } from '../../../core/models';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss'
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
  scores        = [1, 2, 3, 4, 5];
  pageSize      = 10;

  filterForm = this.fb.group({
    startDate: [''],
    endDate:   [''],
    emojiId:   [''],
    keyword:   [''],
  });

  pageNumbers(): number[] {
    const total = this.totalPages();
    const cur   = this.currentPage();
    const pages: number[] = [];
    for (let i = Math.max(0, cur - 2); i <= Math.min(total - 1, cur + 2); i++) pages.push(i);
    return pages;
  }

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
  clearFilters()  { this.filterForm.reset(); this.fetchPage(0); }
  goToPage(p: number) { this.fetchPage(p); }
}
