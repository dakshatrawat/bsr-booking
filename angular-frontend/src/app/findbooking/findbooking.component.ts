import { Component } from '@angular/core';
import { ApiService } from '../service/api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StatusBadgeComponent } from '../ui/status-badge.component';



@Component({
  selector: 'app-findbooking',
  imports: [CommonModule, FormsModule, StatusBadgeComponent],
  templateUrl: './findbooking.component.html',
  styleUrl: './findbooking.component.css'
})
export class FindbookingComponent {

  constructor(private apiService: ApiService){}

  confirmationCode: string = '';
  bookingDetails: any = null;
  error: string = '';
  searching: boolean = false;

  handleSearch(){
    const code = this.confirmationCode.trim();
    if (!code) {
      this.error = 'Enter the booking reference from your confirmation email.';
      return;
    }

    this.error = '';
    this.searching = true;
    this.apiService.getBookingByReference(code).subscribe({
      next: (res) => {
        this.searching = false;
        this.bookingDetails = res.booking;
      },
      error: (err) => {
        this.searching = false;
        this.bookingDetails = null;
        this.error = err?.status === 404 || err?.status === 400
          ? `We couldn’t find a booking with reference ${code}. Check it against your confirmation email.`
          : err?.error?.message || 'Something went wrong looking up that booking. Try again in a moment.';
      },
    })
  }

  get nights(): number {
    if (!this.bookingDetails) return 0;
    return Math.max(0, Math.round((Date.parse(this.bookingDetails.checkOutDate) - Date.parse(this.bookingDetails.checkInDate)) / 86400000));
  }

  // Helper method to get full image URL
  getImageUrl(imagePath: string): string {
    return this.apiService.getImageUrl(imagePath);
  }

}
