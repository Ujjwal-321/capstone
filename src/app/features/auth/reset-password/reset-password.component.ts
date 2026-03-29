import { Component, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent {
  private fb   = inject(FormBuilder);
  private auth = inject(AuthService);

  loading  = signal(false);
  reset    = signal(false);
  apiError = signal('');

  form = this.fb.group({
    email:       ['', Validators.required],
    token:       ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(6)]]
  });

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) return;
    this.loading.set(true);
    this.auth.resetPassword(this.form.value as any).subscribe({
      next: () => { this.reset.set(true); this.loading.set(false); },
      error: err => { this.apiError.set(err?.error?.message || 'Reset failed.'); this.loading.set(false); }
    });
  }
}
