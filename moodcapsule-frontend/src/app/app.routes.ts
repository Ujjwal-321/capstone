import { Routes } from '@angular/router';
import { authGuard, guestGuard, adminGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  // Auth routes (guest only)
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES)
  },

  // Verify email (accessible always)
  {
    path: 'verify-email',
    loadComponent: () => import('./features/auth/verify-email/verify-email.component')
      .then(m => m.VerifyEmailComponent)
  },

  // Reset password (accessible always)
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password.component')
      .then(m => m.ResetPasswordComponent)
  },

  // Protected app shell
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/layout/layout.component')
      .then(m => m.LayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component')
          .then(m => m.DashboardComponent)
      },
      {
        path: 'mood',
        loadChildren: () => import('./features/mood/mood.routes').then(m => m.MOOD_ROUTES)
      },
      {
        path: 'stats',
        loadChildren: () => import('./features/stats/stats.routes').then(m => m.STATS_ROUTES)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component')
          .then(m => m.ProfileComponent)
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () => import('./features/admin/admin.component')
          .then(m => m.AdminComponent)
      }
    ]
  },

  { path: '**', redirectTo: '/dashboard' }
];
