import { Component, OnDestroy } from '@angular/core';
import { ApiService } from '../../service/api.service';
import { RouterLink } from '@angular/router';
import { PaginationComponent } from '../../pagination/pagination.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StatusBadgeComponent } from '../../ui/status-badge.component';
import { TableSort } from '../../ui/table-sort';





@Component({
  selector: 'app-managebookings',
  imports: [PaginationComponent, CommonModule, FormsModule, RouterLink, StatusBadgeComponent],
  templateUrl: './managebookings.component.html',
  styleUrl: './managebookings.component.css'
})
export class ManagebookingsComponent implements OnDestroy {


  bookings: any[] = []; // Store all bookings
  filteredBookings: any[] = []; // Store filtered bookings based on search term
  searchTerm: string = ''; // Search term for filtering bookings
  bookingStatusFilter: string = '';
  paymentStatusFilter: string = '';
  currentPage: number = 1; // Current page for pagination
  bookingsPerPage: number = 20; // Number of bookings per page
  loading: boolean = true;
  error: string | null = null;

  sort = new TableSort<any>();
  readonly skeletonRows = Array.from({ length: 8 });

  private searchDebounce?: ReturnType<typeof setTimeout>;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.fetchBookings();
  }

  ngOnDestroy(): void {
    clearTimeout(this.searchDebounce);
  }

  // Fetch bookings data from the API
  fetchBookings(): void {
    this.loading = true;
    this.error = null;
    this.apiService.getAllBookings().subscribe({
      next: (response: any) => {
        this.bookings = (response.bookings || []).map((booking: any) => ({
          ...booking,
          nights: this.nightsBetween(booking.checkInDate, booking.checkOutDate),
        }));
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.error = error?.error?.message || 'We couldn’t load bookings. Check your connection and try again.';
      }
  });
  }

  // Debounce typing so the list doesn't re-render on every keystroke
  handleSearchChange(): void {
    clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.applyFilters(), 250);
  }

  applyFilters(): void {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredBookings = this.bookings.filter((booking) =>
      (!term || booking.bookingReference?.toLowerCase().includes(term)) &&
      (!this.bookingStatusFilter || booking.bookingStatus === this.bookingStatusFilter) &&
      (!this.paymentStatusFilter || booking.paymentStatus === this.paymentStatusFilter)
    );
    this.currentPage = 1; // Reset to the first page when filters change
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.bookingStatusFilter = '';
    this.paymentStatusFilter = '';
    this.applyFilters();
  }

  get hasFilters(): boolean {
    return !!(this.searchTerm || this.bookingStatusFilter || this.paymentStatusFilter);
  }

  toggleSort(key: string): void {
    this.sort.toggle(key);
    this.currentPage = 1;
  }

  // Handle page changes for pagination (this is the handler for the paginate event)
  onPageChange(pageNumber: number): void {
    this.currentPage = pageNumber;
  }

  // Get bookings for the current page
  get currentBookings(): any[] {
    const indexOfLastBooking = this.currentPage * this.bookingsPerPage;
    const indexOfFirstBooking = indexOfLastBooking - this.bookingsPerPage;
    return this.sort.apply(this.filteredBookings).slice(indexOfFirstBooking, indexOfLastBooking);
  }

  private nightsBetween(checkIn: string, checkOut: string): number | null {
    if (!checkIn || !checkOut) return null;
    return Math.max(0, Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000));
  }


}
