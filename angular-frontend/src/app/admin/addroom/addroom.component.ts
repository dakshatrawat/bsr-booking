import { Component } from '@angular/core';
import { ApiService } from '../../service/api.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';



@Component({
  selector: 'app-addroom',
  imports: [FormsModule, CommonModule],
  templateUrl: './addroom.component.html',
  styleUrl: './addroom.component.css'
})
export class AddroomComponent {


  roomDetails = {
    imageUrl: null,
    type: '',
    roomNumber: '',
    pricePerNight: '',
    capacity: '',
    description: '',
  };

  roomTypes: string[] = [];
  newRoomType: string = '';

  file: File | null = null;
  preview: string | null = null;

  error: any = null;
  success: string = '';
  
 constructor(private apiService: ApiService, private router: Router) {}

  ngOnInit(): void {
    this.fetchRoomTypes();
  }

  showError(msg: string) {
    this.error = msg;
    setTimeout(() => {
      this.error = null;
    }, 4000); // Clear the error after 5 seconds
  }


  // Fetch room types from the API

  fetchRoomTypes() {
    this.apiService.getRoomTypes().subscribe({
      next: (types: string[]) => {
        this.roomTypes = types;
      },
      error: (err) => {
        this.showError(
          err?.error?.message || 'Error fetching room types: ' + err
        );
      },
    });
  }

  // Handle form input changes
  handleChange(event: Event) {
    const { name, value } = <HTMLInputElement>event.target;
    this.roomDetails = { ...this.roomDetails, [name]: value };
  }

  // Handle room type change
  handleRoomTypeChange(event: Event) {
    this.roomDetails.type = (<HTMLSelectElement>event.target).value;
  }

  // Handle file input change (image upload)
  handleFileChange(event: Event) {
    const input = <HTMLInputElement>event.target;
    const selectedFile = input.files ? input.files[0] : null;
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith('image/')) {
        this.showError('Please select a valid image file (JPG, PNG, etc.)');
        input.value = ''; // Clear the input
        return;
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (selectedFile.size > maxSize) {
        this.showError('Image size should be less than 5MB');
        input.value = ''; // Clear the input
        return;
      }
      
      this.file = selectedFile;
      this.preview = URL.createObjectURL(selectedFile);
      console.log('File selected:', selectedFile.name, 'Size:', selectedFile.size);
    } else {
      this.file = null;
      this.preview = null;
    }
  }

  // Add room function
  addRoom() {
    if (
      !this.roomDetails.type ||
      !this.roomDetails.pricePerNight ||
      !this.roomDetails.capacity ||
      !this.roomDetails.roomNumber
    ) {
      this.showError('All room details must be provided.');
      return;
    }

    if (!this.file) {
      this.showError('Please select a room photo.');
      return;
    }

    if (!window.confirm('Do you want to add this room?')) {
      return;
    }

    const formData = new FormData();
    formData.append('type', this.roomDetails.type);
    formData.append('pricePerNight', this.roomDetails.pricePerNight.toString());
    formData.append('capacity', this.roomDetails.capacity.toString());
    formData.append('roomNumber', this.roomDetails.roomNumber.toString());
    formData.append('description', this.roomDetails.description || '');
    formData.append('imageFile', this.file, this.file.name);

    console.log('FormData contents:');
    console.log('Type:', this.roomDetails.type);
    console.log('Price:', this.roomDetails.pricePerNight);
    console.log('Capacity:', this.roomDetails.capacity);
    console.log('Room Number:', this.roomDetails.roomNumber);
    console.log('File:', this.file.name, 'Size:', this.file.size);

    this.apiService.addRoom(formData).subscribe({
      next: (response) => {
        console.log('Room added successfully:', response);
        this.success = 'Room Added successfully.';
        setTimeout(() => {
          this.success = '';
          this.router.navigate(['/admin/manage-rooms']);
        }, 5000);
      },
      error: (error) => {
        console.error('Error adding room:', error);
        this.showError(error?.error?.message || error?.message || 'Error adding room. Please try again.');
      },
    });
  }
}
