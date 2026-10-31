import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ApiService } from '../../service/api.service';
import { RouterLink } from '@angular/router';


@Component({
  selector: 'app-adminhome',
  imports: [CommonModule, RouterLink],
  templateUrl: './adminhome.component.html',
  styleUrl: './adminhome.component.css'
})
export class AdminhomeComponent {

  adminName: string = '';
  error: string | null = null;
  today: Date = new Date();

  // Today's operational snapshot, derived from the bookings list
  statsLoading: boolean = true;
  stats = { arrivalsToday: 0, inHouse: 0, paymentPending: 0, upcomingWeek: 0 };

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.fetchAdminName();
    this.fetchStats();
  }

  // Fetch the admin's profile name
  fetchAdminName(): void {
    this.apiService.myProfile().subscribe({
      next: (resp: any) => {
        this.adminName = resp.user.firstName;
      },
      error: () => {
        this.adminName = '';
      },
    });
  }

  fetchStats(): void {
    this.statsLoading = true;
    this.error = null;
    this.apiService.getAllBookings().subscribe({
      next: (resp: any) => {
        const bookings: any[] = resp.bookings || [];
        const today = this.isoDate(new Date());
        const inAWeek = this.isoDate(new Date(Date.now() + 7 * 86400000));
        const active = bookings.filter(b => b.bookingStatus !== 'CANCELLED');
        this.stats = {
          arrivalsToday: active.filter(b => b.bookingStatus === 'BOOKED' && b.checkInDate === today).length,
          inHouse: active.filter(b => b.bookingStatus === 'CHECKED_IN').length,
          paymentPending: active.filter(b => b.paymentStatus === 'PENDING').length,
          upcomingWeek: active.filter(b => b.bookingStatus === 'BOOKED' && b.checkInDate > today && b.checkInDate <= inAWeek).length,
        };
        this.statsLoading = false;
      },
      error: (err) => {
        this.statsLoading = false;
        this.error = err?.error?.message || 'We couldn’t load today’s numbers.';
      },
    });
  }

  private isoDate(date: Date): string {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  }

}
