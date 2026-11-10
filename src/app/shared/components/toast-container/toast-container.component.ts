import { Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'mc-toasts',
  standalone: true,
  template: `
    <div class="toasts" aria-live="polite">
      @for (t of toasts.toasts(); track t.id) {
        <div class="toast" [class.error]="t.kind === 'error'" [class.success]="t.kind === 'success'" role="status">
          <span>{{ t.text }}</span>
          <button type="button" (click)="toasts.dismiss(t.id)" aria-label="Dismiss">✕</button>
        </div>
      }
    </div>
  `,
  styles: [`
    .toasts { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 1000;
      display: flex; flex-direction: column; gap: 8px; width: min(440px, calc(100vw - 32px)); }
    .toast { display: flex; align-items: center; gap: 12px; background: #1F1B2D; color: #fff;
      border-radius: 14px; padding: 12px 14px 12px 16px; font-size: 13.5px; box-shadow: 0 12px 30px rgba(20, 10, 40, .35);
      animation: up .25s ease; border-left: 4px solid #A77BF3; }
    .toast.error { border-left-color: #FF8FA3; }
    .toast.success { border-left-color: #6FD3A2; }
    .toast span { flex: 1; }
    .toast button { background: none; border: 0; color: rgba(255,255,255,.7); cursor: pointer; font-size: 13px; }
    @keyframes up { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
  `]
})
export class ToastContainerComponent {
  readonly toasts = inject(ToastService);
}
