import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './core/guards/auth.guard';

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
      { path: 'overview', title: 'Overview · MoodCapsule', loadComponent: () => import('./features/overview/overview.component').then(m => m.OverviewComponent) },
      { path: 'pixels', title: 'Year in Pixels · MoodCapsule', loadComponent: () => import('./features/pixels/pixels.component').then(m => m.PixelsComponent) },
      { path: 'journal', title: 'Journal · MoodCapsule', loadComponent: () => import('./features/journal/journal.component').then(m => m.JournalComponent) },
      { path: 'insights', title: 'Insights · MoodCapsule', loadComponent: () => import('./features/insights/insights.component').then(m => m.InsightsComponent) },
      { path: 'capsules', title: 'Time Capsules · MoodCapsule', loadComponent: () => import('./features/capsules/capsules.component').then(m => m.CapsulesComponent) },
      { path: 'weekly', title: 'Weekly review · MoodCapsule', loadComponent: () => import('./features/weekly/weekly.component').then(m => m.WeeklyComponent) },
      { path: 'wrapped', title: 'Capsule Wrapped · MoodCapsule', loadComponent: () => import('./features/wrapped/wrapped.component').then(m => m.WrappedComponent) },
      { path: 'profile', title: 'Profile · MoodCapsule', loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent) },
      { path: 'admin', title: 'Admin · MoodCapsule', canActivate: [adminGuard], loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent) },

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
