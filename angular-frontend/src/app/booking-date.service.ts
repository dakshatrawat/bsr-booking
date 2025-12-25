import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class BookingDateService {
  private selectedDatesSubject = new BehaviorSubject<string[]>([]);
  public selectedDates$: Observable<string[]> = this.selectedDatesSubject.asObservable();

  constructor() {
    // Load from localStorage on initialization
    const savedDates = localStorage.getItem('selectedBookingDates');
    if (savedDates) {
      try {
        const dates = JSON.parse(savedDates);
        this.selectedDatesSubject.next(dates);
      } catch (e) {
        console.error('Error loading saved dates:', e);
      }
    }
  }

  setSelectedDates(dates: string[]): void {
    this.selectedDatesSubject.next(dates);
    localStorage.setItem('selectedBookingDates', JSON.stringify(dates));
  }

  getSelectedDates(): string[] {
    return this.selectedDatesSubject.value;
  }

  clearSelectedDates(): void {
    this.selectedDatesSubject.next([]);
    localStorage.removeItem('selectedBookingDates');
  }

  getCheckInDate(): string | null {
    const dates = this.getSelectedDates();
    if (dates.length === 0) return null;
    return dates.sort()[0]; // Earliest date
  }

  getCheckOutDate(): string | null {
    const dates = this.getSelectedDates();
    if (dates.length === 0) return null;
    return dates.sort()[dates.length - 1]; // Latest date
  }
}
