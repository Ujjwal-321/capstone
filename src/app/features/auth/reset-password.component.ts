import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { errorMessage } from '../../core/utils/errors';
import { CodeInputComponent } from '../../shared/components/code-input/code-input.component';

/** Opened from the reset email (…/reset-password?code=123456&email=…) or after "Forgot password". */
@Component({
  selector: 'mc-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink, CodeInputComponent],
  template: `
    <div class="auth-head">
      <div class="icon">🔐</div>
      <h1>Set a new password</h1>
      <p>Enter the 6-digit code from your email and choose a new password.</p>
    </div>

    @if (sent) { <div class="form-ok">If that email has an account, a reset code is on its way.</div> }
    @if (error()) { <div class="form-error">{{ error() }}</div> }

    <form (ngSubmit)="submit()" novalidate>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" autocomplete="email" required [(ngModel)]="email" />
      </div>
      <div class="field">
        <label>Reset code</label>
        <mc-code-input [(value)]="code" label="Reset code" />
      </div>
      <div class="field">
        <label for="password">New password</label>
        <div class="pw">
          <input id="password" name="password" [type]="showPw() ? 'text' : 'password'" autocomplete="new-password"
                 minlength="6" maxlength="100" required [(ngModel)]="password" />
          <button type="button" class="show" (click)="showPw.set(!showPw())">{{ showPw() ? 'Hide' : 'Show' }}</button>
        </div>
        <span class="hint">At least 6 characters.</span>
      </div>
      <div class="field">
        <label for="confirm">Confirm new password</label>
        <input id="confirm" name="confirm" [type]="showPw() ? 'text' : 'password'" autocomplete="new-password"
               required [(ngModel)]="confirm" [class.invalid]="confirm.length > 0 && confirm !== password" />
        @if (confirm.length > 0 && confirm !== password) { <span class="err">Passwords don't match.</span> }
      </div>
      <button class="btn block" type="submit" [disabled]="!canSubmit()">
        @if (busy()) { <span class="spinner"></span> } Change password
      </button>
    </form>

    <p class="auth-foot">
      No code? <a routerLink="/auth/forgot-password" [queryParams]="email ? { email } : {}">Send a new one</a><br />
      <a routerLink="/auth/login">Back to sign in</a>
    </p>
  `
})
export class ResetPasswordComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private q = inject(ActivatedRoute).snapshot.queryParamMap;

  readonly sent = this.q.has('sent');
  email = this.q.get('email') ?? '';
  readonly code = signal((this.q.get('code') ?? '').replace(/\D/g, '').slice(0, 6));
  password = '';
  confirm = '';
  readonly busy = signal(false);
  readonly error = signal('');
  readonly showPw = signal(false);

  canSubmit(): boolean {
    return !this.busy() && !!this.email.trim() && /^\d{6}$/.test(this.code())
      && this.password.length >= 6 && this.password === this.confirm;
  }

  submit(): void {
    if (!this.canSubmit()) return;
    const email = this.email.trim().toLowerCase();
    this.busy.set(true);
    this.error.set('');
    this.auth.resetPassword({ email, token: this.code(), newPassword: this.password }).subscribe({
      next: () => this.router.navigate(['/auth/login'], { queryParams: { reset: 1, email } }),
      error: err => {
        this.busy.set(false);
        this.error.set(errorMessage(err, "Couldn't change the password. Check the code and try again."));
      }
    });
  }
}
