import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PaginationComponent } from '../../pagination/pagination.component';
import { ApiService } from '../../service/api.service';
import { RouterLink } from '@angular/router';
import { TableSort } from '../../ui/table-sort';


@Component({
  selector: 'app-managerooms',
  imports: [CommonModule, FormsModule, PaginationComponent, RouterLink],
  templateUrl: './managerooms.component.html',
  styleUrl: './managerooms.component.css'
})
export class ManageroomsComponent {

  rooms: any[] = [];
  filteredRooms: any[] = [];
  roomTypes: string[] = [];
  selectedRoomType: string = '';
  currentPage: number = 1;
  roomsPerPage: number = 20;
  loading: boolean = true;
  error: string | null = null;

  sort = new TableSort<any>('roomNumber');
  readonly skeletonRows = Array.from({ length: 6 });

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.fetchRooms();
    this.fetchRoomTypes();
  }

  // Fetch all rooms from the API
  fetchRooms() {
    this.loading = true;
    this.error = null;
    this.apiService.getAllRooms().subscribe({
      next: (response: any) => {
        this.rooms = response.rooms || [];
        this.filterRooms(this.selectedRoomType);
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.error = error?.error?.message || 'We couldn’t load rooms. Check your connection and try again.';
      }
  });
  }

  // Fetch room types from the API
  fetchRoomTypes() {
    this.apiService.getRoomTypes().subscribe({
      next: (types: string[]) => {
        this.roomTypes = types;
      },
      error: () => {
        // The filter falls back to "All"; the table itself still works
        this.roomTypes = [];
      },
    });
  }

  // Filter rooms by type
  filterRooms(type: string) {
    if (type === '') {
      this.filteredRooms = this.rooms;
    } else {
      this.filteredRooms = this.rooms.filter((room) => room.type === type);
    }
    this.currentPage = 1; // Reset to first page when filter changes
  }

  toggleSort(key: string): void {
    this.sort.toggle(key);
    this.currentPage = 1;
  }

  get currentRooms() {
    const indexOfLastRoom = this.currentPage * this.roomsPerPage;
    return this.sort.apply(this.filteredRooms).slice(indexOfLastRoom - this.roomsPerPage, indexOfLastRoom);
  }

  // Pagination function to change page
  paginate(pageNumber: number) {
    this.currentPage = pageNumber;
  }

  getImageUrl(imagePath: string): string {
    return this.apiService.getImageUrl(imagePath);
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).style.visibility = 'hidden';
  }
}
