import { Routes } from '@angular/router';

export const MOOD_ROUTES: Routes = [
  {
    path: 'log',
    loadComponent: () => import('./log-mood/log-mood.component').then(m => m.LogMoodComponent)
  },
  {
    path: 'history',
    loadComponent: () => import('./history/history.component').then(m => m.HistoryComponent)
  },
  { path: '', redirectTo: 'log', pathMatch: 'full' }
];
