import { Injectable, signal } from '@angular/core';

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
}

// Success/info toasts auto-dismiss; errors stay until the user closes them.
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly toasts = signal<Toast[]>([]);

  success(title: string, message?: string): void {
    this.show({ tone: 'success', title, message }, 4000);
  }

  info(title: string, message?: string): void {
    this.show({ tone: 'info', title, message }, 5000);
  }

  error(title: string, message?: string): void {
    this.show({ tone: 'error', title, message });
  }

  dismiss(id: number): void {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }

  private show(toast: Omit<Toast, 'id'>, autoDismissMs?: number): void {
    const id = this.nextId++;
    // Cap the stack so a burst of errors can't cover the page
    this.toasts.update(list => [...list.slice(-2), { ...toast, id }]);
    if (autoDismissMs) {
      setTimeout(() => this.dismiss(id), autoDismissMs);
    }
  }
}
