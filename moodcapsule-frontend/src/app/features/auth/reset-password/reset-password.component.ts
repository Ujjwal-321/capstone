import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

// ─── Verify Email ────────────────────────────────────────────
@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-simple">
      <div class="auth-card">
        <div class="auth-card-icon">📧</div>
        <h2>Verify your email</h2>
        <p>Enter your email and the 6-digit code we sent you.</p>

        <div class="success-msg" *ngIf="verified()">
          <span>✓</span> Email verified successfully!<br/>
          <a routerLink="/auth/login">Sign in now →</a>
        </div>

        <form *ngIf="!verified()" [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input class="form-control" type="email" formControlName="email" placeholder="you@example.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Verification Code</label>
            <input class="form-control code-input" type="text" formControlName="code"
              placeholder="000000" maxlength="6" autocomplete="one-time-code" />
          </div>
          <div class="api-error" *ngIf="apiError()">{{ apiError() }}</div>
          <button type="submit" class="btn btn-primary btn-full" [disabled]="loading()">
            <span class="spinner spinner-sm" *ngIf="loading()"></span>
            <span *ngIf="!loading()">Verify Email</span>
          </button>
        </form>
        <p class="back-link"><a routerLink="/auth/login">← Back to login</a></p>
      </div>
    </div>
  `,
  styles: [`
    .auth-simple { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-base); padding: 24px; }
    .auth-card {
      background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl);
      padding: 48px 40px; max-width: 420px; width: 100%; text-align: center;
      h2 { font-family: var(--font-display); font-size: 1.6rem; margin-bottom: 8px; }
      p  { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 28px; }
    }
    .auth-card-icon { font-size: 2.5rem; margin-bottom: 20px; }
    .code-input { text-align: center; font-size: 1.4rem; font-family: var(--font-mono); letter-spacing: 0.3em; }
    .success-msg { background: rgba(94,207,150,0.08); border: 1px solid rgba(94,207,150,0.25); border-radius: var(--radius-md); padding: 16px; color: #5ecf96; font-size: 0.9rem; line-height: 1.9; a { color: var(--accent-gold); } }
    .api-error { background: rgba(224,92,92,0.08); border: 1px solid rgba(224,92,92,0.2); border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 12px; font-size: 0.85rem; color: #e05c5c; }
    .back-link { margin-top: 20px; font-size: 0.85rem; a { color: var(--text-muted); &:hover { color: var(--accent-gold); } } }
    form { text-align: left; }
  `]
})
export class VerifyEmailComponent {
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);
  loading  = signal(false);
  verified = signal(false);
  apiError = signal('');
  form = this.fb.group({ email: ['', [Validators.required, Validators.email]], code: ['', Validators.required] });
  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.loading.set(true);
    this.auth.verifyEmail({ email: this.form.value.email!, code: this.form.value.code! }).subscribe({
      next: () => { this.verified.set(true); this.loading.set(false); },
      error: err => { this.apiError.set(err?.error?.message || 'Invalid code. Please try again.'); this.loading.set(false); }
    });
  }
}

// ─── Reset Password ──────────────────────────────────────────
@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-simple">
      <div class="auth-card">
        <div class="auth-card-icon">🔑</div>
        <h2>Reset your password</h2>
        <p>Enter your new password below.</p>

        <div class="success-msg" *ngIf="reset()">
          <span>✓</span> Password updated!<br/>
          <a routerLink="/auth/login">Sign in with new password →</a>
        </div>

        <form *ngIf="!reset()" [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input class="form-control" type="email" formControlName="email" placeholder="you@example.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Reset Token</label>
            <input class="form-control" type="text" formControlName="token" placeholder="Paste token from email" />
          </div>
          <div class="form-group">
            <label class="form-label">New Password</label>
            <input class="form-control" type="password" formControlName="newPassword" placeholder="Minimum 6 characters" />
          </div>
          <div class="api-error" *ngIf="apiError()">{{ apiError() }}</div>
          <button type="submit" class="btn btn-primary btn-full" [disabled]="loading()">
            <span class="spinner spinner-sm" *ngIf="loading()"></span>
            <span *ngIf="!loading()">Reset Password</span>
          </button>
        </form>
        <p class="back-link"><a routerLink="/auth/login">← Back to login</a></p>
      </div>
    </div>
  `,
  styles: [`
    .auth-simple { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-base); padding: 24px; }
    .auth-card { background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); padding: 48px 40px; max-width: 420px; width: 100%; text-align: center;
      h2 { font-family: var(--font-display); font-size: 1.6rem; margin-bottom: 8px; }
      p  { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 28px; }
    }
    .auth-card-icon { font-size: 2.5rem; margin-bottom: 20px; }
    .success-msg { background: rgba(94,207,150,0.08); border: 1px solid rgba(94,207,150,0.25); border-radius: var(--radius-md); padding: 16px; color: #5ecf96; font-size: 0.9rem; line-height: 1.9; a { color: var(--accent-gold); } }
    .api-error { background: rgba(224,92,92,0.08); border: 1px solid rgba(224,92,92,0.2); border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 12px; font-size: 0.85rem; color: #e05c5c; }
    .back-link { margin-top: 20px; font-size: 0.85rem; a { color: var(--text-muted); &:hover { color: var(--accent-gold); } } }
    form { text-align: left; }
  `]
})
export class ResetPasswordComponent {
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);
  loading  = signal(false);
  reset    = signal(false);
  apiError = signal('');
  form = this.fb.group({ email: ['', [Validators.required]], token: ['', Validators.required], newPassword: ['', [Validators.required, Validators.minLength(6)]] });
  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.loading.set(true);
    this.auth.resetPassword(this.form.value as any).subscribe({
      next: () => { this.reset.set(true); this.loading.set(false); },
      error: err => { this.apiError.set(err?.error?.message || 'Reset failed.'); this.loading.set(false); }
    });
  }
}
