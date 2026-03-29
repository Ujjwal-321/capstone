import { Routes } from '@angular/router';

export const STATS_ROUTES: Routes = [
  {
    path: 'overview',
    loadComponent: () => import('./overview/overview.component').then(m => m.OverviewComponent)
  },
  {
    path: 'recap',
    loadComponent: () => import('./recap/recap.component').then(m => m.RecapComponent)
  },
  { path: '', redirectTo: 'overview', pathMatch: 'full' }
];
