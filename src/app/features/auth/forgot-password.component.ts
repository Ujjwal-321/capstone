import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { errorMessage } from '../../core/utils/errors';

@Component({
  selector: 'mc-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="auth-head">
      <div class="icon">🔑</div>
      <h1>Forgot your password?</h1>
      <p>We'll email you a 6-digit code to set a new one.</p>
    </div>

    @if (error()) { <div class="form-error">{{ error() }}</div> }

    <form (ngSubmit)="submit()" novalidate>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" name="email" type="email" autocomplete="email" required [(ngModel)]="email" />
      </div>
      <button class="btn block" type="submit" [disabled]="busy() || !email">
        @if (busy()) { <span class="spinner"></span> } Send reset code
      </button>
    </form>

    <p class="auth-foot">
      Already have a code? <a routerLink="/reset-password" [queryParams]="email ? { email } : {}">Enter it</a><br />
      <a routerLink="/auth/login">Back to sign in</a>
    </p>
  `
})
export class ForgotPasswordComponent {
  private auth = inject(AuthService);
  private router = inject(Router);

  email = inject(ActivatedRoute).snapshot.queryParamMap.get('email') ?? '';
  readonly busy = signal(false);
  readonly error = signal('');

  submit(): void {
    const email = this.email.trim().toLowerCase();
    if (!email || this.busy()) return;
    this.busy.set(true);
    this.error.set('');
    this.auth.forgotPassword(email).subscribe({
      next: () => this.router.navigate(['/reset-password'], { queryParams: { email, sent: 1 } }),
      error: err => {
        this.busy.set(false);
        this.error.set(errorMessage(err, "Couldn't send the code. Please try again."));
      }
    });
  }
}
