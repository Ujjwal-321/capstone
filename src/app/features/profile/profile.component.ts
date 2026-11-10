import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ProfileStore } from '../../core/services/profile.store';
import { ThemeService } from '../../core/services/theme.service';
import { ToastService } from '../../core/services/toast.service';
import { Place, ThemePreference } from '../../core/models';
import { AVATAR_CHOICES, avatarEmoji, isImageAvatar } from '../../core/utils/avatar';
import { browserZone, clockTime } from '../../core/utils/dates';
import { errorMessage } from '../../core/utils/errors';
import { environment } from '../../../environments/environment';

const MAX_CUSTOM_PLACES = 10;

/** Profile & your data: name, avatar, bio, theme, time zone, places, export, privacy, delete account. */
@Component({
  selector: 'mc-profile',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private toast = inject(ToastService);
  readonly store = inject(ProfileStore);
  readonly theme = inject(ThemeService);

  readonly avatars = AVATAR_CHOICES;
  readonly privacyUrl = environment.privacyUrl;
  readonly termsUrl = environment.termsUrl;
  readonly browserZone = browserZone();
  readonly zones: string[] = (Intl as any).supportedValuesOf?.('timeZone') ?? [browserZone()];
  readonly themes: { key: ThemePreference; label: string }[] = [
    { key: 'LIGHT', label: '☀️ Light' }, { key: 'DARK', label: '🌙 Dark' }, { key: 'SYSTEM', label: '💻 System' }
  ];

  readonly profile = this.store.profile;
  readonly avatar = computed(() => avatarEmoji(this.profile()?.avatarUrl));
  readonly avatarImage = computed(() => (isImageAvatar(this.profile()?.avatarUrl) ? this.profile()?.avatarUrl ?? null : null));
  readonly reminder = computed(() => {
    const p = this.profile();
    if (!p) return '';
    return p.reminderAllowed && p.reminderTime ? `On, at ${clockTime(p.reminderTime)}` : 'Off';
  });

  // Edit form
  fullName = '';
  bio = '';
  readonly pickedAvatar = signal<string>('');
  readonly savingProfile = signal(false);
  zone = '';
  readonly savingZone = signal(false);

  // Places
  readonly places = signal<Place[] | null>(null);
  newPlaceName = '';
  newPlaceIcon = '📍';
  readonly addingPlace = signal(false);
  readonly placeIcons = ['📍', '📚', '☕', '🏖️', '🛒', '🎵', '⛪', '🏥', '🍽️', '🎮', '🚗', '✈️'];
  readonly presets = computed(() => (this.places() ?? []).filter(p => p.preset));
  readonly custom = computed(() => (this.places() ?? []).filter(p => !p.preset && !p.archived));
  readonly maxCustom = MAX_CUSTOM_PLACES;

  // Data
  readonly exporting = signal(false);
  readonly deleting = signal(false);
  readonly showDelete = signal(false);
  deletePassword = '';
  deleteConfirm = '';
  readonly deleteError = signal('');

  constructor() {
    // Fill the form once the profile arrives
    effect(() => {
      const p = this.profile();
      if (p && !this.fullName) {
        this.fullName = p.fullName;
        this.bio = p.bio ?? '';
        this.pickedAvatar.set(avatarEmoji(p.avatarUrl));
        this.zone = p.timezone ?? this.browserZone;
      }
    });
  }

  ngOnInit(): void {
    if (!this.profile()) this.store.load();
    this.loadPlaces();
  }

  // ─── Profile ──────────────────────────────────────────────
  saveProfile(): void {
    const name = this.fullName.trim();
    if (!name) {
      this.toast.error('Your name can\'t be empty.');
      return;
    }
    this.savingProfile.set(true);
    const current = this.profile()?.avatarUrl;
    const avatarChanged = this.pickedAvatar() !== avatarEmoji(current);
    this.store.save({
      fullName: name,
      bio: this.bio.trim(),
      ...(avatarChanged || !isImageAvatar(current) ? { avatarUrl: this.pickedAvatar() } : {})
    }).subscribe({
      next: () => { this.savingProfile.set(false); this.toast.success('Profile saved ✨'); },
      error: err => { this.savingProfile.set(false); this.toast.error(errorMessage(err)); }
    });
  }

  setTheme(t: ThemePreference): void {
    this.theme.set(t);
    this.store.save({ themePreference: t }).subscribe({ error: err => this.toast.error(errorMessage(err)) });
  }

  saveZone(zone = this.zone): void {
    this.zone = zone;
    this.savingZone.set(true);
    this.store.save({ timezone: zone }).subscribe({
      next: () => { this.savingZone.set(false); this.toast.success(`Time zone set to ${zone}`); },
      error: err => { this.savingZone.set(false); this.toast.error(errorMessage(err)); }
    });
  }

  // ─── Places ───────────────────────────────────────────────
  loadPlaces(): void {
    this.api.places(false).subscribe({ next: p => this.places.set(p), error: () => this.places.set([]) });
  }

  addPlace(): void {
    const name = this.newPlaceName.trim();
    if (!name || this.addingPlace()) return;
    this.addingPlace.set(true);
    this.api.addPlace(name, this.newPlaceIcon).subscribe({
      next: p => {
        this.places.update(list => [...(list ?? []).filter(x => x.placeId !== p.placeId), p]);
        this.newPlaceName = '';
        this.addingPlace.set(false);
        this.toast.success(`${p.icon} ${p.name} added`);
      },
      error: err => { this.addingPlace.set(false); this.toast.error(errorMessage(err)); }
    });
  }

  archivePlace(p: Place): void {
    this.api.archivePlace(p.placeId).subscribe({
      next: () => {
        this.places.update(list => (list ?? []).filter(x => x.placeId !== p.placeId));
        this.toast.show(`${p.icon} ${p.name} hidden. Old moments keep their label.`);
      },
      error: err => this.toast.error(errorMessage(err))
    });
  }

  // ─── Your data ────────────────────────────────────────────
  exportCsv(): void {
    this.exporting.set(true);
    this.api.exportCsv().subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `moodcapsule-export-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        this.exporting.set(false);
      },
      error: err => { this.exporting.set(false); this.toast.error(errorMessage(err, "Couldn't export your data.")); }
    });
  }

  deleteAccount(): void {
    if (this.deleteConfirm !== 'DELETE' || !this.deletePassword || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set('');
    this.api.deleteMe(this.deletePassword).subscribe({
      next: () => {
        this.store.clear();
        this.auth.forget();
        this.router.navigate(['/auth/login'], { queryParams: { deleted: 1 } });
      },
      error: err => {
        this.deleting.set(false);
        this.deleteError.set(errorMessage(err, "Couldn't delete the account."));
      }
    });
  }

  closeDelete(): void {
    this.showDelete.set(false);
    this.deletePassword = '';
    this.deleteConfirm = '';
    this.deleteError.set('');
  }
}
