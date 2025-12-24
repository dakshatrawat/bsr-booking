import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { RoomsearchComponent } from '../roomsearch/roomsearch.component';
import { RoomresultComponent } from '../roomresult/roomresult.component';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from '../service/api.service';

@Component({
  selector: 'app-home',
  imports: [RoomsearchComponent, RoomresultComponent, RouterLink, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent implements OnInit, OnDestroy {

  searchResults: any[] = [] // store the result of the searched room
  hotelImages: any[] = [];
  currentImageIndex: number = 0;
  private slideInterval: any;
  loadingImages: boolean = false;

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
    console.log('Fetching hotel images for home page slider...');
    // Try public method first, fallback to authenticated if needed
    this.apiService.getAllHotelImagesPublic().subscribe({
      next: (response: any) => {
        console.log('Hotel images response:', response);
        if (response && response.status === 200 && response.hotelImages) {
          this.hotelImages = Array.isArray(response.hotelImages) ? response.hotelImages : [];
          console.log('Loaded hotel images:', this.hotelImages.length);
          if (this.hotelImages.length > 0) {
            this.startSlider();
          }
        } else {
          console.warn('No hotel images found or invalid response');
          this.hotelImages = [];
        }
        this.loadingImages = false;
      },
      error: (err) => {
        console.error('Error fetching hotel images (public):', err);
        // Fallback to authenticated method
        console.log('Trying authenticated method...');
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
          error: (err2) => {
            console.error('Error fetching hotel images (authenticated):', err2);
            this.hotelImages = [];
            this.loadingImages = false;
          }
        });
      }
    });
  }

  startSlider(): void {
    if (this.hotelImages.length <= 1) return;
    
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
    }, 4000); // Change image every 4 seconds
  }

  goToSlide(index: number): void {
    if (index >= 0 && index < this.hotelImages.length) {
      this.currentImageIndex = index;
      // Restart slider from this position
      if (this.slideInterval) {
        clearInterval(this.slideInterval);
      }
      this.startSlider();
    }
  }

  getImageUrl(image: any): string {
    if (image && image.id) {
      const url = this.apiService.getHotelImageUrl(image.id);
      console.log('Image URL for ID', image.id, ':', url);
      return url;
    }
    return '/assets/placeholder-room.jpg';
  }

  onImageError(event: any, image: any): void {
    console.error('Failed to load image:', event.target.src, 'for image:', image);
    event.target.src = '/assets/placeholder-room.jpg';
  }

  // handle the result coming from the roomsearch component
  handleSearchResult(results: any[]){
    this.searchResults = results
  }

  @HostListener('click', ['$event'])
  onScrollClick(event: any) {
    if (event.target.closest('.hero-scroll')) {
      window.scrollTo({ top: window.innerHeight, behavior: 'smooth' });
    }
  }

}
