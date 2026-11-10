import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { errorMessage } from '../../core/utils/errors';
import { GoogleButtonComponent } from '../../shared/components/google-button/google-button.component';

@Component({
  selector: 'mc-login',
  standalone: true,
  imports: [FormsModule, RouterLink, GoogleButtonComponent],
  template: `
    <div class="auth-head">
      <div class="icon">✨</div>
      <h1>Welcome back</h1>
      <p>Sign in to look back on your moments.</p>
    </div>

    @if (notice()) { <div class="form-ok">{{ notice() }}</div> }
    @if (error()) {
      <div class="form-error">
        {{ error() }}
        @if (needsVerify()) {
          <br /><a [routerLink]="['/verify-email']" [queryParams]="{ email: email }">Verify your email now →</a>
        }
      </div>
    }

    <mc-google-button text="continue_with" (token)="google($event)" [disabled]="busy()" />

    <div class="divider">or with email</div>

    <form (ngSubmit)="submit()" #f="ngForm" novalidate>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" autocomplete="email" required [(ngModel)]="email" />
      </div>
      <div class="field">
        <div class="label-row">
          <label for="password">Password</label>
          <a routerLink="/auth/forgot-password" [queryParams]="email ? { email } : {}">Forgot password?</a>
        </div>
        <div class="pw">
          <input id="password" name="password" [type]="showPw() ? 'text' : 'password'" autocomplete="current-password"
                 required [(ngModel)]="password" />
          <button type="button" class="show" (click)="showPw.set(!showPw())">{{ showPw() ? 'Hide' : 'Show' }}</button>
        </div>
      </div>
      <button class="btn block" type="submit" [disabled]="busy() || !email || !password">
        @if (busy()) { <span class="spinner"></span> } Sign in
      </button>
    </form>

    <p class="auth-foot">New to MoodCapsule? <a routerLink="/auth/register">Create an account</a></p>
  `
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  email = this.route.snapshot.queryParamMap.get('email') ?? '';
  password = '';
  readonly busy = signal(false);
  readonly error = signal('');
  readonly needsVerify = signal(false);
  readonly showPw = signal(false);
  readonly notice = signal(this.initialNotice());

  submit(): void {
    if (!this.email || !this.password || this.busy()) return;
    this.start();
    this.auth.login({ email: this.email.trim(), password: this.password }).subscribe({
      next: () => this.done(),
      error: err => this.fail(err)
    });
  }

  google(idToken: string): void {
    this.start();
    this.auth.loginWithGoogle(idToken).subscribe({
      next: () => this.done(),
      error: err => this.fail(err)
    });
  }

  private start(): void {
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    this.needsVerify.set(false);
  }

  private done(): void {
    const back = this.route.snapshot.queryParamMap.get('returnUrl');
    this.router.navigateByUrl(back && back.startsWith('/') && !back.startsWith('//') ? back : '/overview');
  }

  private fail(err: unknown): void {
    this.busy.set(false);
    const msg = errorMessage(err, 'Sign in failed. Please try again.');
    this.error.set(msg);
    this.needsVerify.set(err instanceof HttpErrorResponse && /verify your email/i.test(msg));
  }

  private initialNotice(): string {
    const q = this.route.snapshot.queryParamMap;
    if (q.has('verified')) return 'Email verified 🎉 You can sign in now.';
    if (q.has('reset')) return 'Password changed. Sign in with your new password.';
    if (q.has('deleted')) return 'Your account and all your data have been deleted.';
    if (q.has('expired')) return 'Your session ended. Please sign in again.';
    return '';
  }
}
