import { Component, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './verify-email.component.html',
  styleUrl: './verify-email.component.scss'
})
export class VerifyEmailComponent {
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);

  loading  = signal(false);
  verified = signal(false);
  apiError = signal('');

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    code:  ['', Validators.required]
  });

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.loading.set(true);
    this.auth.verifyEmail({ email: this.form.value.email!, code: this.form.value.code! }).subscribe({
      next: () => { this.verified.set(true); this.loading.set(false); },
      error: err => { this.apiError.set(err?.error?.message || 'Invalid code.'); this.loading.set(false); }
    });
  }
}
