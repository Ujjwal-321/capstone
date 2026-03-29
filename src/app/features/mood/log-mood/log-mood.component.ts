import { Component, OnInit, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { MoodService, EmojiService, ToastService } from '../../../core/services/api.services';
import { EmojiResponse } from '../../../core/models';

@Component({
  selector: 'app-log-mood',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './log-mood.component.html',
  styleUrl: './log-mood.component.scss'
})
export class LogMoodComponent implements OnInit {
  private moodSvc  = inject(MoodService);
  private emojiSvc = inject(EmojiService);
  private toast    = inject(ToastService);
  private router   = inject(Router);
  private fb       = inject(FormBuilder);

  loading       = signal(true);
  submitting    = signal(false);
  emojis        = signal<EmojiResponse[]>([]);
  selectedEmoji = signal<EmojiResponse | null>(null);
  today         = new Date();
  scores        = [1, 2, 3, 4, 5];

  todayStr = () => new Date().toISOString().split('T')[0];

  form = this.fb.group({
    emojiId:   [null as number | null, Validators.required],
    entryText: ['', [Validators.required, Validators.maxLength(255)]],
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

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);

    const payload = { ...this.form.value, entryDate: this.todayStr() } as any;

    this.moodSvc.createEntry(payload).subscribe({
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
