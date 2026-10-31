import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../service/api.service';
import { CalendarComponent } from '../calendar/calendar.component';
import { BookingDateService } from '../booking-date.service';

@Component({
  selector: 'app-roomdetails',
  imports: [CommonModule, RouterLink, CalendarComponent],
  templateUrl: './roomdetails.component.html',
  styleUrl: './roomdetails.component.css'
})
export class RoomdetailsComponent implements OnInit {

  private destroyRef = inject(DestroyRef);

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private bookingDateService: BookingDateService
  ) {}

  room: any = null;
  roomId: any = '';
  selectedDates: string[] = [];
  loading = false;
  loadError = '';
  imageFailed = false;
  booking = false;
  error = '';

  ngOnInit(): void {
    this.roomId = this.route.snapshot.paramMap.get('id');

    if (this.roomId) {
      this.fetchRoomDetails(this.roomId);
    } else {
      this.loadError = "This link doesn't point to a room.";
    }

    // Dates picked on the search screen carry over to this page
    this.selectedDates = this.bookingDateService.getSelectedDates();
    this.bookingDateService.selectedDates$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(dates => this.selectedDates = dates);
  }

  fetchRoomDetails(roomId: string): void {
    this.loading = true;
    this.loadError = '';
    this.apiService.getRoomById(roomId).subscribe({
      next: (res: any) => {
        this.room = res.room;
        this.imageFailed = false;
        this.loading = false;
        if (!this.room) this.loadError = "This room doesn't exist or has been removed.";
      },
      error: (err) => {
        this.loading = false;
        this.loadError = err?.error?.message || 'Check your connection and try again.';
      }
    });
  }

  onDatesSelected(dates: string[]): void {
    this.selectedDates = dates;
    this.error = '';
  }

  private get sortedDates(): string[] {
    return [...this.selectedDates].sort();
  }

  get checkInDate(): string | null {
    return this.sortedDates[0] ?? null;
  }

  // Check-out is the morning after the last selected night
  get checkOutDate(): string | null {
    const dates = this.sortedDates;
    if (dates.length === 0) return null;
    const last = new Date(dates[dates.length - 1]);
    last.setDate(last.getDate() + 1);
    return last.toISOString().split('T')[0];
  }

  get totalPrice(): number {
    return (this.room?.pricePerNight || 0) * this.selectedDates.length;
  }

  acceptBooking(): void {
    if (!this.room || this.selectedDates.length === 0 || this.booking) return;

    this.booking = true;
    this.error = '';
    const body = {
      checkInDate: this.checkInDate,
      checkOutDate: this.checkOutDate,
      roomId: this.roomId
    };

    this.apiService.bookRoom(body).subscribe({
      next: (res: any) => {
        this.booking = false;
        if (res.status === 200 && res.booking) {
          this.router.navigate(['/payment', res.booking.bookingReference, res.booking.totalPrice]);
        } else {
          this.error = res?.message || "We couldn't create your booking. Try again.";
        }
      },
      error: (err) => {
        this.booking = false;
        this.error = err?.error?.message || err?.message || "We couldn't create your booking. Try again.";
      }
    });
  }

  getImageUrl(imagePath: string): string {
    return this.apiService.getImageUrl(imagePath);
  }
}
