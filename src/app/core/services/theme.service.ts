import { Injectable, signal } from '@angular/core';
import { ThemePreference } from '../models';

/**
 * Light / Dark / System, same choices as the Android app. The choice is stored on this
 * device (so the login page uses it too) and synced to the profile by the Profile page.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly KEY = 'mc_theme';
  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');

  readonly preference = signal<ThemePreference>(this.load());
  readonly dark = signal(false);

  constructor() {
    this.apply();
    this.media.addEventListener('change', () => this.apply());
  }

  set(pref: ThemePreference): void {
    this.preference.set(pref);
    try { localStorage.setItem(this.KEY, pref); } catch { /* ignore */ }
    this.apply();
  }

  private apply(): void {
    const pref = this.preference();
    const dark = pref === 'DARK' || (pref === 'SYSTEM' && this.media.matches);
    this.dark.set(dark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  }

  private load(): ThemePreference {
    try {
      const v = localStorage.getItem(this.KEY);
      return v === 'LIGHT' || v === 'DARK' || v === 'SYSTEM' ? v : 'SYSTEM';
    } catch {
      return 'SYSTEM';
    }
  }
}
