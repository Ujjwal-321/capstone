import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { UserService, ToastService } from '../../core/services/api.services';
import { AuthService } from '../../core/services/auth.service';
import { UserProfileResponse } from '../../core/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [ReactiveFormsModule],
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

  initials = computed(() => {
    const name = this.profile()?.fullName ?? 'U';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
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
