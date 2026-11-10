import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject, Subscription, debounceTime } from 'rxjs';
import { ApiService, SpringPage } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { UserProfile } from '../../core/models';
import { avatarEmoji } from '../../core/utils/avatar';
import { errorMessage } from '../../core/utils/errors';

/** Admin: search accounts and deactivate / reactivate them. Admins never see anyone's moments. */
@Component({
  selector: 'mc-admin',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="page">
      <div class="page-head">
        <div><p class="eyebrow">Admin</p><h1>Accounts</h1></div>
        <input class="input search" type="search" placeholder="Search name or email…" [ngModel]="keyword" (ngModelChange)="onSearch($event)" aria-label="Search accounts" />
      </div>

      <section class="card">
        @if (error()) { <div class="form-error">{{ error() }}</div> }
        <div class="table-wrap">
          <table>
            <thead><tr><th>User</th><th>Role</th><th>Email</th><th>Time zone</th><th class="right">Access</th></tr></thead>
            <tbody>
              @if (page() === null) {
                <tr><td colspan="5"><div class="skeleton" style="height: 120px"></div></td></tr>
              } @else {
                @for (u of page()!.content; track u.userId) {
                  <tr>
                    <td><span class="emoji av">{{ avatar(u.avatarUrl) }}</span> <b>{{ u.fullName }}</b></td>
                    <td><span class="chip" [class.pink]="u.role === 'ADMIN'">{{ u.role }}</span></td>
                    <td>{{ u.email }} @if (!u.emailVerified) { <span class="hint">· unverified</span> }</td>
                    <td class="muted">{{ u.timezone || '–' }}</td>
                    <td class="right">
                      @if (u.userId !== me()) {
                        <button type="button" class="btn ghost small" (click)="deactivate(u)" [disabled]="busy() === u.userId">Deactivate</button>
                        <button type="button" class="btn ghost small" (click)="reactivate(u)" [disabled]="busy() === u.userId">Reactivate</button>
                      } @else { <span class="hint">you</span> }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="5"><div class="empty"><span class="big">🔍</span><h3>No accounts found</h3></div></td></tr>
                }
              }
            </tbody>
          </table>
        </div>
        @if (page(); as p) {
          @if (p.totalPages > 1) {
            <div class="pager">
              <button type="button" class="btn ghost small" (click)="go(p.number - 1)" [disabled]="p.first">← Previous</button>
              <span class="muted">Page {{ p.number + 1 }} of {{ p.totalPages }} · {{ p.totalElements }} accounts</span>
              <button type="button" class="btn ghost small" (click)="go(p.number + 1)" [disabled]="p.last">Next →</button>
            </div>
          }
        }
        <p class="hint note">🔒 Admins can manage access but never see anyone's moments, reflections or capsules.</p>
      </section>
    </div>
  `,
  styles: [`
    .eyebrow { font-size: 13px; color: var(--text-2); }
    .search { max-width: 320px; }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 13.5px; }
    th { text-align: left; font-size: 11.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--text-2); padding: 8px 10px; border-bottom: 1px solid var(--stroke); }
    td { padding: 12px 10px; border-bottom: 1px solid var(--stroke); white-space: nowrap; }
    .right { text-align: right; }
    td.right .btn + .btn { margin-left: 6px; }
    .av { font-size: 20px; margin-right: 6px; }
    .pager { display: flex; justify-content: space-between; align-items: center; margin-top: 14px; gap: 10px; }
    .note { margin-top: 14px; }
  `]
})
export class AdminComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  keyword = '';
  readonly page = signal<SpringPage<UserProfile> | null>(null);
  readonly error = signal('');
  readonly busy = signal<number | null>(null);
  readonly me = () => this.auth.user()?.userId;
  private search$ = new Subject<string>();
  private sub?: Subscription;

  ngOnInit(): void {
    this.sub = this.search$.pipe(debounceTime(300)).subscribe(() => this.go(0));
    this.go(0);
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onSearch(v: string): void {
    this.keyword = v;
    this.search$.next(v);
  }

  go(n: number): void {
    this.error.set('');
    this.api.adminUsers(this.keyword.trim(), Math.max(0, n)).subscribe({
      next: p => this.page.set(p),
      error: err => { this.page.set({ content: [], number: 0, size: 10, totalElements: 0, totalPages: 0, first: true, last: true }); this.error.set(errorMessage(err)); }
    });
  }

  deactivate(u: UserProfile): void {
    if (!confirm(`Deactivate ${u.fullName}? They'll be signed out everywhere.`)) return;
    this.run(u, this.api.deactivateUser(u.userId), `${u.fullName} deactivated`);
  }

  reactivate(u: UserProfile): void {
    this.run(u, this.api.reactivateUser(u.userId), `${u.fullName} reactivated`);
  }

  avatar = avatarEmoji;

  private run(u: UserProfile, req: ReturnType<ApiService['deactivateUser']>, done: string): void {
    this.busy.set(u.userId);
    req.subscribe({
      next: () => { this.busy.set(null); this.toast.success(done); },
      error: err => { this.busy.set(null); this.toast.error(errorMessage(err)); }
    });
  }
}
