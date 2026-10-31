import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ApiService } from '../service/api.service';
import { RouterLink } from '@angular/router';
import { StatusBadgeComponent } from '../ui/status-badge.component';



@Component({
  selector: 'app-profile',
  imports: [CommonModule, RouterLink, StatusBadgeComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})

export class ProfileComponent {

  user: any = null;
  bookings: any[] = [];
  loading: boolean = true;
  bookingsLoading: boolean = true;
  error: string | null = null;
  bookingsError: string | null = null;
  readonly skeletonRows = Array.from({ length: 3 });

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.fetchUserProfile();
  }

  // Fetch user profile and bookings
  fetchUserProfile() {
    this.loading = true;
    this.error = null;
    this.apiService.myProfile().subscribe({
      next: (response: any) => {
        this.user = response.user;
        this.loading = false;
        this.fetchBookings();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'We couldn’t load your account. Check your connection and try again.';
      },
    });
  }

  fetchBookings() {
    this.bookingsLoading = true;
    this.bookingsError = null;
    this.apiService.myBookings().subscribe({
      next: (bookingResponse: any) => {
        // Upcoming stays first
        this.bookings = [...(bookingResponse.bookings || [])].sort((a, b) =>
          String(b.checkInDate).localeCompare(String(a.checkInDate)));
        this.bookingsLoading = false;
      },
      error: (err) => {
        this.bookingsLoading = false;
        this.bookingsError = err?.error?.message || 'Your bookings didn’t load.';
      },
    });
  }

  needsPayment(booking: any): boolean {
    return booking?.paymentStatus === 'PENDING' && booking?.bookingStatus === 'BOOKED';
  }

  // Helper method to get full image URL
  getImageUrl(imagePath: string): string {
    return this.apiService.getImageUrl(imagePath);
  }
}
