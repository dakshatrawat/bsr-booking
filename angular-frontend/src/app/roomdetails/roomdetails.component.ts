import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../service/api.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CalendarComponent } from '../calendar/calendar.component';
import { BookingDateService } from '../booking-date.service';

@Component({
  selector: 'app-roomdetails',
  imports: [CommonModule, FormsModule, CalendarComponent],
  templateUrl: './roomdetails.component.html',
  styleUrl: './roomdetails.component.css'
})

export class RoomdetailsComponent {

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private bookingDateService: BookingDateService
  ){}

  room: any = null;
  roomId: any = '';
  selectedDates: string[] = [];
  totalPrice: number = 0;
  totalDaysToStay: number = 0;
  showDatePicker: boolean = false;
  showBookingPreview: boolean = false;
  message: any = null;
  error: any = null;
  
  ngOnInit():void{
    this.roomId = this.route.snapshot.paramMap.get('id');
    
    if (this.roomId) {
      this.fetchRoomDetails(this.roomId);
    }

    // Load selected dates from service
    this.selectedDates = this.bookingDateService.getSelectedDates();
    
    // Subscribe to date changes
    this.bookingDateService.selectedDates$.subscribe(dates => {
      this.selectedDates = dates;
    });
  }

  fetchRoomDetails(roomId: string): void{
    this.apiService.getRoomById(roomId).subscribe({
      next:(res: any) =>{
        this.room = res.room
      },
      error: (err) => {
        this.showError(err?.error?.message || "Unable to fetch room details")
      }
    })
  }

  showError(err: any): void{
    console.log(err)
    this.error = err;
    setTimeout(() => {
      this.error = ''
    }, 5000)
  }

  onDatesSelected(dates: string[]): void {
    this.selectedDates = dates;
  }

  calculateTotalPrice(): number {
    if (this.selectedDates.length === 0) return 0;

    // Calculate days based on selected dates
    this.totalDaysToStay = this.selectedDates.length;

    return this.room?.pricePerNight * this.totalDaysToStay || 0;
  }

  handleConfirmation(): void{
    if(this.selectedDates.length === 0){
      this.showError("Please select at least one date");
      return;
    }

    this.totalPrice = this.calculateTotalPrice();
    this.showBookingPreview = true;
  }

  acceptBooking():void{
    if(!this.room || this.selectedDates.length === 0) return

    // Get check-in (earliest) and check-out (latest) dates from selected dates
    const sortedDates = [...this.selectedDates].sort();
    const formattedCheckInDate = sortedDates[0];
    
    // For check-out, add one day to the last selected date (exclusive)
    const lastDate = new Date(sortedDates[sortedDates.length - 1]);
    lastDate.setDate(lastDate.getDate() + 1);
    const formattedCheckOutDate = lastDate.toISOString().split('T')[0];

    console.log("check in date is: "+ formattedCheckInDate);
    console.log("check out date is: " + formattedCheckOutDate);

    //we are building our body object
    const booking = {
      checkInDate: formattedCheckInDate,
      checkOutDate: formattedCheckOutDate,
      roomId: this.roomId
    };

    this.apiService.bookRoom(booking).subscribe({
      next: (res: any) =>{
        if (res.status === 200 && res.booking) {
          // Get booking reference and total price from response
          const bookingReference = res.booking.bookingReference;
          const totalPrice = res.booking.totalPrice;
          
          // Redirect to payment page
          this.router.navigate(['/payment', bookingReference, totalPrice]);
        }
      },
      error:(err) =>{
        this.showError(err?.error?.message || err?. message || "Unable to make a booking")
      }
    })
  }

  cancelBookingPreview():void{
    this.showBookingPreview = false
  }

  get isLoading():boolean{
    return !this.room
  }

  // Helper method to get full image URL
  getImageUrl(imagePath: string): string {
    return this.apiService.getImageUrl(imagePath);
  }

  // Handle image loading errors
  onImageError(event: any): void {
    console.error('Image failed to load:', event.target.src);
    event.target.src = '/assets/placeholder-room.jpg'; // Fallback to placeholder
  }

}

