import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { AdminService, ToastService } from '../../core/services/api.services';
import { UserProfileResponse } from '../../core/models';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss'
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

  skeletons = [1, 2, 3, 4, 5];

  pageNums(): number[] {
    const t = this.totalPages(), c = this.currentPage();
    const pages: number[] = [];
    for (let i = Math.max(0, c - 2); i <= Math.min(t - 1, c + 2); i++) pages.push(i);
    return pages;
  }

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
