import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { UserService, ToastService } from '../../core/services/api.services';
import { AuthService } from '../../core/services/auth.service';
import { UserProfileResponse } from '../../core/models';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="profile-page">
      <div class="page-top animate-fadeInUp">
        <h1>Profile & Settings</h1>
        <p class="page-sub">Manage your account and preferences.</p>
      </div>

      <div class="profile-loading" *ngIf="loading()">
        <div class="spinner"></div>
      </div>

      <div class="profile-layout animate-fadeInUp delay-1" *ngIf="!loading() && profile()">

        <!-- Left: Avatar & Info -->
        <div class="profile-sidebar">
          <div class="avatar-card mc-card">
          <div class="big-avatar-wrapper">
  <img
    *ngIf="profile()?.avatarUrl; else initialsAvatar"
    [src]="profile()?.avatarUrl"
    alt="Profile Avatar"
    class="big-avatar-image"
    (error)="onAvatarError($event)"
  />

  <ng-template #initialsAvatar>
    <div class="big-avatar">{{ initials() }}</div>
  </ng-template>
</div>
            <div class="profile-name">{{ profile()!.fullName }}</div>
            <div class="profile-email">{{ profile()!.email }}</div>
            <div class="profile-badges">
              <span class="badge badge-gold">{{ profile()!.role }}</span>
              <span class="badge badge-teal" *ngIf="profile()!.emailVerified">✓ Verified</span>
            </div>
            <p class="profile-bio" *ngIf="profile()!.bio">{{ profile()!.bio }}</p>
          </div>
        </div>

        <!-- Right: Edit Form -->
        <div class="profile-main">
          <div class="mc-card form-card">
            <h3>Personal Information</h3>
            <form [formGroup]="form" (ngSubmit)="onSave()">

              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Full Name</label>
                  <input class="form-control" type="text" formControlName="fullName" placeholder="Jane Doe" />
                </div>
                <div class="form-group">
                  <label class="form-label">Avatar URL</label>
                  <input class="form-control" type="url" formControlName="avatarUrl" placeholder="https://…" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Bio</label>
                <textarea class="form-control" formControlName="bio" rows="3"
                  placeholder="Tell something about yourself…" maxlength="255"></textarea>
              </div>

              <div class="divider"></div>
              <h4 class="section-sub">Preferences</h4>

              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Theme</label>
                  <select class="form-control" formControlName="themePreference">
                    <option value="DARK">Dark (Recommended)</option>
                    <option value="LIGHT">Light</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Reminder Time</label>
                  <input class="form-control" type="time" formControlName="reminderTime" />
                </div>
              </div>

              <div class="form-group reminder-toggle">
                <label class="toggle-row">
                  <span class="toggle-label">
                    <strong>Daily Reminder</strong>
                    <span class="toggle-hint">Get reminded to log your mood</span>
                  </span>
                  <div class="toggle-switch" [class.on]="form.get('reminderAllowed')?.value" (click)="toggleReminder()">
                    <div class="toggle-thumb"></div>
                  </div>
                </label>
              </div>

              <div class="form-actions">
                <button type="submit" class="btn btn-primary" [disabled]="saving()">
                  <span class="spinner spinner-sm" *ngIf="saving()"></span>
                  <span *ngIf="!saving()">Save Changes</span>
                </button>
                <button type="button" class="btn btn-ghost" (click)="resetForm()">Reset</button>
              </div>
            </form>
          </div>

          <!-- Danger Zone -->
          <div class="mc-card danger-card">
            <h3>Account Actions</h3>
            <div class="danger-row">
              <div class="danger-info">
                <strong>Sign Out</strong>
                <span>Log out from all devices on this browser.</span>
              </div>
              <button class="btn btn-danger" (click)="logout()">Sign Out</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-page { max-width: 960px; }
    .page-top { margin-bottom: var(--space-8); }
    .page-top h1 { font-family: var(--font-display); font-size: clamp(1.8rem, 3vw, 2.4rem); margin-bottom: 8px; }
    .page-sub { color: var(--text-secondary); font-size: 0.95rem; }
    .profile-loading { display: flex; justify-content: center; padding: 80px; }

    .profile-layout { display: grid; grid-template-columns: 260px 1fr; gap: var(--space-6); }

    /* Sidebar */
    .profile-sidebar {}
    .avatar-card { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; }
    .big-avatar {
      width: 80px; height: 80px; border-radius: 50%;
      background: linear-gradient(135deg, var(--accent-gold-dk), var(--accent-gold));
      display: flex; align-items: center; justify-content: center;
      font-family: var(--font-display); font-size: 2rem; font-weight: 700;
      color: var(--bg-base); border: 3px solid rgba(201,169,110,0.3);
      box-shadow: 0 0 24px rgba(201,169,110,0.2);
    }
    .profile-name  { font-family: var(--font-display); font-size: 1.1rem; font-weight: 600; color: var(--text-primary); }
    .profile-email { font-size: 0.8rem; color: var(--text-muted); }
    .profile-badges { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; }
    .profile-bio { font-size: 0.82rem; color: var(--text-secondary); line-height: 1.6; text-align: center; }

    /* Main Form */
    .form-card { margin-bottom: var(--space-5);
      h3 { font-family: var(--font-display); font-size: 1.1rem; color: var(--text-primary); margin-bottom: 24px; }
    }
    .section-sub { font-size: 0.85rem; color: var(--text-secondary); font-family: var(--font-body); font-weight: 600; margin-bottom: 16px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-5); }
    .form-actions { display: flex; gap: var(--space-3); justify-content: flex-end; margin-top: var(--space-4); }

    select.form-control option { background: var(--bg-elevated); }

    /*Avatar Image*/
    .big-avatar-wrapper { width: 80px; height: 80px; border-radius: 50%; overflow: hidden; }
    .big-avatar-image { width: 100%; height: 100%; object-fit: cover;
    border: 3px solid rgba(201,169,110,0.3);
  box-shadow: 0 0 24px rgba(201,169,110,0.2); }
    /* Toggle */
    .reminder-toggle { margin-top: 8px; }
    .toggle-row { display: flex; align-items: center; justify-content: space-between; cursor: pointer; }
    .toggle-label { display: flex; flex-direction: column; gap: 3px;
      strong { font-size: 0.875rem; color: var(--text-primary); }
    }
    .toggle-hint { font-size: 0.78rem; color: var(--text-muted); }
    .toggle-switch {
      width: 44px; height: 24px; border-radius: var(--radius-full);
      background: var(--bg-overlay); border: 1px solid var(--border-default);
      position: relative; transition: all var(--transition-base); cursor: pointer;
      &.on { background: var(--accent-gold); border-color: var(--accent-gold); }
    }
    .toggle-thumb {
      width: 18px; height: 18px; border-radius: 50%; background: var(--text-muted);
      position: absolute; top: 2px; left: 2px; transition: all var(--transition-base);
      .on & { left: calc(100% - 20px); background: var(--bg-base); }
    }

    /* Danger Zone */
    .danger-card { border-color: rgba(224,92,92,0.15);
      h3 { font-family: var(--font-display); font-size: 1.1rem; color: #e05c5c; margin-bottom: 20px; }
    }
    .danger-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    .danger-info { display: flex; flex-direction: column; gap: 3px;
      strong { font-size: 0.875rem; color: var(--text-primary); }
      span   { font-size: 0.78rem; color: var(--text-muted); }
    }

    @media (max-width: 768px) {
      .profile-layout { grid-template-columns: 1fr; }
      .form-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class ProfileComponent implements OnInit {
  private userSvc = inject(UserService);
  private auth    = inject(AuthService);
  private toast   = inject(ToastService);
  private fb      = inject(FormBuilder);

  loading  = signal(true);
  saving   = signal(false);
  profile  = signal<UserProfileResponse | null>(null);

  initials = () => {
    const name = this.profile()?.fullName ?? 'U';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  };

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
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  toggleReminder() {
    const cur = this.form.get('reminderAllowed')?.value;
    this.form.patchValue({ reminderAllowed: !cur });
  }

  resetForm() {
    const p = this.profile();
    if (!p) return;
    this.form.patchValue({
      fullName: p.fullName, avatarUrl: p.avatarUrl ?? '', bio: p.bio ?? '',
      themePreference: p.themePreference, reminderAllowed: p.reminderAllowed, reminderTime: p.reminderTime ?? ''
    });
  }

  onAvatarError(event: Event): void {
  const img = event.target as HTMLImageElement;
  img.style.display = 'none';
}

  onSave() {
    if (this.saving()) return;
    this.saving.set(true);
    const v = this.form.value;
    this.userSvc.updateProfile({
      fullName:        v.fullName || undefined,
      avatarUrl:       v.avatarUrl || undefined,
      bio:             v.bio || undefined,
      themePreference: v.themePreference as any || undefined,
      reminderAllowed: v.reminderAllowed ?? undefined,
      reminderTime:    v.reminderTime || undefined,
    }).subscribe({
      next: r => {
        this.profile.set(r.data);
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
