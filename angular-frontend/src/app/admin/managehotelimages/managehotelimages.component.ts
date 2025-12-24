import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../service/api.service';

@Component({
  selector: 'app-managehotelimages',
  imports: [CommonModule, FormsModule],
  templateUrl: './managehotelimages.component.html',
  styleUrl: './managehotelimages.component.css'
})
export class ManagehotelimagesComponent implements OnInit {
  hotelImages: any[] = [];
  loading: boolean = false; // For fetching images
  uploading: boolean = false; // For uploading images
  error: string | null = null;
  success: string | null = null;

  // Add image form
  newImageFiles: File[] = [];
  newDescriptions: string[] = [];
  filePreviews: string[] = [];

  // Edit image form
  editingImage: any | null = null;
  editImageFile: File | null = null;
  editImageDescription: string = '';
  editImageDisplayOrder: number = 0;
  editPreview: string | null = null;

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    this.fetchHotelImages();
  }

  fetchHotelImages() {
    this.loading = true;
    console.log('Starting to fetch hotel images...');
    console.log('API Base URL: http://localhost:9090/api');
    this.apiService.getAllHotelImages().subscribe({
      next: (response: any) => {
        console.log('Fetch images response:', response);
        console.log('Response type:', typeof response);
        console.log('Response status:', response?.status);
        console.log('Response message:', response?.message);
        console.log('Response hotelImages:', response?.hotelImages);
        console.log('Response hotelImages type:', typeof response?.hotelImages);
        console.log('Response hotelImages is array:', Array.isArray(response?.hotelImages));
        
        this.loading = false;
        
        if (response) {
          if (response.status === 200) {
            if (response.hotelImages) {
              this.hotelImages = Array.isArray(response.hotelImages) ? response.hotelImages : [];
              console.log('Loaded hotel images:', this.hotelImages.length);
            } else {
              this.hotelImages = [];
              console.warn('No hotelImages field in response');
            }
          } else {
            this.hotelImages = [];
            const errorMsg = response.message || `Server returned status ${response.status}`;
            this.showError(errorMsg);
            console.error('Fetch failed with status:', response.status, 'Message:', errorMsg);
          }
        } else {
          this.hotelImages = [];
          this.showError('No response from server');
          console.error('Fetch failed: No response object');
        }
      },
      error: (err) => {
        console.error('Fetch images error:', err);
        console.error('Error status:', err?.status);
        console.error('Error message:', err?.message);
        console.error('Error error:', err?.error);
        console.error('Error name:', err?.name);
        console.error('Full error object:', JSON.stringify(err, null, 2));
        this.loading = false;
        this.hotelImages = [];
        
        let errorMsg = 'Error fetching hotel images. ';
        if (err?.status === 0 || err?.name === 'HttpErrorResponse' && !err?.status) {
          errorMsg = 'Cannot connect to server. Please check:\n';
          errorMsg += '1. Backend server is running on http://localhost:9090\n';
          errorMsg += '2. No firewall is blocking the connection\n';
          errorMsg += '3. Check browser console for CORS errors';
        } else if (err?.status === 401 || err?.status === 403) {
          errorMsg += 'Authentication failed. Please log in again.';
        } else if (err?.status === 404) {
          errorMsg += 'Endpoint not found. Please check backend routes.';
        } else if (err?.status === 500) {
          errorMsg += 'Server error: ' + (err?.error?.message || err?.message || 'Internal server error');
        } else if (err?.error?.message) {
          errorMsg += err.error.message;
        } else if (err?.message) {
          errorMsg += err.message;
        } else {
          errorMsg += 'Please check console for details.';
        }
        this.showError(errorMsg);
      }
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.newImageFiles = Array.from(input.files);
      this.newDescriptions = new Array(this.newImageFiles.length).fill('');
      this.filePreviews = this.newImageFiles.map(file => URL.createObjectURL(file));
    }
  }

  removeFile(index: number) {
    // Revoke the object URL to free memory
    if (this.filePreviews[index]) {
      URL.revokeObjectURL(this.filePreviews[index]);
    }
    this.newImageFiles.splice(index, 1);
    this.newDescriptions.splice(index, 1);
    this.filePreviews.splice(index, 1);
  }

  addMultipleHotelImages() {
    if (!this.newImageFiles || this.newImageFiles.length === 0) {
      this.showError('Please select at least one image file');
      return;
    }

    const formData = new FormData();
    
    // Append all image files with the same parameter name
    this.newImageFiles.forEach((file) => {
      formData.append('imageFiles', file);
    });

    // Append descriptions - backend expects List<String>
    // Each description should be appended separately with the same parameter name
    if (this.newDescriptions.length > 0) {
      this.newDescriptions.forEach((desc, index) => {
        // Append description even if empty to maintain index alignment
        formData.append('descriptions', desc || '');
      });
    }
    
    console.log('Uploading', this.newImageFiles.length, 'images with', this.newDescriptions.length, 'descriptions');

    this.uploading = true;
    this.error = null;
    this.success = null;
    
    // Add timeout to prevent infinite loading
    const uploadTimeout = setTimeout(() => {
      if (this.uploading) {
        this.uploading = false;
        this.showError('Upload timeout - server may not be responding. Please check if backend is running.');
      }
    }, 30000); // 30 second timeout

    this.apiService.addMultipleHotelImages(formData).subscribe({
      next: (response: any) => {
        clearTimeout(uploadTimeout);
        console.log('Upload response:', response);
        console.log('Response type:', typeof response);
        console.log('Response status:', response?.status);
        console.log('Response message:', response?.message);
        console.log('Response hotelImages:', response?.hotelImages);
        this.uploading = false;
        
        if (response) {
          if (response.status === 200) {
            const count = this.newImageFiles.length;
            this.showSuccess(`Successfully added ${count} hotel image(s)`);
            this.resetAddForm();
            this.fetchHotelImages();
          } else {
            const errorMsg = response.message || `Server returned status ${response.status}`;
            this.showError(errorMsg);
            console.error('Upload failed with status:', response.status, 'Message:', errorMsg);
          }
        } else {
          this.showError('No response from server');
          console.error('Upload failed: No response object');
        }
      },
      error: (err) => {
        clearTimeout(uploadTimeout);
        this.uploading = false;
        console.error('Upload error:', err);
        console.error('Error status:', err?.status);
        console.error('Error message:', err?.message);
        console.error('Error error:', err?.error);
        console.error('Error name:', err?.name);
        console.error('Full error object:', JSON.stringify(err, null, 2));
        
        let errorMsg = 'Error adding hotel images. ';
        if (err?.status === 0 || err?.name === 'HttpErrorResponse' && !err?.status) {
          errorMsg = 'Cannot connect to server. Please check:\n';
          errorMsg += '1. Backend server is running on http://localhost:9090\n';
          errorMsg += '2. No firewall is blocking the connection\n';
          errorMsg += '3. Check browser console for CORS errors';
        } else if (err?.status === 401 || err?.status === 403) {
          errorMsg += 'Authentication failed. Please log in again.';
        } else if (err?.status === 404) {
          errorMsg += 'Endpoint not found. Please check backend routes.';
        } else if (err?.status === 500) {
          errorMsg += 'Server error: ' + (err?.error?.message || err?.message || 'Internal server error');
        } else if (err?.error?.message) {
          errorMsg += err.error.message;
        } else if (err?.message) {
          errorMsg += err.message;
        } else {
          errorMsg += 'Please check console for details.';
        }
        this.showError(errorMsg);
      }
    });
  }

  startEdit(image: any) {
    this.editingImage = image;
    this.editImageDescription = image.description || '';
    this.editImageDisplayOrder = image.displayOrder || 0;
    this.editPreview = this.apiService.getHotelImageUrl(image.id);
    this.editImageFile = null;
  }

  cancelEdit() {
    this.editingImage = null;
    this.editImageFile = null;
    this.editImageDescription = '';
    this.editImageDisplayOrder = 0;
    this.editPreview = null;
  }

  onEditFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.editImageFile = input.files[0];
      this.editPreview = URL.createObjectURL(this.editImageFile);
    }
  }

  updateHotelImage() {
    if (!this.editingImage) return;

    this.uploading = true;
    const formData = new FormData();

    if (this.editImageFile) {
      formData.append('imageFile', this.editImageFile);
    }
    if (this.editImageDescription) {
      formData.append('description', this.editImageDescription);
    }
    formData.append('displayOrder', this.editImageDisplayOrder.toString());

    this.apiService.updateHotelImage(this.editingImage.id.toString(), formData).subscribe({
      next: (response: any) => {
        if (response.status === 200) {
          this.showSuccess('Hotel image updated successfully');
          this.cancelEdit();
          this.fetchHotelImages();
        }
        this.uploading = false;
      },
      error: (err) => {
        this.showError(err?.error?.message || 'Error updating hotel image');
        this.uploading = false;
      }
    });
  }

  deleteHotelImage(imageId: number) {
    if (!confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      return;
    }

    this.loading = true;
    this.apiService.deleteHotelImage(imageId.toString()).subscribe({
      next: (response: any) => {
        this.loading = false;
        if (response && response.status === 200) {
          this.showSuccess('Hotel image deleted successfully');
          this.fetchHotelImages();
        } else {
          this.showError(response?.message || 'Unexpected response from server');
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Delete error:', err);
        let errorMsg = 'Error deleting hotel image. ';
        if (err?.status === 401 || err?.status === 403) {
          errorMsg += 'Authentication failed. Please log in again.';
        } else if (err?.error?.message) {
          errorMsg += err.error.message;
        } else {
          errorMsg += 'Please check console for details.';
        }
        this.showError(errorMsg);
      }
    });
  }

  resetAddForm() {
    // Revoke all object URLs to free memory
    this.filePreviews.forEach(url => URL.revokeObjectURL(url));
    this.newImageFiles = [];
    this.newDescriptions = [];
    this.filePreviews = [];
    const fileInput = document.getElementById('imageFiles') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  getImageUrl(image: any): string {
    // If image has an ID, use it to get the image from database
    if (image && image.id) {
      const url = this.apiService.getHotelImageUrl(image.id);
      console.log('Hotel image URL:', url, 'for image ID:', image.id);
      console.log('Image object:', image);
      return url;
    }
    // Fallback to old imageUrl if it exists (for backward compatibility)
    if (image && image.imageUrl) {
      return this.apiService.getImageUrl(image.imageUrl);
    }
    console.warn('No image ID or imageUrl found for image:', image);
    return '/assets/placeholder-room.jpg';
  }

  onImageError(event: any): void {
    console.error('Hotel image failed to load:', event.target.src);
    console.error('Image error event:', event);
    console.error('Failed image element:', event.target);
    event.target.src = '/assets/placeholder-room.jpg'; // Fallback to placeholder
  }

  showError(message: string) {
    this.error = message;
    this.success = null;
    setTimeout(() => {
      this.error = null;
    }, 5000);
  }

  showSuccess(message: string) {
    this.success = message;
    this.error = null;
    setTimeout(() => {
      this.success = null;
    }, 5000);
  }
}
