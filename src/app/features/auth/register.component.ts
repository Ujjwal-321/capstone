import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { errorMessage } from '../../core/utils/errors';
import { GoogleButtonComponent } from '../../shared/components/google-button/google-button.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'mc-register',
  standalone: true,
  imports: [FormsModule, RouterLink, GoogleButtonComponent],
  template: `
    <div class="auth-head">
      <div class="icon">💌</div>
      <h1>Create your capsule</h1>
      <p>One emoji and one sentence a day. That's it.</p>
    </div>

    @if (error()) { <div class="form-error">{{ error() }}</div> }

    <label class="check consent">
      <input type="checkbox" name="consent" [(ngModel)]="consent" />
      <span>I agree to the <a [href]="termsUrl" target="_blank" rel="noopener">Terms of Service</a>
        and the <a [href]="privacyUrl" target="_blank" rel="noopener">Privacy Policy</a>.</span>
    </label>

    <mc-google-button text="signup_with" (token)="google($event)" [disabled]="!consent || busy()" />
    @if (!consent) { <p class="hint center">Tick the box above to sign up with Google or email.</p> }

    <div class="divider">or with email</div>

    <form (ngSubmit)="submit()" novalidate>
      <div class="field">
        <label for="name">Your name</label>
        <input id="name" name="name" autocomplete="name" maxlength="100" required [(ngModel)]="fullName" />
      </div>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" autocomplete="email" maxlength="150" required [(ngModel)]="email" />
      </div>
      <div class="field">
        <label for="password">Password</label>
        <div class="pw">
          <input id="password" name="password" [type]="showPw() ? 'text' : 'password'" autocomplete="new-password"
                 minlength="6" maxlength="100" required [(ngModel)]="password"
                 [class.invalid]="password.length > 0 && password.length < 6" />
          <button type="button" class="show" (click)="showPw.set(!showPw())">{{ showPw() ? 'Hide' : 'Show' }}</button>
        </div>
        <span class="hint">At least 6 characters.</span>
      </div>
      <div class="field">
        <label for="confirm">Confirm password</label>
        <input id="confirm" name="confirm" [type]="showPw() ? 'text' : 'password'" autocomplete="new-password"
               required [(ngModel)]="confirm" [class.invalid]="confirm.length > 0 && confirm !== password" />
        @if (confirm.length > 0 && confirm !== password) { <span class="err">Passwords don't match.</span> }
      </div>
      <button class="btn block" type="submit" [disabled]="!canSubmit()">
        @if (busy()) { <span class="spinner"></span> } Create account
      </button>
    </form>

    <p class="auth-foot">Already have an account? <a routerLink="/auth/login">Sign in</a></p>
  `,
  styles: [`
    .consent { margin-bottom: 16px; background: var(--surface); border: 1px solid var(--stroke); border-radius: 14px; padding: 12px 14px; }
    .center { text-align: center; margin-top: 6px; }
  `]
})
export class RegisterComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly termsUrl = environment.termsUrl;
  readonly privacyUrl = environment.privacyUrl;

  fullName = '';
  email = '';
  password = '';
  confirm = '';
  consent = false;
  readonly busy = signal(false);
  readonly error = signal('');
  readonly showPw = signal(false);

  canSubmit(): boolean {
    return !this.busy() && this.consent && !!this.fullName.trim() && /\S+@\S+\.\S+/.test(this.email)
      && this.password.length >= 6 && this.password === this.confirm;
  }

  submit(): void {
    if (!this.canSubmit()) return;
    this.busy.set(true);
    this.error.set('');
    const email = this.email.trim().toLowerCase();
    this.auth.register({ fullName: this.fullName.trim(), email, password: this.password }).subscribe({
      next: () => this.router.navigate(['/verify-email'], { queryParams: { email, sent: 1 } }),
      error: err => {
        this.busy.set(false);
        this.error.set(errorMessage(err, "Couldn't create the account. Please try again."));
      }
    });
  }

  google(idToken: string): void {
    if (!this.consent) return;
    this.busy.set(true);
    this.error.set('');
    this.auth.loginWithGoogle(idToken).subscribe({
      next: () => this.router.navigateByUrl('/overview'),
      error: err => {
        this.busy.set(false);
        this.error.set(errorMessage(err, 'Google sign-up failed. Please try again.'));
      }
    });
  }
}
