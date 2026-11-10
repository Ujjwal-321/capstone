import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { UpdateProfileRequest, UserProfile } from '../models';
import { ApiService } from './api.service';
import { AuthService } from './auth.service';
import { ThemeService } from './theme.service';

/** The signed-in user's profile, shared by the sidebar and the pages. */
@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private theme = inject(ThemeService);

  readonly profile = signal<UserProfile | null>(null);

  /**
   * Loads the profile once after sign-in: applies the saved theme, and saves this browser's
   * time zone if the account doesn't have one yet (the server uses it to decide what "today" is).
   */
  load(): void {
    this.api.me().subscribe({
      next: p => {
        this.set(p);
        if (p.themePreference) this.theme.set(p.themePreference);
        const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (!p.timezone && browserZone) {
          this.api.updateMe({ timezone: browserZone }).subscribe({ next: q => this.set(q), error: () => {} });
        }
      },
      error: () => {}
    });
  }

  save(patch: UpdateProfileRequest): Observable<UserProfile> {
    return this.api.updateMe(patch).pipe(tap(p => this.set(p)));
  }

  clear(): void {
    this.profile.set(null);
  }

  private set(p: UserProfile): void {
    this.profile.set(p);
    this.auth.updateUser({ fullName: p.fullName, email: p.email, role: p.role, emailVerified: p.emailVerified });
  }
}
