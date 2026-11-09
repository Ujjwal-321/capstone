import { Component, signal, inject, OnInit, NgZone } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/api.services';
import { GoogleAuthRequest } from '../../../core/models';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnInit {
  private fb     = inject(FormBuilder);
  private auth   = inject(AuthService);
  private router = inject(Router);
  private toast  = inject(ToastService);
  private ngZone = inject(NgZone);

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

  ngOnInit(): void {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      window.history.replaceState(null, '', window.location.pathname);
      this.loading.set(true);
      this.apiError.set('');
      
      this.ngZone.run(() => {
        this.auth.googleLogin({ idToken: code }).subscribe({
          next: () => {
            this.toast.success('Account created and logged in with Google! 🚀');
            this.router.navigate(['/dashboard']);
          },
          error: err => {
            this.apiError.set(err?.error?.message || 'Google Registration Verification failed.');
            this.loading.set(false);
          }
        });
      });
    }
  }

  isInvalid(f: string) {
    const c = this.form.get(f);
    return c?.invalid && c?.touched;
  }

  togglePass() { this.showPass.set(!this.showPass()); }

  strengthPct(): number {
    const v = this.form.get('password')?.value || '';
    if (v.length < 6)  return 30;
    if (v.length < 10) return 60;
    return 100;
  }

  strengthLevel(): string {
    const p = this.strengthPct();
    if (p <= 30) return 'weak';
    if (p <= 60) return 'fair';
    return 'strong';
  }

  strengthLabel(): string {
    const l = this.strengthLevel();
    if (l === 'weak') return 'Weak';
    if (l === 'fair') return 'Fair';
    return 'Strong';
  }

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.loading()) return;

    this.loading.set(true);
    this.apiError.set('');

    this.auth.register(this.form.value as any).subscribe({
      next: () => { this.registered.set(true); this.loading.set(false); },
      error: err => {
        this.apiError.set(err?.error?.message || 'Registration failed. Please try again.');
        this.loading.set(false);
      }
    });
  }
}
