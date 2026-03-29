import { Component, signal, HostListener, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent {
  private auth = inject(AuthService);

  sidebarCollapsed = signal(false);
  mobileOpen       = signal(false);
  today            = new Date();

  userName    = computed(() => this.auth.user()?.fullName ?? 'User');
  userRole    = computed(() => this.auth.user()?.role === 'ADMIN' ? 'Admin' : 'Member');
  isAdmin     = computed(() => this.auth.isAdmin());
  userInitial = computed(() => (this.auth.user()?.fullName ?? 'U').charAt(0).toUpperCase());

  toggleSidebar() { this.sidebarCollapsed.update(v => !v); }
  toggleMobile()  { this.mobileOpen.update(v => !v); }
  closeMobile()   { this.mobileOpen.set(false); }
  logout()        { this.auth.logout(); }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 768) this.mobileOpen.set(false);
  }
}
