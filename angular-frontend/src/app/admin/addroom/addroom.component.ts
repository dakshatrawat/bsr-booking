import { Component } from '@angular/core';
import { ApiService } from '../../service/api.service';
import { Router, RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../ui/toast.service';



@Component({
  selector: 'app-addroom',
  imports: [FormsModule, CommonModule, RouterLink],
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

  file: File | null = null;
  preview: string | null = null;
  fileError: string = '';

  error: string = '';
  saving: boolean = false;

 constructor(private apiService: ApiService, private router: Router, private toast: ToastService) {}

  ngOnInit(): void {
    this.fetchRoomTypes();
  }


  // Fetch room types from the API

  fetchRoomTypes() {
    this.apiService.getRoomTypes().subscribe({
      next: (types: string[]) => {
        this.roomTypes = types;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Room types didn’t load, so the type list is empty. Reload the page to try again.';
      },
    });
  }

  // Handle file input change (image upload)
  handleFileChange(event: Event) {
    const input = <HTMLInputElement>event.target;
    const selectedFile = input.files ? input.files[0] : null;
    this.fileError = '';
    if (selectedFile) {
      // Validate file type
      if (!selectedFile.type.startsWith('image/')) {
        this.fileError = 'Choose an image file, such as JPG or PNG.';
        input.value = ''; // Clear the input
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB in bytes
      if (selectedFile.size > maxSize) {
        this.fileError = 'This image is larger than 5 MB. Choose a smaller one.';
        input.value = ''; // Clear the input
        return;
      }

      this.file = selectedFile;
      this.preview = URL.createObjectURL(selectedFile);
    } else {
      this.file = null;
      this.preview = null;
    }
  }

  // Add room function
  addRoom(form: NgForm) {
    this.error = '';
    if (!this.file && !this.fileError) {
      this.fileError = 'Add a photo of the room.';
    }

    // Field-level messages are shown inline by the template
    if (form.invalid || !this.file) {
      return;
    }

    const formData = new FormData();
    formData.append('type', this.roomDetails.type);
    formData.append('pricePerNight', this.roomDetails.pricePerNight.toString());
    formData.append('capacity', this.roomDetails.capacity.toString());
    formData.append('roomNumber', this.roomDetails.roomNumber.toString());
    formData.append('description', this.roomDetails.description || '');
    formData.append('imageFile', this.file, this.file.name);

    this.saving = true;
    this.apiService.addRoom(formData).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success('Room added', `Room ${this.roomDetails.roomNumber} is now bookable.`);
        this.router.navigate(['/admin/manage-rooms']);
      },
      error: (error) => {
        this.saving = false;
        this.error = error?.error?.message || 'The room wasn’t added. Check the details and try again.';
      },
    });
  }
}
