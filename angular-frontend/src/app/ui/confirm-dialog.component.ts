import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, HostListener, ViewChild } from '@angular/core';
import { ConfirmService } from './confirm.service';

@Component({
  selector: 'app-confirm-dialog',
  imports: [CommonModule],
  template: `
    <div *ngIf="confirmService.current() as dialog" class="backdrop" (click)="confirmService.close(false)">
      <div
        #panel
        class="dialog"
        [attr.role]="dialog.tone === 'danger' ? 'alertdialog' : 'dialog'"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        (click)="$event.stopPropagation()"
      >
        <div class="dialog__body">
          <div *ngIf="dialog.tone === 'danger'" class="dialog__icon" aria-hidden="true">
            <i class="fas fa-triangle-exclamation"></i>
          </div>
          <div>
            <h2 id="confirm-title" class="dialog__title">{{ dialog.title }}</h2>
            <p id="confirm-message" class="dialog__message">{{ dialog.message }}</p>
          </div>
        </div>
        <div class="dialog__actions">
          <button type="button" class="btn btn-secondary" data-autofocus (click)="confirmService.close(false)">
            {{ dialog.cancelLabel || 'Cancel' }}
          </button>
          <button
            type="button"
            class="btn"
            [class.btn-danger]="dialog.tone === 'danger'"
            [class.btn-primary]="dialog.tone !== 'danger'"
            (click)="confirmService.close(true)"
          >
            {{ dialog.confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .backdrop {
      position: fixed;
      inset: 0;
      z-index: var(--z-modal);
      display: grid;
      place-items: center;
      padding: var(--space-4);
      background: var(--color-backdrop);
      animation: fade var(--duration) var(--ease-out);
    }
    .dialog {
      width: 100%;
      max-width: 440px;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      animation: rise var(--duration) var(--ease-out);
    }
    .dialog__body { display: flex; gap: var(--space-4); padding: var(--space-5); }
    .dialog__icon {
      flex-shrink: 0;
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--color-danger-bg);
      color: var(--color-danger-fg);
    }
    .dialog__title { font-size: var(--text-md); margin-bottom: var(--space-2); }
    .dialog__message { font-size: var(--text-sm); }
    .dialog__actions {
      display: flex;
      justify-content: flex-end;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-5);
      background: var(--color-surface-muted);
      border-top: 1px solid var(--color-border);
      border-radius: 0 0 var(--radius-lg) var(--radius-lg);
    }
    @media (max-width: 479px) { .dialog__actions .btn { flex: 1; } }
    @keyframes fade { from { opacity: 0; } }
    @keyframes rise { from { opacity: 0; transform: translateY(8px) scale(0.98); } }
  `
})
export class ConfirmDialogComponent implements AfterViewChecked {
  @ViewChild('panel') panel?: ElementRef<HTMLElement>;
  private returnFocusTo: HTMLElement | null = null;
  private focused = false;

  constructor(public confirmService: ConfirmService) {}

  // Move focus into the dialog when it opens (Cancel first: the safe choice)
  // and hand it back to the trigger when it closes.
  ngAfterViewChecked(): void {
    if (this.panel && !this.focused) {
      this.returnFocusTo = document.activeElement as HTMLElement;
      this.panel.nativeElement.querySelector<HTMLElement>('[data-autofocus]')?.focus();
      this.focused = true;
    } else if (!this.panel && this.focused) {
      this.focused = false;
      this.returnFocusTo?.focus();
      this.returnFocusTo = null;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.confirmService.current() || !this.panel) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      this.confirmService.close(false);
      return;
    }

    if (event.key === 'Tab') {
      const focusable = Array.from(
        this.panel.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, select, textarea')
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }
}
