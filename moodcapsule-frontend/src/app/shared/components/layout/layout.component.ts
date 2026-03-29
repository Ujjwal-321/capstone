import { Component, signal, HostListener, computed, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule],
  template: `
    <div class="app-shell" [class.sidebar-collapsed]="sidebarCollapsed()">

      <!-- ── Sidebar ─────────────────────────────────── -->
      <aside class="sidebar" [class.collapsed]="sidebarCollapsed()">
        <div class="sidebar-header">
          <div class="brand" routerLink="/dashboard">
            <div class="brand-icon">💊</div>
            <span class="brand-name" *ngIf="!sidebarCollapsed()">MoodCapsule</span>
          </div>
          <button class="collapse-btn" (click)="toggleSidebar()" [attr.data-tooltip]="sidebarCollapsed() ? 'Expand' : 'Collapse'">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path *ngIf="!sidebarCollapsed()" d="M15 18l-6-6 6-6"/>
              <path *ngIf="sidebarCollapsed()"  d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>

        <!-- Date Display -->
        <div class="sidebar-date" *ngIf="!sidebarCollapsed()">
          <span class="date-day">{{ today | date:'EEEE' }}</span>
          <span class="date-full">{{ today | date:'MMMM d, y' }}</span>
        </div>

        <!-- Navigation -->
        <nav class="sidebar-nav">
          <div class="nav-section-label" *ngIf="!sidebarCollapsed()">Main</div>

          <a class="nav-item" routerLink="/dashboard" routerLinkActive="active" [attr.data-tooltip]="sidebarCollapsed() ? 'Dashboard' : null">
            <span class="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="3" y="3" width="7" height="7" rx="1"/>
                <rect x="14" y="3" width="7" height="7" rx="1"/>
                <rect x="3" y="14" width="7" height="7" rx="1"/>
                <rect x="14" y="14" width="7" height="7" rx="1"/>
              </svg>
            </span>
            <span class="nav-label" *ngIf="!sidebarCollapsed()">Dashboard</span>
          </a>

          <a class="nav-item" routerLink="/mood/log" routerLinkActive="active" [attr.data-tooltip]="sidebarCollapsed() ? 'Log Mood' : null">
            <span class="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <circle cx="12" cy="12" r="10"/>
                <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
                <line x1="9" y1="9" x2="9.01" y2="9"/>
                <line x1="15" y1="9" x2="15.01" y2="9"/>
              </svg>
            </span>
            <span class="nav-label" *ngIf="!sidebarCollapsed()">Log Mood</span>
          </a>

          <a class="nav-item" routerLink="/mood/history" routerLinkActive="active" [attr.data-tooltip]="sidebarCollapsed() ? 'History' : null">
            <span class="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8"  y1="2" x2="8"  y2="6"/>
                <line x1="3"  y1="10" x2="21" y2="10"/>
                <path d="M8 14h2m2 0h4M8 18h4"/>
              </svg>
            </span>
            <span class="nav-label" *ngIf="!sidebarCollapsed()">History</span>
          </a>

          <div class="nav-section-label" *ngIf="!sidebarCollapsed()">Insights</div>

          <a class="nav-item" routerLink="/stats/overview" routerLinkActive="active" [attr.data-tooltip]="sidebarCollapsed() ? 'Stats' : null">
            <span class="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </span>
            <span class="nav-label" *ngIf="!sidebarCollapsed()">Statistics</span>
          </a>

          <a class="nav-item" routerLink="/stats/recap" routerLinkActive="active" [attr.data-tooltip]="sidebarCollapsed() ? 'Year Recap' : null">
            <span class="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </span>
            <span class="nav-label" *ngIf="!sidebarCollapsed()">Year Recap</span>
          </a>

          <div class="nav-divider"></div>

          <a class="nav-item" routerLink="/profile" routerLinkActive="active" [attr.data-tooltip]="sidebarCollapsed() ? 'Profile' : null">
            <span class="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                <circle cx="12" cy="7" r="4"/>
              </svg>
            </span>
            <span class="nav-label" *ngIf="!sidebarCollapsed()">Profile</span>
          </a>

          <a class="nav-item admin-link" *ngIf="isAdmin()" routerLink="/admin" routerLinkActive="active" [attr.data-tooltip]="sidebarCollapsed() ? 'Admin' : null">
            <span class="nav-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </span>
            <span class="nav-label" *ngIf="!sidebarCollapsed()">Admin</span>
          </a>
        </nav>

        <!-- User Footer -->
        <div class="sidebar-footer" *ngIf="!sidebarCollapsed()">
          <div class="user-pill">
            <div class="user-avatar">{{ userInitial() }}</div>
            <div class="user-info">
              <span class="user-name">{{ userName() }}</span>
              <span class="user-role">{{ userRole() }}</span>
            </div>
            <button class="logout-btn" (click)="logout()" data-tooltip="Logout">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="sidebar-footer-collapsed" *ngIf="sidebarCollapsed()">
          <button class="logout-btn-icon" (click)="logout()" data-tooltip="Logout">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      <!-- ── Mobile Overlay ───────────────────────── -->
      <div class="mobile-overlay" *ngIf="mobileOpen()" (click)="closeMobile()"></div>

      <!-- ── Main Content ─────────────────────────── -->
      <div class="main-area">
        <!-- Top bar (mobile) -->
        <header class="topbar">
          <button class="mobile-menu-btn" (click)="toggleMobile()">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div class="brand-mobile">💊 MoodCapsule</div>
          <div class="topbar-avatar">{{ userInitial() }}</div>
        </header>

        <main class="content-area">
          <router-outlet />
        </main>
      </div>
    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      min-height: 100vh;
      background: var(--bg-base);
    }

    /* ── Sidebar ──────────────────────────────── */
    .sidebar {
      width: var(--sidebar-width);
      min-height: 100vh;
      background: var(--bg-surface);
      border-right: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0; left: 0; bottom: 0;
      z-index: 200;
      transition: width var(--transition-base);
      overflow: hidden;

      &.collapsed {
        width: 68px;

        .sidebar-header { padding: 20px 14px; justify-content: center; }
        .sidebar-nav    { padding: 8px; }
        .nav-item       { justify-content: center; padding: 10px; }
        .nav-section-label { display: none; }
        .nav-divider    { margin: 8px 0; }
      }
    }

    .sidebar-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 20px 16px;
      border-bottom: 1px solid var(--border-subtle);
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      text-decoration: none;
    }

    .brand-icon {
      font-size: 1.5rem;
      flex-shrink: 0;
    }

    .brand-name {
      font-family: var(--font-display);
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      background: linear-gradient(135deg, var(--accent-gold), var(--accent-gold-lt));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .collapse-btn {
      background: none;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      width: 28px; height: 28px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: all var(--transition-fast);
      flex-shrink: 0;
      &:hover { color: var(--accent-gold); border-color: var(--border-accent); }
    }

    .sidebar-date {
      padding: 14px 20px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .date-day {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--accent-gold);
      font-weight: 600;
    }

    .date-full {
      font-size: 0.82rem;
      color: var(--text-secondary);
    }

    .sidebar-nav {
      flex: 1;
      padding: 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
      overflow-y: auto;
    }

    .nav-section-label {
      font-size: 0.65rem;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: var(--text-muted);
      font-weight: 600;
      padding: 12px 8px 6px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      text-decoration: none;
      font-size: 0.875rem;
      font-weight: 400;
      transition: all var(--transition-fast);
      cursor: pointer;
      border: 1px solid transparent;
      white-space: nowrap;

      .nav-icon {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 22px; height: 22px;
      }

      &:hover {
        color: var(--text-primary);
        background: var(--bg-elevated);
      }

      &.active {
        color: var(--accent-gold);
        background: var(--accent-glow);
        border-color: rgba(201, 169, 110, 0.15);
        font-weight: 500;

        .nav-icon svg { stroke: var(--accent-gold); }
      }

      &.admin-link.active {
        color: var(--accent-teal);
        background: var(--accent-teal-glow);
        border-color: rgba(94, 207, 190, 0.15);
        .nav-icon svg { stroke: var(--accent-teal); }
      }
    }

    .nav-divider {
      height: 1px;
      background: var(--border-subtle);
      margin: 8px 0;
    }

    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid var(--border-subtle);
    }

    .user-pill {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
      border-radius: var(--radius-md);
      background: var(--bg-elevated);
      border: 1px solid var(--border-subtle);
    }

    .user-avatar {
      width: 32px; height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent-gold-dk), var(--accent-gold));
      display: flex; align-items: center; justify-content: center;
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--bg-base);
      flex-shrink: 0;
    }

    .user-info {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    .user-name {
      font-size: 0.83rem;
      font-weight: 500;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      font-size: 0.68rem;
      color: var(--accent-gold);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }

    .logout-btn {
      background: none;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      display: flex;
      transition: color var(--transition-fast);
      flex-shrink: 0;
      &:hover { color: #e05c5c; }
    }

    .sidebar-footer-collapsed {
      padding: 12px;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      justify-content: center;
    }

    .logout-btn-icon {
      background: none;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer;
      transition: all var(--transition-fast);
      &:hover { color: #e05c5c; border-color: rgba(224,92,92,0.3); }
    }

    /* ── Main Area ────────────────────────────── */
    .main-area {
      flex: 1;
      margin-left: var(--sidebar-width);
      transition: margin-left var(--transition-base);
      min-height: 100vh;
      display: flex;
      flex-direction: column;

      .app-shell.sidebar-collapsed & {
        margin-left: 68px;
      }
    }

    .topbar {
      display: none;
      align-items: center;
      justify-content: space-between;
      padding: 0 var(--space-5);
      height: var(--topbar-height);
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border-subtle);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .mobile-menu-btn {
      background: none;
      border: none;
      color: var(--text-primary);
      cursor: pointer;
      padding: 6px;
      border-radius: var(--radius-sm);
      display: flex;
      &:hover { background: var(--bg-elevated); }
    }

    .brand-mobile {
      font-family: var(--font-display);
      font-weight: 600;
      font-size: 1.1rem;
      background: linear-gradient(135deg, var(--accent-gold), var(--accent-gold-lt));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .topbar-avatar {
      width: 32px; height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent-gold-dk), var(--accent-gold));
      display: flex; align-items: center; justify-content: center;
      font-size: 0.78rem;
      font-weight: 700;
      color: var(--bg-base);
    }

    .content-area {
      flex: 1;
      padding: var(--space-8);
    }

    .mobile-overlay {
      display: none;
    }

    /* ── Responsive ───────────────────────────── */
    @media (max-width: 768px) {
      .sidebar {
        transform: translateX(-100%);
        transition: transform var(--transition-base), width var(--transition-base);
        width: var(--sidebar-width) !important;

        &.mobile-open { transform: translateX(0); }
      }

      .main-area { margin-left: 0 !important; }
      .topbar    { display: flex; }

      .mobile-overlay {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        z-index: 150;
        backdrop-filter: blur(2px);
      }

      .content-area { padding: var(--space-5); }
    }
  `]
})
export class LayoutComponent {
  sidebarCollapsed = signal(false);
  mobileOpen = signal(false);

  today = new Date();

  private auth = inject(AuthService);

  userName  = computed(() => this.auth.user()?.fullName ?? 'User');
  userRole  = computed(() => this.auth.user()?.role === 'ADMIN' ? 'Admin' : 'Member');
  isAdmin   = computed(() => this.auth.isAdmin());
  userInitial = computed(() => {
    const name = this.auth.user()?.fullName ?? 'U';
    return name.charAt(0).toUpperCase();
  });

  toggleSidebar() { this.sidebarCollapsed.update(v => !v); }
  toggleMobile()  { this.mobileOpen.update(v => !v); }
  closeMobile()   { this.mobileOpen.set(false); }
  logout()        { this.auth.logout(); }

  @HostListener('window:resize')
  onResize() {
    if (window.innerWidth > 768) this.mobileOpen.set(false);
  }
}
