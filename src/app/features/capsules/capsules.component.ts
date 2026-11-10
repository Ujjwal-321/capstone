import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin, timer } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { ProfileStore } from '../../core/services/profile.store';
import { ToastService } from '../../core/services/toast.service';
import { Capsule } from '../../core/models';
import { daysBetween, mediumDate, todayIn } from '../../core/utils/dates';
import { errorMessage } from '../../core/utils/errors';
import { SealDialogComponent } from './seal-dialog.component';

type Stage = 'shake' | 'crack' | 'open';

/**
 * MC-67 Time Capsules on the web: countdowns for sealed capsules, opening ready ones with the
 * capsule animation, re-reading opened ones, and sealing new letters to your future self.
 * The server never sends a sealed capsule's text before its unlock date.
 */
@Component({
  selector: 'mc-capsules',
  standalone: true,
  imports: [SealDialogComponent],
  templateUrl: './capsules.component.html',
  styleUrl: './capsules.component.scss'
})
export class CapsulesComponent implements OnInit {
  private api = inject(ApiService);
  private store = inject(ProfileStore);
  private toast = inject(ToastService);

  readonly today = computed(() => todayIn(this.store.profile()?.timezone));
  readonly capsules = signal<Capsule[] | null>(null);
  readonly error = signal('');
  readonly sealing = signal(false);

  /** The capsule being opened in the full-screen overlay. */
  readonly opening = signal<Capsule | null>(null);
  readonly stage = signal<Stage>('shake');

  readonly ready = computed(() => (this.capsules() ?? []).filter(c => c.ready && !c.opened));
  readonly sealed = computed(() => (this.capsules() ?? []).filter(c => !c.ready && !c.opened)
    .sort((a, b) => a.daysLeft - b.daysLeft));
  readonly opened = computed(() => (this.capsules() ?? []).filter(c => c.opened)
    .sort((a, b) => (b.openedAt ?? '').localeCompare(a.openedAt ?? '')));

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.error.set('');
    this.api.capsules().subscribe({
      next: c => this.capsules.set(c),
      error: err => this.error.set(errorMessage(err, "Couldn't load your capsules."))
    });
  }

  open(c: Capsule): void {
    if (this.opening()) return;
    this.opening.set(c);
    this.stage.set('shake');
    // Shake while the server opens it (at least ~1s so the moment lands), then crack and reveal
    forkJoin({ capsule: this.api.openCapsule(c.capsuleId), wait: timer(1100) }).subscribe({
      next: ({ capsule }) => {
        this.opening.set(capsule);
        this.stage.set('crack');
        setTimeout(() => this.stage.set('open'), 650);
        this.capsules.update(list => (list ?? []).map(x => (x.capsuleId === capsule.capsuleId ? capsule : x)));
      },
      error: err => {
        this.opening.set(null);
        this.toast.error(errorMessage(err, "Couldn't open this capsule. Please try again."));
      }
    });
  }

  /** Re-read an opened capsule without the animation. */
  reread(c: Capsule): void {
    this.opening.set(c);
    this.stage.set('open');
  }

  closeOverlay(): void {
    if (this.stage() === 'open') this.opening.set(null);
  }

  onSealed(c: Capsule): void {
    this.sealing.set(false);
    this.capsules.update(list => [c, ...(list ?? [])]);
    this.toast.success(`Sealed 🔒 It opens on ${mediumDate(c.unlockDate)}.`);
  }

  /** How far through the wait a sealed capsule is (0–100). */
  progress(c: Capsule): number {
    const start = c.sealedAt.slice(0, 10);
    const total = daysBetween(start, c.unlockDate);
    if (total <= 0) return 100;
    const done = daysBetween(start, this.today());
    return Math.max(3, Math.min(100, (done / total) * 100));
  }

  countdown(days: number): string {
    if (days >= 365) {
      const y = Math.floor(days / 365);
      return `${y} year${y === 1 ? '' : 's'}${days % 365 > 30 ? '+' : ''}`;
    }
    if (days >= 60) return `${Math.round(days / 30)} months`;
    return `${days} day${days === 1 ? '' : 's'}`;
  }

  date = mediumDate;
  writtenOn(c: Capsule): string {
    return mediumDate(c.sealedAt.slice(0, 10));
  }
}
