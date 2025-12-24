import { Component } from '@angular/core';
import { ApiService } from '../../service/api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

declare var Razorpay: any;

@Component({
  selector: 'app-paymentpage',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './paymentpage.component.html',
  styleUrl: './paymentpage.component.css',
})
export class PaymentpageComponent {
  razorpayOrderId: string | null = null;
  error: any = null;
  processing: boolean = false;

  bookingReference: string | null = null;
  amount: number | null = null;

  // Razorpay key ID (from backend config: rzp_test_Rv2hCde67jeidW)
  razorpayKeyId: string = 'rzp_test_Rv2hCde67jeidW';

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.bookingReference =
      this.route.snapshot.paramMap.get('bookingReference');
    this.amount = parseFloat(this.route.snapshot.paramMap.get('amount') || '0');

    // Fetch Razorpay order ID from backend
    this.fetchRazorpayOrderId();
  }

  fetchRazorpayOrderId(): void {
    if (!this.bookingReference || !this.amount) {
      this.showError('Invalid booking reference or amount');
      return;
    }

    const paymentData = {
      bookingReference: this.bookingReference,
      amount: this.amount,
    };

    this.apiService.proceedForPayment(paymentData).subscribe({
      next: (orderId: any) => {
        console.log('Payment order response:', orderId);
        // Backend returns order ID as string directly
        if (typeof orderId === 'string') {
          if (orderId.startsWith('order_')) {
            this.razorpayOrderId = orderId;
            console.log('Razorpay Order ID: ' + orderId);
          } else if (orderId.startsWith('Error:')) {
            this.showError(orderId);
          } else {
            this.razorpayOrderId = orderId;
            console.log('Razorpay Order ID: ' + orderId);
          }
        } else {
          this.showError('Invalid response from server');
        }
      },
      error: (err: any) => {
        console.error('Payment order creation error:', err);
        console.error('Error details:', JSON.stringify(err));
        let errorMessage = 'Failed to create payment order';
        if (err?.error) {
          errorMessage = typeof err.error === 'string' ? err.error : (err.error.message || errorMessage);
        } else if (err?.message) {
          errorMessage = err.message;
        }
        this.showError(errorMessage);
      },
    });
  }

  showError(msg: any): void {
    this.error = msg;
    setTimeout(() => {
      this.error = '';
    }, 5000);
  }

  // This is the method to call when a user clicks on pay now
  handleSubmit(event: Event) {
    event.preventDefault();

    if (!this.razorpayOrderId || !this.bookingReference || !this.amount || this.processing) {
      this.showError('Please wait while we prepare your payment');
      return;
    }

    if (!Razorpay) {
      this.showError('Razorpay SDK not loaded. Please refresh the page.');
      return;
    }

    this.processing = true;

    const options = {
      key: this.razorpayKeyId,
      amount: Math.round(this.amount * 100), // Convert to paise (INR)
      currency: 'INR',
      name: 'Hotel Booking',
      description: `Payment for booking ${this.bookingReference}`,
      order_id: this.razorpayOrderId,
      handler: (response: any) => {
        console.log('Payment Success Response:', response);
        this.processing = false;
        
        // Update booking payment status with success
        this.handleUpdateBookingPayment(
          true,
          response.razorpay_payment_id,
          ''
        );
        
        this.router.navigate([`/payment-success/${this.bookingReference}`]);
      },
      prefill: {
        // You can prefill customer details if available
      },
      notes: {
        bookingReference: this.bookingReference,
      },
      theme: {
        color: '#007F86',
      },
      modal: {
        ondismiss: () => {
          this.processing = false;
          console.log('Payment modal closed');
        },
      },
    };

    const razorpayInstance = new Razorpay(options);

    razorpayInstance.on('payment.failed', (response: any) => {
      console.log('Payment Failed Response:', response);
      this.processing = false;
      
      const failureReason = response.error?.description || response.error?.reason || 'Payment failed';
      
      // Update booking payment status with failure
      this.handleUpdateBookingPayment(
        false,
        '',
        failureReason
      );
      
      this.showError(failureReason);
      this.router.navigate([`/payment-failue/${this.bookingReference}`]);
    });

    razorpayInstance.open();
  }

  handleUpdateBookingPayment(
    success: boolean,
    transactionId: string = '',
    failureReason: string = ''
  ) {
    console.log('Updating payment status');
    if (!this.bookingReference || !this.amount) return;

    console.log('BOOKING REFERENCE: ' + this.bookingReference);
    console.log('BOOKING AMOUNT: ' + this.amount);
    console.log('Payment success: ' + success);
    console.log('Transaction ID: ' + transactionId);
    console.log('Failure Reason: ' + failureReason);

    const paymentData = {
      bookingReference: this.bookingReference,
      amount: this.amount,
      transactionId,
      success: success,
      failureReason,
    };

    this.apiService.updateBookingPayment(paymentData).subscribe({
      next: (res: any) => {
        console.log('Payment status updated:', res);
      },
      error: (err) => {
        this.showError(
          err?.error?.message || err?.message || 'Error updating payment status'
        );
        console.error(err);
      },
    });
  }
}
