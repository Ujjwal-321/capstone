import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-simple">
      <div class="auth-card">
        <div class="auth-card-icon">🔐</div>
        <h2>Forgot your password?</h2>
        <p>Enter your email and we'll send you a reset link.</p>

        <div class="success-msg" *ngIf="sent()">
          <span>✓</span> Reset link sent! Check your inbox.
          <br/><a routerLink="/auth/login">Back to login</a>
        </div>

        <form *ngIf="!sent()" [formGroup]="form" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input class="form-control" [class.is-invalid]="isInvalid('email')"
              type="email" formControlName="email" placeholder="you@example.com" />
            <span class="form-error" *ngIf="isInvalid('email')">Valid email required.</span>
          </div>
          <div class="api-error" *ngIf="apiError()">{{ apiError() }}</div>
          <button type="submit" class="btn btn-primary btn-full" [disabled]="loading()">
            <span class="spinner spinner-sm" *ngIf="loading()"></span>
            <span *ngIf="!loading()">Send Reset Link</span>
          </button>
        </form>

        <p class="back-link" *ngIf="!sent()"><a routerLink="/auth/login">← Back to login</a></p>
      </div>
    </div>
  `,
  styles: [`
    .auth-simple { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-base); padding: 24px; }
    .auth-card {
      background: var(--bg-surface); border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xl); padding: 48px 40px; max-width: 420px; width: 100%; text-align: center;
      h2 { font-family: var(--font-display); font-size: 1.6rem; margin-bottom: 8px; }
      p  { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 28px; }
    }
    .auth-card-icon { font-size: 2.5rem; margin-bottom: 20px; }
    .success-msg {
      background: rgba(94,207,150,0.08); border: 1px solid rgba(94,207,150,0.25);
      border-radius: var(--radius-md); padding: 16px; color: #5ecf96; font-size: 0.9rem; line-height: 1.7;
      a { color: var(--accent-gold); display: inline-block; margin-top: 8px; }
    }
    .api-error { background: rgba(224,92,92,0.08); border: 1px solid rgba(224,92,92,0.2); border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 12px; font-size: 0.85rem; color: #e05c5c; }
    .back-link { margin-top: 20px; font-size: 0.85rem; a { color: var(--text-muted); &:hover { color: var(--accent-gold); } } }
    form { text-align: left; }
  `]
})
export class ForgotPasswordComponent {
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);
  loading  = signal(false);
  sent     = signal(false);
  apiError = signal('');
  form = this.fb.group({ email: ['', [Validators.required, Validators.email]] });
  isInvalid(f: string) { const c = this.form.get(f); return c?.invalid && c?.touched; }
  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.loading.set(true);
    this.auth.forgotPassword({ email: this.form.value.email! }).subscribe({
      next: () => { this.sent.set(true); this.loading.set(false); },
      error: err => { this.apiError.set(err?.error?.message || 'Failed. Please try again.'); this.loading.set(false); }
    });
  }
}
