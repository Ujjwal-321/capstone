import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/api.services';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div *ngFor="let toast of toastSvc.toasts"
           class="toast toast-{{toast.type}}"
           (click)="toastSvc.remove(toast.id)">
        <span class="toast-icon">
          <ng-container [ngSwitch]="toast.type">
            <span *ngSwitchCase="'success'">✓</span>
            <span *ngSwitchCase="'error'">✕</span>
            <span *ngSwitchCase="'warning'">⚠</span>
            <span *ngSwitchDefault>ℹ</span>
          </ng-container>
        </span>
        <span class="toast-msg">{{ toast.message }}</span>
      </div>
    </div>
  `,
  styles: [`
    .toast-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      font-size: 0.75rem;
      font-weight: 700;
      flex-shrink: 0;

      .toast-success & { background: rgba(94,207,150,0.2); color: #5ecf96; }
      .toast-error   & { background: rgba(224,92,92,0.2);  color: #e05c5c; }
      .toast-warning & { background: rgba(201,169,110,0.2);color: var(--accent-gold); }
      .toast-info    & { background: rgba(94,207,190,0.2); color: var(--accent-teal); }
    }

    .toast-msg {
      font-size: 0.875rem;
      color: var(--text-primary);
      flex: 1;
    }

    .toast { cursor: pointer; }
  `]
})
export class ToastContainerComponent {
  toastSvc = inject(ToastService);
}
