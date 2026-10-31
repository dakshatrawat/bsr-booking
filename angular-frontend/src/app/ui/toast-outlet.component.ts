import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-outlet',
  imports: [CommonModule],
  template: `
    <!-- Two live regions: polite for confirmations, assertive for errors -->
    <div class="toast-stack" role="status" aria-live="polite">
      <ng-container *ngFor="let toast of toastService.toasts()">
        <div *ngIf="toast.tone !== 'error'" class="toast" [class]="'toast toast--' + toast.tone">
          <i class="fas" [class.fa-circle-check]="toast.tone === 'success'" [class.fa-circle-info]="toast.tone === 'info'" aria-hidden="true"></i>
          <div class="toast__body">
            <strong class="toast__title">{{ toast.title }}</strong>
            <span *ngIf="toast.message" class="toast__message">{{ toast.message }}</span>
          </div>
          <button type="button" class="toast__close" (click)="toastService.dismiss(toast.id)" aria-label="Dismiss notification">
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
      </ng-container>
    </div>
    <div class="toast-stack toast-stack--errors" role="alert" aria-live="assertive">
      <ng-container *ngFor="let toast of toastService.toasts()">
        <div *ngIf="toast.tone === 'error'" class="toast toast--error">
          <i class="fas fa-circle-exclamation" aria-hidden="true"></i>
          <div class="toast__body">
            <strong class="toast__title">{{ toast.title }}</strong>
            <span *ngIf="toast.message" class="toast__message">{{ toast.message }}</span>
          </div>
          <button type="button" class="toast__close" (click)="toastService.dismiss(toast.id)" aria-label="Dismiss error">
            <i class="fas fa-xmark" aria-hidden="true"></i>
          </button>
        </div>
      </ng-container>
    </div>
  `,
  styles: `
    :host {
      position: fixed;
      right: var(--space-4);
      bottom: var(--space-4);
      left: var(--space-4);
      z-index: var(--z-toast);
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: var(--space-2);
      pointer-events: none;
    }
    /* Desktop: top-right under the header, clear of the chat panel */
    @media (min-width: 640px) {
      :host { left: auto; bottom: auto; top: calc(var(--navbar-h) + var(--space-4)); width: 380px; }
    }
    /* Phone: above the chat launcher */
    @media (max-width: 639px) { :host { bottom: 88px; } }
    .toast-stack { display: contents; }
    .toast {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: var(--space-3);
      width: 100%;
      padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
      background: var(--color-surface);
      color: var(--color-text);
      border: 1px solid var(--color-border);
      border-left: 4px solid var(--tone);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      font-size: var(--text-sm);
      animation: toast-in var(--duration) var(--ease-out);
    }
    .toast > i { color: var(--tone); margin-top: 3px; }
    .toast--success { --tone: var(--color-success-fg); }
    .toast--info { --tone: var(--color-info-fg); }
    .toast--error { --tone: var(--color-danger-fg); }
    .toast__body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
    .toast__title { font-weight: var(--weight-semibold); }
    .toast__message { color: var(--color-text-muted); overflow-wrap: anywhere; }
    .toast__close {
      flex-shrink: 0;
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      margin: -4px -4px -4px 0;
      border-radius: var(--radius-sm);
      color: var(--color-text-subtle);
    }
    .toast__close:hover { background: var(--color-surface-muted); color: var(--color-text); }
    @keyframes toast-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  `
})
export class ToastOutletComponent {
  constructor(public toastService: ToastService) {}
}
