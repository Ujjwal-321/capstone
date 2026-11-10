import { Injectable, signal } from '@angular/core';

export interface Toast { id: number; text: string; kind: 'info' | 'error' | 'success'; }

/** Small dark toasts at the bottom of the screen (same as the Android Snackbar style). */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  show(text: string, kind: Toast['kind'] = 'info', ms = 4000): void {
    const toast = { id: this.nextId++, text, kind };
    this.toasts.update(list => [...list.slice(-2), toast]);
    setTimeout(() => this.dismiss(toast.id), ms);
  }

  success(text: string): void { this.show(text, 'success'); }
  error(text: string): void { this.show(text, 'error', 6000); }

  dismiss(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}
