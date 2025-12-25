import { Component, EventEmitter, OnInit, Output, HostListener, ElementRef, ViewChild } from '@angular/core';
import { ApiService } from '../service/api.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CalendarComponent } from '../calendar/calendar.component';
import { BookingDateService } from '../booking-date.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-roomsearch',
  imports: [CommonModule, FormsModule, CalendarComponent],
  templateUrl: './roomsearch.component.html',
  styleUrl: './roomsearch.component.css'
})

export class RoomsearchComponent implements OnInit {

  @Output() searchResults = new EventEmitter<any[]>(); // Emit the results
  @ViewChild('calendarField', { static: false }) calendarField!: ElementRef;

  roomType: string = ''; // Selected room type
  roomTypes: string[] = []; // Available room types
  error: any = null;
  showCalendar: boolean = false;
  selectedDates: string[] = [];
  unavailableDates: string[] = []; // Dates with 0 rooms available for selected room type
  totalRoomsOfType: number = 0; // Total rooms of selected type

  constructor(
    private apiService: ApiService,
    private bookingDateService: BookingDateService,
    private elementRef: ElementRef
  ) {}

  ngOnInit(): void {
    this.fetchRoomTypes();
    // Subscribe to selected dates changes
    this.bookingDateService.selectedDates$.subscribe(dates => {
      this.selectedDates = dates;
    });
    // Load existing selected dates
    this.selectedDates = this.bookingDateService.getSelectedDates();
  }

  fetchRoomTypes() {
    this.apiService.getRoomTypes().subscribe({
      next: (types: any) => {
        this.roomTypes = types;
      },
      error: (err:any) => {
        this.showError(
          err?.error?.message || 'Error Fetching Room Types: ' + err
        );
        console.error(err);
      },
    });
  }

  onRoomTypeChange(): void {
    // Clear selected dates when room type changes
    this.selectedDates = [];
    this.bookingDateService.setSelectedDates([]);
    
    if (this.roomType) {
      this.fetchUnavailableDates();
    } else {
      this.unavailableDates = [];
    }
  }

  fetchUnavailableDates(): void {
    if (!this.roomType) {
      this.unavailableDates = [];
      this.totalRoomsOfType = 0;
      return;
    }

    // Fetch all rooms of this type and get their booked dates
    this.apiService.getAllRooms().subscribe({
      next: (response: any) => {
        const roomsOfType = response.rooms?.filter((room: any) => room.type === this.roomType) || [];
        this.totalRoomsOfType = roomsOfType.length;
        
        if (roomsOfType.length === 0) {
          // If no rooms of this type exist, mark all future dates as unavailable
          this.unavailableDates = [];
          return;
        }

        // Fetch booked dates for each room using forkJoin
        const bookedDateRequests = roomsOfType.map((room: any) => 
          this.apiService.getBookedDates(room.id.toString())
        );

        forkJoin<any[]>(bookedDateRequests).subscribe({
          next: (results) => {
            // Create a map: date -> count of booked rooms
            const dateBookedCount = new Map<string, number>();
            
            results.forEach((res: any, index: number) => {
              if (res?.bookedDates && Array.isArray(res.bookedDates)) {
                res.bookedDates.forEach((date: string) => {
                  const currentCount = dateBookedCount.get(date) || 0;
                  dateBookedCount.set(date, currentCount + 1);
                });
              }
            });

            // Find dates where all rooms are booked (0 available)
            const unavailableDatesList: string[] = [];
            dateBookedCount.forEach((bookedCount, date) => {
              if (bookedCount >= this.totalRoomsOfType) {
                unavailableDatesList.push(date);
              }
            });

            this.unavailableDates = unavailableDatesList;
          },
          error: (err) => {
            console.error('Error fetching unavailable dates:', err);
            this.unavailableDates = [];
          }
        });
      },
      error: (err) => {
        console.error('Error fetching rooms:', err);
        this.unavailableDates = [];
        this.totalRoomsOfType = 0;
      }
    });
  }

  showError(msg: string): void {
    this.error = msg;
    setTimeout(() => {
      this.error = null;
    }, 5000);
  }

  onDatesSelected(dates: string[]): void {
    this.selectedDates = dates;
  }

  handleSearch() {
    if (this.selectedDates.length === 0 || !this.roomType) {
      this.showError('Please select dates and room type');
      return;
    }

    // Check availability for each selected date and find rooms available on ANY of those dates
    const sortedDates = [...this.selectedDates].sort();
    const availabilityChecks = sortedDates.map(date => {
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      const nextDayStr = nextDay.toISOString().split('T')[0];
      return this.apiService.getAvailableRooms(date, nextDayStr, this.roomType);
    });

    forkJoin<any[]>(availabilityChecks).subscribe({
      next: (results) => {
        // Collect all unique rooms that are available on at least one selected date
        const availableRoomsMap = new Map<number, any>();
        
        results.forEach((resp: any) => {
          if (resp?.rooms && Array.isArray(resp.rooms)) {
            resp.rooms.forEach((room: any) => {
              if (!availableRoomsMap.has(room.id)) {
                availableRoomsMap.set(room.id, room);
              }
            });
          }
        });

        const availableRooms = Array.from(availableRoomsMap.values());

        if (availableRooms.length === 0) {
          this.showError(
            'No rooms available for the selected dates. Please select different dates.'
          );
          return;
        }

        this.searchResults.emit(availableRooms);
        this.error = '';
      },
      error: (error: any) => {
        this.showError(error?.error?.message || error.message);
      }
    });
  }

  toggleCalendar(): void {
    this.showCalendar = !this.showCalendar;
  }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (this.showCalendar && this.calendarField) {
      const clickedInside = this.calendarField.nativeElement.contains(event.target);
      if (!clickedInside) {
        this.showCalendar = false;
      }
    }
  }

}
