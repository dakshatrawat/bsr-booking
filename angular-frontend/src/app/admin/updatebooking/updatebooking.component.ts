import { Component } from '@angular/core';
import { ApiService } from '../../service/api.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StatusBadgeComponent, statusLabel } from '../../ui/status-badge.component';
import { ConfirmService } from '../../ui/confirm.service';
import { ToastService } from '../../ui/toast.service';



@Component({
  selector: 'app-updatebooking',
  imports: [CommonModule, FormsModule, RouterLink, StatusBadgeComponent],
  templateUrl: './updatebooking.component.html',
  styleUrl: './updatebooking.component.css'
})
export class UpdatebookingComponent {


  bookingCode: string = ''; // Booking reference from the URL
  bookingDetails: any = null; // Store booking details

  formState = {
    id: '',
    bookingStatus: '',
    paymentStatus: ''
  }; // Form state to update booking status

  loading: boolean = true;
  saving: boolean = false;
  loadError: string = '';
  error: string = '';

  readonly bookingStatuses = ['BOOKED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'];
  readonly paymentStatuses = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'REVERSED'];
  readonly label = statusLabel;

  constructor(
    private apiService: ApiService, // Your API service to interact with the backend
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private confirmService: ConfirmService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    // Get the booking code from the URL parameter
    this.bookingCode = this.activatedRoute.snapshot.paramMap.get('bookingCode') || '';

    // Fetch booking details using the API service
    this.fetchBookingDetails();
  }

  // Fetch the booking details from the API
  fetchBookingDetails(): void {
    this.loading = true;
    this.loadError = '';
    this.apiService.getBookingByReference(this.bookingCode).subscribe({
      next:(response: any) => {
        this.bookingDetails = response.booking;
        this.formState = {
          id: this.bookingDetails.id,
          bookingStatus: this.bookingDetails.bookingStatus || '',
          paymentStatus: this.bookingDetails.paymentStatus || ''
        };
        this.loading = false;
      },
      error:(error) => {
        this.loading = false;
        this.loadError = error.error?.message || 'We couldn’t load this booking. It may have been removed, or the reference is wrong.';
      }
  });
  }

  get nights(): number {
    if (!this.bookingDetails) return 0;
    return Math.max(0, Math.round((Date.parse(this.bookingDetails.checkOutDate) - Date.parse(this.bookingDetails.checkInDate)) / 86400000));
  }

  get hasChanges(): boolean {
    return !!this.bookingDetails && (
      this.formState.bookingStatus !== (this.bookingDetails.bookingStatus || '') ||
      this.formState.paymentStatus !== (this.bookingDetails.paymentStatus || '')
    );
  }

  resetForm(): void {
    this.formState = {
      id: this.bookingDetails.id,
      bookingStatus: this.bookingDetails.bookingStatus || '',
      paymentStatus: this.bookingDetails.paymentStatus || ''
    };
    this.error = '';
  }

  // Handle form submission to update the booking status
  async handleUpdate(): Promise<void> {
    if (!this.hasChanges) return;
    this.error = '';

    // Cancelling or returning money is hard to undo: confirm first
    const cancelling = this.formState.bookingStatus === 'CANCELLED' && this.bookingDetails.bookingStatus !== 'CANCELLED';
    const refunding = ['REFUNDED', 'REVERSED'].includes(this.formState.paymentStatus) && this.formState.paymentStatus !== this.bookingDetails.paymentStatus;
    if (cancelling || refunding) {
      const confirmed = await this.confirmService.confirm({
        title: cancelling ? 'Cancel this booking?' : `Mark payment as ${statusLabel(this.formState.paymentStatus).toLowerCase()}?`,
        message: cancelling
          ? `Booking ${this.bookingDetails.bookingReference} will be cancelled and the room released for these dates. The guest is not notified automatically.`
          : `This records the payment for ${this.bookingDetails.bookingReference} as ${statusLabel(this.formState.paymentStatus).toLowerCase()}. It does not move any money.`,
        confirmLabel: cancelling ? 'Cancel booking' : 'Update payment',
        cancelLabel: 'Go back',
        tone: 'danger'
      });
      if (!confirmed) return;
    }

    this.saving = true;
    this.apiService.updateBooking(this.formState).subscribe(
      () => {
        this.saving = false;
        this.toast.success('Booking updated', `${this.bookingDetails.bookingReference} is now ${statusLabel(this.formState.bookingStatus).toLowerCase()}, payment ${statusLabel(this.formState.paymentStatus).toLowerCase()}.`);
        this.router.navigate(['/admin/manage-bookings']); // Navigate back to manage bookings page
      },
      (error) => {
        this.saving = false;
        this.error = error.error?.message || 'The booking wasn’t updated. Try again, and if it keeps failing, reload the page.';
      }
    );
  }

  // Helper method to get full image URL
  getImageUrl(imagePath: string): string {
    return this.apiService.getImageUrl(imagePath);
  }

}
