import { Component, Input, OnInit, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BookingDateService } from '../booking-date.service';
import { ApiService } from '../service/api.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.component.html',
  styleUrl: './calendar.component.css'
})
export class CalendarComponent implements OnInit, OnChanges {
  @Input() roomId: number | null = null; // For room-specific booked dates
  @Input() showRoomBookings: boolean = false; // Whether to fetch and show booked dates
  @Input() unavailableDates: string[] = []; // Unavailable dates for room type
  @Output() datesSelected = new EventEmitter<string[]>();

  currentMonth: Date = new Date();
  selectedDates: Set<string> = new Set();
  bookedDates: Set<string> = new Set();
  unavailableDatesSet: Set<string> = new Set();
  daysInMonth: Date[] = [];
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                'July', 'August', 'September', 'October', 'November', 'December'];

  constructor(
    private bookingDateService: BookingDateService,
    private apiService: ApiService
  ) {}

  ngOnInit(): void {
    // Only load previously selected dates if unavailableDates is not set (not filtering by room type)
    // If unavailableDates is set, we'll clear selected dates when it changes
    if (this.unavailableDates.length === 0) {
      const savedDates = this.bookingDateService.getSelectedDates();
      this.selectedDates = new Set(savedDates);
    } else {
      this.selectedDates = new Set();
    }
    
    this.generateCalendar();
    
    // Fetch booked dates if roomId is provided
    if (this.showRoomBookings && this.roomId) {
      this.fetchBookedDates();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['roomId'] && !changes['roomId'].firstChange) {
      if (this.showRoomBookings && this.roomId) {
        this.fetchBookedDates();
      }
    }
    if (changes['unavailableDates']) {
      // Clear selected dates when unavailable dates change (room type changed)
      if (!changes['unavailableDates'].firstChange) {
        this.selectedDates.clear();
        this.bookingDateService.setSelectedDates([]);
        this.datesSelected.emit([]);
      }
      
      this.unavailableDatesSet = new Set(this.unavailableDates || []);
      this.generateCalendar(); // Regenerate to update colors
    }
  }

  fetchBookedDates(): void {
    if (!this.roomId) return;
    
    this.apiService.getBookedDates(this.roomId.toString()).subscribe({
      next: (res: any) => {
        if (res.bookedDates && Array.isArray(res.bookedDates)) {
          this.bookedDates = new Set(res.bookedDates);
          this.generateCalendar(); // Regenerate to update colors
        }
      },
      error: (err) => {
        console.error('Error fetching booked dates:', err);
      }
    });
  }

  generateCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the first day of the week that contains the first day of month
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // End at the last day of the week that contains the last day of month
    const endDate = new Date(lastDay);
    const daysToAdd = 6 - endDate.getDay();
    endDate.setDate(endDate.getDate() + daysToAdd);
    
    this.daysInMonth = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      this.daysInMonth.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
  }

  isPastDate(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);
    return dateToCheck < today;
  }

  isBookedDate(date: Date): boolean {
    const dateStr = this.formatDate(date);
    return this.bookedDates.has(dateStr) || this.unavailableDatesSet.has(dateStr);
  }

  isSelectedDate(date: Date): boolean {
    const dateStr = this.formatDate(date);
    return this.selectedDates.has(dateStr);
  }

  isCurrentMonth(date: Date): boolean {
    return date.getMonth() === this.currentMonth.getMonth() &&
           date.getFullYear() === this.currentMonth.getFullYear();
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  toggleDate(date: Date): void {
    if (this.isPastDate(date) || this.isBookedDate(date)) {
      return; // Don't allow selection of past or booked dates
    }

    const dateStr = this.formatDate(date);
    
    if (this.selectedDates.has(dateStr)) {
      this.selectedDates.delete(dateStr);
    } else {
      this.selectedDates.add(dateStr);
    }

    // Save to service
    const datesArray = Array.from(this.selectedDates).sort();
    this.bookingDateService.setSelectedDates(datesArray);
    this.datesSelected.emit(datesArray);
  }

  previousMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() - 1, 1);
    this.generateCalendar();
  }

  nextMonth(): void {
    this.currentMonth = new Date(this.currentMonth.getFullYear(), this.currentMonth.getMonth() + 1, 1);
    this.generateCalendar();
  }

  getMonthYearString(): string {
    return `${this.monthNames[this.currentMonth.getMonth()]} ${this.currentMonth.getFullYear()}`;
  }

  getDateClass(date: Date): string {
    let classes = 'calendar-day';
    
    if (!this.isCurrentMonth(date)) {
      classes += ' other-month';
    }
    
    if (this.isPastDate(date)) {
      classes += ' past-date';
    }
    
    // Selected dates take priority - show green
    if (this.isSelectedDate(date)) {
      classes += ' selected-date';
    }
    // Only mark as booked/unavailable if not selected and has 0 rooms available
    else if (this.isBookedDate(date)) {
      classes += ' booked-date';
    }
    
    return classes;
  }
}
