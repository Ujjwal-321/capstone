import { Component, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.scss'
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
