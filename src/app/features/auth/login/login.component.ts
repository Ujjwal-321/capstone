import { Component, signal, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/api.services';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
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
        this.apiError.set(err?.error?.message || 'Invalid credentials. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
