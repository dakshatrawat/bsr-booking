import { Component, Input } from '@angular/core';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

// Booking and payment statuses from the API, mapped to colour + icon + plain label
// so status is never conveyed by colour alone.
const STATUS: Record<string, { tone: Tone; icon: string; label: string }> = {
  BOOKED:      { tone: 'info',    icon: 'fa-calendar-check',     label: 'Booked' },
  CHECKED_IN:  { tone: 'success', icon: 'fa-door-open',          label: 'Checked in' },
  CHECKED_OUT: { tone: 'neutral', icon: 'fa-door-closed',        label: 'Checked out' },
  CANCELLED:   { tone: 'danger',  icon: 'fa-ban',                label: 'Cancelled' },
  PENDING:     { tone: 'warning', icon: 'fa-clock',              label: 'Pending' },
  COMPLETED:   { tone: 'success', icon: 'fa-check',              label: 'Paid' },
  FAILED:      { tone: 'danger',  icon: 'fa-circle-exclamation', label: 'Failed' },
  REFUNDED:    { tone: 'neutral', icon: 'fa-rotate-left',        label: 'Refunded' },
  REVERSED:    { tone: 'neutral', icon: 'fa-rotate-left',        label: 'Reversed' },
};

export function statusLabel(status: string | null | undefined): string {
  if (!status) return 'Unknown';
  return STATUS[status]?.label ?? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ');
}

@Component({
  selector: 'app-status-badge',
  template: `
    <span class="badge" [class]="'badge badge--' + config.tone">
      <i class="fas" [class]="'fas ' + config.icon" aria-hidden="true"></i>
      {{ config.label }}
    </span>
  `
})
export class StatusBadgeComponent {
  @Input() status: string | null | undefined = '';

  get config(): { tone: Tone; icon: string; label: string } {
    return (this.status && STATUS[this.status]) || { tone: 'neutral', icon: 'fa-circle', label: statusLabel(this.status) };
  }
}
