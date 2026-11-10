import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/guards/auth.guard';

const soon = () => import('./shared/components/coming-soon/coming-soon.component').then(m => m.ComingSoonComponent);

export const routes: Routes = [
  // Sign in / sign up (only when signed out)
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/auth-shell.component').then(m => m.AuthShellComponent),
    children: [
      { path: 'login', title: 'Sign in · MoodCapsule', loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent) },
      { path: 'register', title: 'Create account · MoodCapsule', loadComponent: () => import('./features/auth/register.component').then(m => m.RegisterComponent) },
      { path: 'forgot-password', title: 'Forgot password · MoodCapsule', loadComponent: () => import('./features/auth/forgot-password.component').then(m => m.ForgotPasswordComponent) },
      { path: '', pathMatch: 'full', redirectTo: 'login' }
    ]
  },

  // Reached from emails, so they work signed in or out
  {
    path: '',
    loadComponent: () => import('./features/auth/auth-shell.component').then(m => m.AuthShellComponent),
    children: [
      { path: 'verify-email', title: 'Verify email · MoodCapsule', loadComponent: () => import('./features/auth/verify-email.component').then(m => m.VerifyEmailComponent) },
      { path: 'reset-password', title: 'Reset password · MoodCapsule', loadComponent: () => import('./features/auth/reset-password.component').then(m => m.ResetPasswordComponent) }
    ]
  },

  // The app (signed in)
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    children: [
      { path: 'overview', title: 'Overview · MoodCapsule', loadComponent: soon, data: { title: 'Overview', emoji: '🏠' } },
      { path: 'pixels', title: 'Year in Pixels · MoodCapsule', loadComponent: soon, data: { title: 'Year in Pixels', emoji: '🟪' } },
      { path: 'journal', title: 'Journal · MoodCapsule', loadComponent: soon, data: { title: 'Journal', emoji: '📖' } },
      { path: 'insights', title: 'Insights · MoodCapsule', loadComponent: soon, data: { title: 'Insights', emoji: '📊' } },
      { path: 'capsules', title: 'Time Capsules · MoodCapsule', loadComponent: soon, data: { title: 'Time Capsules', emoji: '🕰️' } },
      { path: 'weekly', title: 'Weekly review · MoodCapsule', loadComponent: soon, data: { title: 'Weekly review', emoji: '🗓️' } },
      { path: 'wrapped', title: 'Capsule Wrapped · MoodCapsule', loadComponent: soon, data: { title: 'Capsule Wrapped', emoji: '🎁' } },
      { path: 'profile', title: 'Profile · MoodCapsule', loadComponent: soon, data: { title: 'Profile & your data', emoji: '👤' } },
      { path: 'admin', title: 'Admin · MoodCapsule', canActivate: [adminGuard], loadComponent: soon, data: { title: 'Admin', emoji: '🛡️' } },

      // Old addresses from the previous web app
      { path: 'dashboard', redirectTo: 'overview' },
      { path: 'mood/history', redirectTo: 'journal' },
      { path: 'mood/log', redirectTo: 'overview' },
      { path: 'stats', redirectTo: 'insights' },
      { path: 'stats/recap', redirectTo: 'wrapped' },
      { path: '', pathMatch: 'full', redirectTo: 'overview' }
    ]
  },

  { path: '**', redirectTo: 'overview' }
];
