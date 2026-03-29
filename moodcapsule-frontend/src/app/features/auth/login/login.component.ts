import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/api.services';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-shell">
      <!-- Left Panel -->
      <div class="auth-left">
        <div class="auth-left-content">
          <div class="auth-brand">
            <span class="brand-pill">💊 MoodCapsule</span>
          </div>
          <h1 class="auth-headline">
            Your emotions,<br/>
            <em>beautifully</em> captured.
          </h1>
          <p class="auth-sub">
            Track your daily mood, discover patterns, and grow through self-awareness.
            Every feeling deserves to be remembered.
          </p>
          <div class="auth-features">
            <div class="feat-item" *ngFor="let f of features; let i = index"
                 [style.animation-delay]="(i * 0.12) + 's'">
              <span class="feat-icon">{{ f.icon }}</span>
              <span class="feat-text">{{ f.text }}</span>
            </div>
          </div>
        </div>
        <div class="auth-left-orb orb-1"></div>
        <div class="auth-left-orb orb-2"></div>
      </div>

      <!-- Right Panel -->
      <div class="auth-right">
        <div class="auth-form-wrap">
          <div class="form-header">
            <h2>Welcome back</h2>
            <p>Sign in to continue your journey</p>
          </div>

          <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input
                class="form-control"
                [class.is-invalid]="isInvalid('email')"
                type="email"
                formControlName="email"
                placeholder="you@example.com"
                autocomplete="email"
              />
              <span class="form-error" *ngIf="isInvalid('email')">
                Please enter a valid email address.
              </span>
            </div>

            <div class="form-group">
              <div class="label-row">
                <label class="form-label">Password</label>
                <a routerLink="/auth/forgot-password" class="forgot-link">Forgot password?</a>
              </div>
              <div class="input-password">
                <input
                  class="form-control"
                  [class.is-invalid]="isInvalid('password')"
                  [type]="showPass() ? 'text' : 'password'"
                  formControlName="password"
                  placeholder="••••••••"
                  autocomplete="current-password"
                />
                <button type="button" class="eye-btn" (click)="togglePass()">
                  <svg *ngIf="!showPass()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                  <svg *ngIf="showPass()" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                </button>
              </div>
              <span class="form-error" *ngIf="isInvalid('password')">Password is required.</span>
            </div>

            <div class="api-error" *ngIf="apiError()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              {{ apiError() }}
            </div>

            <button type="submit" class="btn btn-primary btn-full btn-lg" [disabled]="loading()">
              <span class="spinner spinner-sm" *ngIf="loading()"></span>
              <span *ngIf="!loading()">Sign In</span>
              <span *ngIf="loading()">Signing in…</span>
            </button>
          </form>

          <div class="divider-text">or</div>

          <p class="auth-switch">
            Don't have an account?
            <a routerLink="/auth/register">Create one free</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-shell {
      display: flex;
      min-height: 100vh;
    }

    /* Left Panel */
    .auth-left {
      flex: 1;
      background: linear-gradient(145deg, #0d0f16 0%, #111420 60%, #0a0c14 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 60px;
      position: relative;
      overflow: hidden;
    }

    .auth-left-content {
      max-width: 480px;
      position: relative;
      z-index: 2;
    }

    .auth-brand {
      margin-bottom: 48px;
    }

    .brand-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(201,169,110,0.1);
      border: 1px solid rgba(201,169,110,0.25);
      color: var(--accent-gold);
      font-size: 0.85rem;
      font-weight: 600;
      padding: 8px 18px;
      border-radius: var(--radius-full);
      letter-spacing: 0.04em;
    }

    .auth-headline {
      font-family: var(--font-display);
      font-size: clamp(2.2rem, 4vw, 3.2rem);
      font-weight: 700;
      color: var(--text-primary);
      line-height: 1.15;
      margin-bottom: 20px;

      em {
        font-style: italic;
        background: linear-gradient(135deg, var(--accent-gold), var(--accent-gold-lt));
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    }

    .auth-sub {
      font-size: 1rem;
      color: var(--text-secondary);
      line-height: 1.7;
      margin-bottom: 44px;
      max-width: 380px;
    }

    .auth-features {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .feat-item {
      display: flex;
      align-items: center;
      gap: 14px;
      animation: fadeInUp 0.5s ease forwards;
      opacity: 0;
    }

    .feat-icon {
      font-size: 1.3rem;
      width: 40px; height: 40px;
      display: flex; align-items: center; justify-content: center;
      background: rgba(255,255,255,0.04);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      flex-shrink: 0;
    }

    .feat-text {
      font-size: 0.9rem;
      color: var(--text-secondary);
    }

    .auth-left-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      pointer-events: none;
    }

    .orb-1 {
      width: 400px; height: 400px;
      background: radial-gradient(circle, rgba(201,169,110,0.12), transparent 70%);
      top: -100px; right: -100px;
    }

    .orb-2 {
      width: 300px; height: 300px;
      background: radial-gradient(circle, rgba(94,207,190,0.08), transparent 70%);
      bottom: -80px; left: -80px;
    }

    /* Right Panel */
    .auth-right {
      width: 480px;
      background: var(--bg-surface);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 60px 48px;
      border-left: 1px solid var(--border-subtle);
    }

    .auth-form-wrap {
      width: 100%;
      max-width: 360px;
    }

    .form-header {
      margin-bottom: 36px;

      h2 {
        font-family: var(--font-display);
        font-size: 1.9rem;
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 6px;
      }

      p {
        font-size: 0.9rem;
        color: var(--text-secondary);
      }
    }

    .label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .forgot-link {
      font-size: 0.78rem;
      color: var(--accent-gold);
      &:hover { color: var(--accent-gold-lt); }
    }

    .input-password {
      position: relative;
      .form-control { padding-right: 44px; }
    }

    .eye-btn {
      position: absolute;
      right: 12px; top: 50%;
      transform: translateY(-50%);
      background: none; border: none;
      color: var(--text-muted);
      cursor: pointer;
      display: flex;
      transition: color var(--transition-fast);
      &:hover { color: var(--accent-gold); }
    }

    .api-error {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(224,92,92,0.08);
      border: 1px solid rgba(224,92,92,0.2);
      border-radius: var(--radius-md);
      padding: 10px 14px;
      margin-bottom: 16px;
      font-size: 0.85rem;
      color: #e05c5c;
    }

    .auth-switch {
      text-align: center;
      font-size: 0.875rem;
      color: var(--text-secondary);

      a {
        color: var(--accent-gold);
        font-weight: 500;
        margin-left: 4px;
        &:hover { color: var(--accent-gold-lt); }
      }
    }

    @media (max-width: 900px) {
      .auth-left  { display: none; }
      .auth-right { width: 100%; border-left: none; }
    }

    @media (max-width: 480px) {
      .auth-right { padding: 40px 24px; }
    }
  `]
})
export class LoginComponent {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);
  private toast  = inject(ToastService);

  loading  = signal(false);
  showPass = signal(false);
  apiError = signal('');

  features = [
    { icon: '📊', text: 'Visual mood trends over days, weeks & months' },
    { icon: '🔥', text: 'Track your daily logging streaks' },
    { icon: '🌟', text: 'Personalized yearly mood recap' },
    { icon: '🔒', text: 'Private, secure, and yours only' },
  ];

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  isInvalid(field: string) {
    const c = this.form.get(field);
    return c?.invalid && c?.touched;
  }

  togglePass() { this.showPass.set(!this.showPass()); }

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.apiError.set('');

    this.auth.login(this.form.value as any).subscribe({
      next: () => {
        this.toast.success('Welcome back! 👋');
        this.router.navigate(['/dashboard']);
      },
      error: err => {
        const msg = err?.error?.message || 'Invalid credentials. Please try again.';
        this.apiError.set(msg);
        this.loading.set(false);
      }
    });
  }
}
