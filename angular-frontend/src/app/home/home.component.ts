import { Component, OnInit, OnDestroy } from '@angular/core';
import { RoomsearchComponent } from '../roomsearch/roomsearch.component';
import { RoomresultComponent } from '../roomresult/roomresult.component';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../service/api.service';
import { RevealDirective } from '../ui/reveal.directive';

@Component({
  selector: 'app-home',
  imports: [RoomsearchComponent, RoomresultComponent, RouterLink, CommonModule, RevealDirective],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {

  searchResults: any[] = [] // store the result of the searched room
  hotelImages: any[] = [];
  currentImageIndex: number = 0;
  private slideInterval: any;
  loadingImages: boolean = false;

  readonly services = [
    { icon: 'fa-square-parking', title: 'Free parking', text: 'Secure on-site parking for all guests at no extra cost.' },
    { icon: 'fa-fire-burner', title: 'Open kitchen', text: 'Watch our chefs prepare your meals in our open kitchen.' },
    { icon: 'fa-bell-concierge', title: 'Room service', text: 'In-room dining whenever you’d rather stay in.' },
    { icon: 'fa-shower', title: 'Hot water', text: 'A geyser in every room, with hot water around the clock.' },
    { icon: 'fa-clock', title: '24/7 service', text: 'Help is available any time of day or night.' },
    { icon: 'fa-utensils', title: 'Fine dining', text: 'Mountain cuisine served at our restaurant.' },
  ];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.fetchHotelImages();
  }

  ngOnDestroy(): void {
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }
  }

  fetchHotelImages(): void {
    this.loadingImages = true;
    // Try public method first, fallback to authenticated if needed
    this.apiService.getAllHotelImagesPublic().subscribe({
      next: (response: any) => {
        if (response && response.status === 200 && response.hotelImages) {
          this.hotelImages = Array.isArray(response.hotelImages) ? response.hotelImages : [];
          if (this.hotelImages.length > 0) {
            this.startSlider();
          }
        } else {
          this.hotelImages = [];
        }
        this.loadingImages = false;
      },
      error: () => {
        // Fallback to authenticated method
        this.apiService.getAllHotelImages().subscribe({
          next: (response: any) => {
            if (response && response.status === 200 && response.hotelImages) {
              this.hotelImages = Array.isArray(response.hotelImages) ? response.hotelImages : [];
              if (this.hotelImages.length > 0) {
                this.startSlider();
              }
            }
            this.loadingImages = false;
          },
          error: () => {
            this.hotelImages = [];
            this.loadingImages = false;
          }
        });
      }
    });
  }

  startSlider(): void {
    if (this.hotelImages.length <= 1) return;
    // Auto-advance is motion: skip it for reduced-motion users
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    // Clear any existing interval
    if (this.slideInterval) {
      clearInterval(this.slideInterval);
    }

    this.slideInterval = setInterval(() => {
      if (this.currentImageIndex < this.hotelImages.length - 1) {
        this.currentImageIndex++;
      } else {
        // Stop at the last image (one-sided, not circular)
        clearInterval(this.slideInterval);
      }
    }, 5000); // Change image every 5 seconds
  }

  goToSlide(index: number): void {
    if (index >= 0 && index < this.hotelImages.length) {
      this.currentImageIndex = index;
      // Once the visitor takes control, stop auto-advancing
      if (this.slideInterval) {
        clearInterval(this.slideInterval);
      }
    }
  }

  getImageUrl(image: any): string {
    return image && image.id ? this.apiService.getHotelImageUrl(image.id) : '';
  }

  // Hide a broken photo rather than retrying a missing placeholder file
  onImageError(event: Event, image: any): void {
    (event.target as HTMLImageElement).style.visibility = 'hidden';
  }

  // handle the result coming from the roomsearch component
  handleSearchResult(results: any[]){
    this.searchResults = results
  }

  scrollToSearch(event: Event): void {
    event.preventDefault();
    const target = document.getElementById('availability');
    target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target?.focus({ preventScroll: true });
  }

}
