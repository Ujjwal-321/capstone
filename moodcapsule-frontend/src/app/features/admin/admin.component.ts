import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { AdminService, ToastService } from '../../core/services/api.services';
import { UserProfileResponse } from '../../core/models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="admin-page">
      <div class="page-top animate-fadeInUp">
        <div class="admin-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
          Admin Panel
        </div>
        <h1>User Management</h1>
        <p class="page-sub">Search, view, and manage all registered users.</p>
      </div>

      <!-- Search Bar -->
      <div class="search-bar mc-card animate-fadeInUp delay-1">
        <div class="search-input-wrap">
          <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
          <input class="form-control search-input" type="text" [formControl]="searchCtrl"
            placeholder="Search by name or email…" (keyup.enter)="search()" />
        </div>
        <button class="btn btn-primary" (click)="search()">Search</button>
      </div>

      <!-- Stats Row -->
      <div class="admin-stats animate-fadeInUp delay-2">
        <div class="admin-stat">
          <span class="as-val">{{ totalElements() }}</span>
          <span class="as-label">Total Users</span>
        </div>
        <div class="admin-stat">
          <span class="as-val">{{ verifiedCount() }}</span>
          <span class="as-label">Verified</span>
        </div>
      </div>

      <!-- Loading -->
      <div class="user-loading" *ngIf="loading()">
        <div class="skeleton user-skel" *ngFor="let i of [1,2,3,4,5]"></div>
      </div>

      <!-- Table -->
      <div class="users-table mc-card animate-fadeInUp delay-3" *ngIf="!loading()">
        <table>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Status</th>
              <th>Verified</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users()">
              <td>
                <div class="user-cell">
                  <div class="user-av">{{ user.fullName.charAt(0).toUpperCase() }}</div>
                  <div class="user-meta">
                    <span class="u-name">{{ user.fullName }}</span>
                    <span class="u-email">{{ user.email }}</span>
                  </div>
                </div>
              </td>
              <td><span class="badge" [class]="user.role === 'ADMIN' ? 'badge-teal' : 'badge-gold'">{{ user.role }}</span></td>
              <td>
                <span class="status-dot" [class.active]="true">● Active</span>
              </td>
              <td>
                <span class="verified-badge" *ngIf="user.emailVerified">✓</span>
                <span class="unverified-badge" *ngIf="!user.emailVerified">✗</span>
              </td>
              <td>
                <div class="action-btns">
                  <button class="btn btn-danger btn-sm" (click)="deactivate(user.userId!)"
                    [disabled]="acting()">Deactivate</button>
                  <button class="btn btn-secondary btn-sm" (click)="reactivate(user.userId!)"
                    [disabled]="acting()">Reactivate</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="empty-state" *ngIf="users().length === 0">
          <span class="empty-icon">👥</span>
          <h3>No users found</h3>
          <p>Try a different search term.</p>
        </div>

        <!-- Pagination -->
        <div class="table-footer" *ngIf="totalPages() > 1">
          <span class="table-info">Showing {{ users().length }} of {{ totalElements() }} users</span>
          <div class="pagination">
            <button class="page-btn" [disabled]="currentPage() === 0" (click)="goTo(currentPage() - 1)">‹</button>
            <button class="page-btn" *ngFor="let p of pageNums()" [class.active]="p === currentPage()" (click)="goTo(p)">{{ p + 1 }}</button>
            <button class="page-btn" [disabled]="currentPage() === totalPages() - 1" (click)="goTo(currentPage() + 1)">›</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-page { max-width: 1000px; }
    .page-top { margin-bottom: var(--space-8); }
    .page-top h1 { font-family: var(--font-display); font-size: clamp(1.8rem, 3vw, 2.4rem); margin-bottom: 8px; }
    .page-sub { color: var(--text-secondary); font-size: 0.95rem; }

    .admin-badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(94,207,190,0.1); border: 1px solid rgba(94,207,190,0.25);
      color: var(--accent-teal); font-size: 0.72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.1em; padding: 5px 14px; border-radius: var(--radius-full); margin-bottom: 12px;
    }

    .search-bar { display: flex; gap: var(--space-4); align-items: center; margin-bottom: var(--space-5); }
    .search-input-wrap { flex: 1; position: relative;
      .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
    }
    .search-input { padding-left: 40px; }

    .admin-stats { display: flex; gap: var(--space-5); margin-bottom: var(--space-6); }
    .admin-stat { display: flex; flex-direction: column; gap: 3px; }
    .as-val   { font-family: var(--font-display); font-size: 1.6rem; font-weight: 700; color: var(--text-primary); }
    .as-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }

    .user-loading { display: flex; flex-direction: column; gap: 8px; }
    .user-skel    { height: 60px; border-radius: var(--radius-md); }

    .users-table { padding: 0; overflow: hidden; }

    table { width: 100%; border-collapse: collapse; }
    thead tr { border-bottom: 1px solid var(--border-subtle); }
    thead th {
      padding: 14px 20px; text-align: left; font-size: 0.7rem; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted);
    }
    tbody tr {
      border-bottom: 1px solid var(--border-subtle); transition: background var(--transition-fast);
      &:last-child { border-bottom: none; }
      &:hover { background: var(--bg-elevated); }
    }
    tbody td { padding: 14px 20px; }

    .user-cell { display: flex; align-items: center; gap: 10px; }
    .user-av {
      width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, var(--accent-gold-dk), var(--accent-gold));
      display: flex; align-items: center; justify-content: center;
      font-size: 0.8rem; font-weight: 700; color: var(--bg-base);
    }
    .user-meta { display: flex; flex-direction: column; gap: 1px; }
    .u-name  { font-size: 0.875rem; color: var(--text-primary); font-weight: 500; }
    .u-email { font-size: 0.72rem; color: var(--text-muted); }

    .status-dot { font-size: 0.78rem; color: #5ecf96; }
    .verified-badge   { color: #5ecf96; font-size: 1rem; }
    .unverified-badge { color: #e05c5c; font-size: 1rem; }

    .action-btns { display: flex; gap: 6px; }

    .table-footer { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-top: 1px solid var(--border-subtle); }
    .table-info { font-size: 0.78rem; color: var(--text-muted); }

    @media (max-width: 768px) {
      table { display: block; overflow-x: auto; }
      .search-bar { flex-direction: column; .btn { width: 100%; } }
    }
  `]
})
export class AdminComponent implements OnInit {
  private adminSvc = inject(AdminService);
  private toast    = inject(ToastService);
  private fb       = inject(FormBuilder);

  loading       = signal(true);
  acting        = signal(false);
  users         = signal<UserProfileResponse[]>([]);
  totalElements = signal(0);
  totalPages    = signal(0);
  currentPage   = signal(0);

  verifiedCount = computed(() => this.users().filter(u => u.emailVerified).length);

  searchCtrl = this.fb.control('');

  pageNums = () => {
    const t = this.totalPages(), c = this.currentPage();
    const pages: number[] = [];
    for (let i = Math.max(0, c - 2); i <= Math.min(t - 1, c + 2); i++) pages.push(i);
    return pages;
  };

  ngOnInit() { this.fetch(0); }

  search() { this.fetch(0); }

  fetch(page: number) {
    this.loading.set(true);
    this.adminSvc.getUsers(this.searchCtrl.value ?? '', page, 10).subscribe({
      next: r => {
        this.users.set(r.data.content);
        this.totalElements.set(r.data.totalElements);
        this.totalPages.set(r.data.totalPages);
        this.currentPage.set(page);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  goTo(p: number) { this.fetch(p); }

  deactivate(id: number) {
    this.acting.set(true);
    this.adminSvc.deactivateUser(id).subscribe({
      next: () => { this.toast.success('User deactivated.'); this.fetch(this.currentPage()); this.acting.set(false); },
      error: err => { this.toast.error(err?.error?.message || 'Failed.'); this.acting.set(false); }
    });
  }

  reactivate(id: number) {
    this.acting.set(true);
    this.adminSvc.reactivateUser(id).subscribe({
      next: () => { this.toast.success('User reactivated. ✓'); this.fetch(this.currentPage()); this.acting.set(false); },
      error: err => { this.toast.error(err?.error?.message || 'Failed.'); this.acting.set(false); }
    });
  }
}
