import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { ProfileStore } from '../../../core/services/profile.store';
import { ThemeService } from '../../../core/services/theme.service';
import { avatarEmoji, isImageAvatar } from '../../../core/utils/avatar';
import { environment } from '../../../../environments/environment';

interface NavItem { path: string; label: string; icon: string; }

/** App shell: gradient sidebar (desktop) / slide-in menu (phone) + page outlet. */
@Component({
  selector: 'mc-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent implements OnInit {
  readonly auth = inject(AuthService);
  readonly store = inject(ProfileStore);
  readonly theme = inject(ThemeService);
  private readonly router = inject(Router);

  readonly menuOpen = signal(false);
  readonly playStoreUrl = environment.playStoreUrl;

  readonly look: NavItem[] = [
    { path: '/overview', label: 'Overview', icon: '🏠' },
    { path: '/pixels', label: 'Year in Pixels', icon: '🟪' },
    { path: '/journal', label: 'Journal', icon: '📖' },
    { path: '/insights', label: 'Insights', icon: '📊' }
  ];
  readonly keep: NavItem[] = [
    { path: '/capsules', label: 'Time Capsules', icon: '🕰️' },
    { path: '/weekly', label: 'Weekly review', icon: '🗓️' },
    { path: '/wrapped', label: 'Capsule Wrapped', icon: '🎁' }
  ];

  readonly name = computed(() => this.store.profile()?.fullName || this.auth.user()?.fullName || 'You');
  readonly email = computed(() => this.store.profile()?.email || this.auth.user()?.email || '');
  readonly avatar = computed(() => avatarEmoji(this.store.profile()?.avatarUrl));
  readonly avatarImage = computed(() => {
    const url = this.store.profile()?.avatarUrl;
    return isImageAvatar(url) ? url : null;
  });

  constructor() {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => this.menuOpen.set(false));
  }

  ngOnInit(): void {
    this.store.load();
  }

  toggleTheme(): void {
    this.theme.set(this.theme.dark() ? 'LIGHT' : 'DARK');
    // Remember the choice on the account too, like the phone app does
    this.store.save({ themePreference: this.theme.preference() }).subscribe({ error: () => {} });
  }

  signOut(): void {
    this.store.clear();
    this.auth.logout();
  }
}
