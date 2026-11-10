import { Component, OnDestroy, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { errorMessage } from '../../core/utils/errors';
import { CodeInputComponent } from '../../shared/components/code-input/code-input.component';

const COOLDOWN_SECONDS = 60;

@Component({
  selector: 'mc-verify-email',
  standalone: true,
  imports: [FormsModule, RouterLink, CodeInputComponent],
  template: `
    <div class="auth-head">
      <div class="icon">✉️</div>
      <h1>Check your email</h1>
      @if (emailFromLink) {
        <p>We sent a 6-digit code to <b>{{ email }}</b>.</p>
      } @else {
        <p>Enter your email and the 6-digit code we sent you.</p>
      }
    </div>

    @if (notice()) { <div class="form-ok">{{ notice() }}</div> }
    @if (error()) { <div class="form-error">{{ error() }}</div> }

    @if (!emailFromLink) {
      <div class="field">
        <label for="email">Email</label>
        <input id="email" type="email" autocomplete="email" [(ngModel)]="email" name="email" />
      </div>
    }

    <mc-code-input [(value)]="code" [disabled]="busy()" (complete)="verify()" />
    <p class="hint center">Code expires in 30 minutes · 5 tries per code</p>

    <button class="btn block" type="button" (click)="verify()" [disabled]="busy() || code().length !== 6 || !email">
      @if (busy()) { <span class="spinner"></span> } Verify email
    </button>

    <p class="auth-foot">
      Didn't get it?
      <button type="button" class="link-btn" (click)="resend()" [disabled]="cooldown() > 0 || !email">
        {{ cooldown() > 0 ? 'Resend code in ' + cooldown() + 's' : 'Resend code' }}
      </button>
      <br /><span class="hint">Check your spam folder too.</span>
    </p>
    <p class="auth-foot"><a routerLink="/auth/login">Back to sign in</a></p>
  `,
  styles: [`
    .center { text-align: center; margin: 12px 0 18px; }
    mc-code-input { display: block; margin-top: 6px; }
  `]
})
export class VerifyEmailComponent implements OnDestroy {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly emailFromLink = this.route.snapshot.queryParamMap.get('email');
  email = this.emailFromLink ?? '';
  readonly code = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal(this.route.snapshot.queryParamMap.has('sent') ? 'Account created! Your code is on its way.' : '');
  readonly cooldown = signal(this.route.snapshot.queryParamMap.has('sent') ? COOLDOWN_SECONDS : 0);
  private timer = setInterval(() => this.cooldown.update(s => Math.max(0, s - 1)), 1000);

  verify(): void {
    const email = this.email.trim().toLowerCase();
    if (this.busy() || !/^\d{6}$/.test(this.code()) || !email) return;
    this.busy.set(true);
    this.error.set('');
    this.auth.verifyEmailCode({ email, code: this.code() }).subscribe({
      next: () => this.router.navigate(['/auth/login'], { queryParams: { verified: 1, email } }),
      error: err => {
        this.busy.set(false);
        this.code.set('');
        this.error.set(errorMessage(err, "That code didn't work. Check it and try again."));
      }
    });
  }

  resend(): void {
    const email = this.email.trim().toLowerCase();
    if (!email || this.cooldown() > 0) return;
    this.error.set('');
    this.cooldown.set(COOLDOWN_SECONDS);
    this.auth.resendVerification(email).subscribe({
      next: msg => this.notice.set(msg || 'A new code is on its way.'),
      error: err => {
        this.cooldown.set(0);
        this.error.set(errorMessage(err, "Couldn't send a new code. Please try again."));
      }
    });
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
  }
}
