import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormsModule } from '@angular/forms';
import { UserService, ToastService } from '../../core/services/api.services';
import { AuthService } from '../../core/services/auth.service';
import { UserProfileResponse } from '../../core/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss'
})
export class ProfileComponent implements OnInit {
  private userSvc = inject(UserService);
  private auth    = inject(AuthService);
  private toast   = inject(ToastService);
  private fb      = inject(FormBuilder);

  loading  = signal(true);
  saving   = signal(false);
  profile  = signal<UserProfileResponse | null>(null);

  // ─── MC-69 Account Deletion State Controls ───────────────────
  isGoogleUser      = signal(false);
  deleteConfirmText = signal('');
  deletePassword    = signal('');
  isDeleteLoading   = signal(false);

  initials = computed(() => {
    const name = this.profile()?.fullName ?? 'U';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  });

  avatarStyle = computed(() => {
    const url = this.profile()?.avatarUrl;
    return url ? { 'background-image': `url(${url})`, 'background-size': 'cover', 'background-position': 'center' } : {};
  });

  form = this.fb.group({
    fullName:        [''],
    avatarUrl:       [''],
    bio:             [''],
    themePreference: ['DARK'],
    reminderAllowed: [true],
    reminderTime:    [''],
  });

  ngOnInit() {
    const currentSession = this.auth.user();
    if (currentSession) {
      this.isGoogleUser.set(currentSession.authProvider === 'google');
    }

    this.userSvc.getProfile().subscribe({
      next: r => {
        this.profile.set(r.data);
        this.form.patchValue({
          fullName:        r.data.fullName,
          avatarUrl:       r.data.avatarUrl ?? '',
          bio:             r.data.bio ?? '',
          themePreference: r.data.themePreference,
          reminderAllowed: r.data.reminderAllowed,
          reminderTime:    r.data.reminderTime ?? '',
        });
        this.applyTheme(r.data.themePreference);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  // ─── MC-69 Multi-Mode Deletion Flow Action ──────────────────
  onDeleteAccount() {
    if (this.isDeleteLoading()) return;

    const payload: any = {};

    if (this.isGoogleUser()) {
      if (this.deleteConfirmText().trim() !== 'DELETE') {
        this.toast.error("Please type 'DELETE' exactly to confirm deletion.");
        return;
      }
      payload.confirmationText = this.deleteConfirmText().trim();
    } else {
      if (!this.deletePassword().trim()) {
        this.toast.error("Please enter your account password.");
        return;
      }
      payload.password = this.deletePassword().trim();
    }

    if (!confirm("Are you absolutely sure you want to permanently delete your account? This action cannot be undone.")) {
      return;
    }

    this.isDeleteLoading.set(true);

    this.userSvc.deleteAccount(payload).subscribe({
      next: () => {
        this.isDeleteLoading.set(false);
        this.toast.success('Your profile and all your emotional metrics have been deleted. Goodbye! 👋');
        this.logout();
      },
      error: err => {
        this.toast.error(err?.error?.message || 'Failed to complete profile deletion.');
        this.isDeleteLoading.set(false);
      }
    });
  }

  private applyTheme(theme: string) {
    const root = document.documentElement;
    if (theme === 'LIGHT') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
  }

  toggleReminder() {
    this.form.patchValue({ reminderAllowed: !this.form.get('reminderAllowed')?.value });
  }

  resetForm() {
    const p = this.profile();
    if (!p) return;
    this.form.patchValue({
      fullName: p.fullName, avatarUrl: p.avatarUrl ?? '', bio: p.bio ?? '',
      themePreference: p.themePreference, reminderAllowed: p.reminderAllowed, reminderTime: p.reminderTime ?? ''
    });
  }

  onSave() {
    if (this.saving()) return;
    this.saving.set(true);
    const v = this.form.value;
    this.userSvc.updateProfile({
      fullName:        v.fullName        || undefined,
      avatarUrl:       v.avatarUrl       || undefined,
      bio:             v.bio             || undefined,
      themePreference: (v.themePreference as any) || undefined,
      reminderAllowed: v.reminderAllowed ?? undefined,
      reminderTime:    v.reminderTime    || undefined,
    }).subscribe({
      next: r => {
        this.profile.set(r.data);
        this.applyTheme(r.data.themePreference);
        this.toast.success('Profile updated! ✓');
        this.saving.set(false);
      },
      error: err => {
        this.toast.error(err?.error?.message || 'Failed to update profile.');
        this.saving.set(false);
      }
    });
  }

  logout() { this.auth.logout(); }
}
