import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

interface ConfirmRequest extends ConfirmOptions {
  resolve: (confirmed: boolean) => void;
}

// Promise-based replacement for window.confirm. Only one dialog is shown at a time.
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly current = signal<ConfirmRequest | null>(null);

  confirm(options: ConfirmOptions): Promise<boolean> {
    this.current()?.resolve(false);
    return new Promise(resolve => this.current.set({ ...options, resolve }));
  }

  close(confirmed: boolean): void {
    const request = this.current();
    if (!request) return;
    this.current.set(null);
    request.resolve(confirmed);
  }
}
