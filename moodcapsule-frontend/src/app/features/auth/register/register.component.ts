import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/api.services';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-shell">
      <div class="auth-left">
        <div class="auth-left-content">
          <div class="auth-brand">
            <span class="brand-pill">💊 MoodCapsule</span>
          </div>
          <h1 class="auth-headline">
            Begin your<br/>
            <em>emotional</em> journey.
          </h1>
          <p class="auth-sub">
            Join thousands of people using MoodCapsule to understand themselves better.
            Free forever. No credit card needed.
          </p>
          <div class="steps">
            <div class="step" *ngFor="let s of steps; let i = index" [style.animation-delay]="(i * 0.1) + 's'">
              <div class="step-num">{{ i + 1 }}</div>
              <div class="step-text">
                <strong>{{ s.title }}</strong>
                <span>{{ s.desc }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="auth-left-orb orb-1"></div>
        <div class="auth-left-orb orb-2"></div>
      </div>

      <div class="auth-right">
        <div class="auth-form-wrap">
          <div class="form-header">
            <h2>Create account</h2>
            <p>Start tracking your mood in minutes</p>
          </div>

          <div class="success-banner" *ngIf="registered()">
            <span class="success-icon">✓</span>
            <div>
              <strong>Account created!</strong>
              <p>Check your email to verify your account, then <a routerLink="/auth/login">sign in</a>.</p>
            </div>
          </div>

          <form *ngIf="!registered()" [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>
            <div class="form-group">
              <label class="form-label">Full Name</label>
              <input class="form-control" [class.is-invalid]="isInvalid('fullName')"
                type="text" formControlName="fullName" placeholder="Jane Doe" autocomplete="name" />
              <span class="form-error" *ngIf="isInvalid('fullName')">Full name is required.</span>
            </div>

            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input class="form-control" [class.is-invalid]="isInvalid('email')"
                type="email" formControlName="email" placeholder="you@example.com" autocomplete="email" />
              <span class="form-error" *ngIf="isInvalid('email')">Please enter a valid email.</span>
            </div>

            <div class="form-group">
              <label class="form-label">Password</label>
              <div class="input-password">
                <input class="form-control" [class.is-invalid]="isInvalid('password')"
                  [type]="showPass() ? 'text' : 'password'"
                  formControlName="password" placeholder="Minimum 6 characters" autocomplete="new-password" />
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
              <div class="password-strength" *ngIf="form.get('password')?.value">
                <div class="strength-bar">
                  <div class="strength-fill" [style.width]="strengthPct() + '%'" [class]="'strength-' + strengthLevel()"></div>
                </div>
                <span class="strength-label">{{ strengthLabel() }}</span>
              </div>
              <span class="form-error" *ngIf="isInvalid('password')">Password must be at least 6 characters.</span>
            </div>

            <div class="api-error" *ngIf="apiError()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
              </svg>
              {{ apiError() }}
            </div>

            <button type="submit" class="btn btn-primary btn-full btn-lg" [disabled]="loading()">
              <span class="spinner spinner-sm" *ngIf="loading()"></span>
              <span *ngIf="!loading()">Create Account</span>
              <span *ngIf="loading()">Creating account…</span>
            </button>
          </form>

          <div class="divider-text" *ngIf="!registered()">or</div>
          <p class="auth-switch" *ngIf="!registered()">
            Already have an account? <a routerLink="/auth/login">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-shell { display: flex; min-height: 100vh; }
    .auth-left {
      flex: 1;
      background: linear-gradient(145deg, #0d0f16 0%, #111420 60%, #0a0c14 100%);
      display: flex; align-items: center; justify-content: center;
      padding: 60px; position: relative; overflow: hidden;
    }
    .auth-left-content { max-width: 480px; position: relative; z-index: 2; }
    .auth-brand { margin-bottom: 48px; }
    .brand-pill {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(201,169,110,0.1); border: 1px solid rgba(201,169,110,0.25);
      color: var(--accent-gold); font-size: 0.85rem; font-weight: 600;
      padding: 8px 18px; border-radius: var(--radius-full); letter-spacing: 0.04em;
    }
    .auth-headline {
      font-family: var(--font-display); font-size: clamp(2.2rem, 4vw, 3.2rem);
      font-weight: 700; color: var(--text-primary); line-height: 1.15; margin-bottom: 20px;
      em {
        font-style: italic;
        background: linear-gradient(135deg, var(--accent-gold), var(--accent-gold-lt));
        -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      }
    }
    .auth-sub { font-size: 1rem; color: var(--text-secondary); line-height: 1.7; margin-bottom: 44px; max-width: 380px; }
    .steps { display: flex; flex-direction: column; gap: 20px; }
    .step {
      display: flex; gap: 16px; align-items: flex-start;
      animation: fadeInUp 0.5s ease forwards; opacity: 0;
    }
    .step-num {
      width: 28px; height: 28px; border-radius: 50%;
      background: rgba(201,169,110,0.15); border: 1px solid rgba(201,169,110,0.3);
      color: var(--accent-gold); font-size: 0.75rem; font-weight: 700;
      display: flex; align-items: center; justify-content: center; flex-shrink: 0;
    }
    .step-text { display: flex; flex-direction: column; gap: 2px;
      strong { font-size: 0.9rem; color: var(--text-primary); }
      span   { font-size: 0.82rem; color: var(--text-secondary); }
    }
    .auth-left-orb { position: absolute; border-radius: 50%; filter: blur(80px); pointer-events: none; }
    .orb-1 { width: 400px; height: 400px; background: radial-gradient(circle, rgba(201,169,110,0.12), transparent 70%); top: -100px; right: -100px; }
    .orb-2 { width: 300px; height: 300px; background: radial-gradient(circle, rgba(94,207,190,0.08), transparent 70%); bottom: -80px; left: -80px; }
    .auth-right {
      width: 480px; background: var(--bg-surface);
      display: flex; align-items: center; justify-content: center;
      padding: 60px 48px; border-left: 1px solid var(--border-subtle);
    }
    .auth-form-wrap { width: 100%; max-width: 360px; }
    .form-header { margin-bottom: 36px;
      h2 { font-family: var(--font-display); font-size: 1.9rem; font-weight: 600; color: var(--text-primary); margin-bottom: 6px; }
      p  { font-size: 0.9rem; color: var(--text-secondary); }
    }
    .success-banner {
      display: flex; gap: 14px; align-items: flex-start;
      background: rgba(94,207,150,0.08); border: 1px solid rgba(94,207,150,0.25);
      border-radius: var(--radius-md); padding: 16px 18px; margin-bottom: 16px;
      strong { display: block; color: #5ecf96; font-size: 0.9rem; margin-bottom: 4px; }
      p { font-size: 0.83rem; color: var(--text-secondary); margin: 0;
        a { color: var(--accent-gold); } }
    }
    .success-icon {
      width: 24px; height: 24px; border-radius: 50%; background: rgba(94,207,150,0.2);
      color: #5ecf96; display: flex; align-items: center; justify-content: center;
      font-size: 0.8rem; font-weight: 700; flex-shrink: 0;
    }
    .input-password { position: relative;
      .form-control { padding-right: 44px; }
    }
    .eye-btn {
      position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
      background: none; border: none; color: var(--text-muted); cursor: pointer;
      display: flex; transition: color var(--transition-fast);
      &:hover { color: var(--accent-gold); }
    }
    .password-strength { margin-top: 8px; display: flex; align-items: center; gap: 10px; }
    .strength-bar { flex: 1; height: 3px; background: var(--border-subtle); border-radius: var(--radius-full); overflow: hidden; }
    .strength-fill { height: 100%; border-radius: var(--radius-full); transition: width 0.3s ease; }
    .strength-weak   { background: #e05c5c; }
    .strength-fair   { background: var(--accent-gold); }
    .strength-strong { background: #5ecf96; }
    .strength-label  { font-size: 0.72rem; color: var(--text-muted); white-space: nowrap; }
    .api-error {
      display: flex; align-items: center; gap: 8px;
      background: rgba(224,92,92,0.08); border: 1px solid rgba(224,92,92,0.2);
      border-radius: var(--radius-md); padding: 10px 14px; margin-bottom: 16px;
      font-size: 0.85rem; color: #e05c5c;
    }
    .auth-switch { text-align: center; font-size: 0.875rem; color: var(--text-secondary);
      a { color: var(--accent-gold); font-weight: 500; margin-left: 4px; }
    }
    @media (max-width: 900px) { .auth-left { display: none; } .auth-right { width: 100%; border-left: none; } }
    @media (max-width: 480px) { .auth-right { padding: 40px 24px; } }
  `]
})
export class RegisterComponent {
  private fb    = inject(FormBuilder);
  private auth  = inject(AuthService);
  private toast = inject(ToastService);

  loading    = signal(false);
  showPass   = signal(false);
  apiError   = signal('');
  registered = signal(false);

  steps = [
    { title: 'Create your account', desc: 'Quick registration, no card needed' },
    { title: 'Verify your email',   desc: 'One-click verification link' },
    { title: 'Log your first mood', desc: 'Takes under 10 seconds' },
  ];

  form = this.fb.group({
    fullName: ['', [Validators.required, Validators.maxLength(100)]],
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  isInvalid(f: string) { const c = this.form.get(f); return c?.invalid && c?.touched; }

  togglePass() { this.showPass.set(!this.showPass()); }

  strengthPct() {
    const v = this.form.get('password')?.value || '';
    if (v.length < 6)  return 30;
    if (v.length < 10) return 60;
    return 100;
  }
  strengthLevel() {
    const p = this.strengthPct();
    if (p <= 30)  return 'weak';
    if (p <= 60)  return 'fair';
    return 'strong';
  }
  strengthLabel() {
    const l = this.strengthLevel();
    if (l === 'weak')   return 'Weak';
    if (l === 'fair')   return 'Fair';
    return 'Strong';
  }

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.apiError.set('');

    this.auth.register(this.form.value as any).subscribe({
      next: () => {
        this.registered.set(true);
        this.loading.set(false);
      },
      error: err => {
        this.apiError.set(err?.error?.message || 'Registration failed. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
