import { Component } from '@angular/core';
import { PaginationComponent } from '../pagination/pagination.component';
import { RoomresultComponent } from '../roomresult/roomresult.component';
import { RoomsearchComponent } from '../roomsearch/roomsearch.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../service/api.service';


@Component({
  selector: 'app-rooms',
  imports: [PaginationComponent,
     RoomresultComponent,
      RoomsearchComponent,
       CommonModule, FormsModule],
  templateUrl: './rooms.component.html',
  styleUrl: './rooms.component.css'
})

export class RoomsComponent {


  allRooms: any[] = [];
  rooms: any[] = [];
  filteredRooms: any[] = [];
  roomTypes: string[] = [];
  selectedRoomType: string = '';
  currentPage: number = 1;
  roomsPerPage: number = 9;
  loading: boolean = true;
  showingSearchResults: boolean = false;
  error: string | null = null;
  readonly skeletonCards = Array.from({ length: 6 });

  constructor(private apiService: ApiService) {}

  ngOnInit():void{

    this.fetchRooms();
    this.fetchRoomTypes();

  }

  // Fetch all rooms from the API
  fetchRooms() {
    this.loading = true;
    this.error = null;
    this.apiService.getAllRooms().subscribe({
      next: (response: any) => {
        this.allRooms = response.rooms || [];
        this.rooms = this.allRooms;
        this.filterRooms(this.selectedRoomType);
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'We couldn’t load rooms. Check your connection and try again.';
      },
    });
  }

  // Fetch room types from the API
  fetchRoomTypes() {
    this.apiService.getRoomTypes().subscribe({
      next: (types: string[]) => {
        this.roomTypes = types;
      },
      error: () => {
        // The type filter falls back to "All types"
        this.roomTypes = [];
      },
    });
  }


    // Handle the search result passed from RoomsearchComponent
    handleSearchResult(results: any[]) {
      this.rooms = results;
      this.showingSearchResults = true;
      this.selectedRoomType = '';
      this.filterRooms('');
    }

    resetSearch() {
      this.rooms = this.allRooms;
      this.showingSearchResults = false;
      this.selectedRoomType = '';
      this.filterRooms('');
    }

  // Filter rooms by type
  filterRooms(type: string) {
    if (type === '') {
      this.filteredRooms = this.rooms;
    } else {
      this.filteredRooms = this.rooms.filter((room) => room.type === type);
    }
    this.currentPage = 1;
  }


  // Pagination logic
  get indexOfLastRoom() {
    return this.currentPage * this.roomsPerPage;
  }

  get indexOfFirstRoom() {
    return this.indexOfLastRoom - this.roomsPerPage;
  }

  get currentRooms() {
    return this.filteredRooms.slice(
      this.indexOfFirstRoom,
      this.indexOfLastRoom
    );
  }

  // Pagination function to change page
  paginate(pageNumber: number) {
    this.currentPage = pageNumber;
  }


}
