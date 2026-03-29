import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { MoodService, StatsService, EmojiService, ToastService } from '../../core/services/api.services';
import { MoodEntryResponse, MoodSummaryResponse, StreakResponse, EmojiResponse } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, ReactiveFormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private auth     = inject(AuthService);
  private moodSvc  = inject(MoodService);
  private statsSvc = inject(StatsService);
  private emojiSvc = inject(EmojiService);
  private toast    = inject(ToastService);
  private fb       = inject(FormBuilder);

  userName = computed(() => this.auth.user()?.fullName?.split(' ')[0] ?? 'there');
  today    = new Date();

  summaryLoading = signal(true);
  streakLoading  = signal(true);
  recentLoading  = signal(true);
  emojisLoading  = signal(true);
  logging        = signal(false);

  summary       = signal<MoodSummaryResponse | null>(null);
  streak        = signal<StreakResponse | null>(null);
  todayEntry    = signal<MoodEntryResponse | null>(null);
  recentEntries = signal<MoodEntryResponse[]>([]);
  emojis        = signal<EmojiResponse[]>([]);

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

  scores = [1, 2, 3, 4, 5];

  ngOnInit() { this.loadAll(); }

  logFormInvalid(f: string) {
    const c = this.logForm.get(f);
    return c?.invalid && c?.touched;
  }

  loadAll() {
    this.statsSvc.getSummary().subscribe({
      next: r => { this.summary.set(r.data); this.summaryLoading.set(false); },
      error: () => this.summaryLoading.set(false)
    });
    this.statsSvc.getStreak().subscribe({
      next: r => { this.streak.set(r.data); this.streakLoading.set(false); },
      error: () => this.streakLoading.set(false)
    });
    this.moodSvc.getTodayEntry().subscribe({
      next: r => this.todayEntry.set(r.data),
      error: () => {}
    });
    this.moodSvc.getHistory({ page: 0, size: 6 }).subscribe({
      next: r => { this.recentEntries.set(r.data.content); this.recentLoading.set(false); },
      error: () => this.recentLoading.set(false)
    });
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
