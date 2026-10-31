import { Component } from '@angular/core';
import { ApiService } from '../../service/api.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ConfirmService } from '../../ui/confirm.service';
import { ToastService } from '../../ui/toast.service';


@Component({
  selector: 'app-editroom',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './editroom.component.html',
  styleUrl: './editroom.component.css'
})
export class EditroomComponent {


  roomDetails = {
    roomNumber: '',
    type: '',
    pricePerNight: '',
    capacity: '',
    description: '',
    imageUrl: '',
  };

  id: string = '';
  roomTypes: string[] = []; // Store room types
  file: File | null = null;
  preview: string | null = null;
  fileError: string = '';
  loading: boolean = true;
  loadError: string = '';
  saving: boolean = false;
  deleting: boolean = false;
  error: string = '';

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private confirmService: ConfirmService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.fetchRoomDetails();
  }

  // Fetch room details and room types
  fetchRoomDetails() {
    this.loading = true;
    this.loadError = '';
    this.apiService.getRoomById(this.id).subscribe({
      next: (roomResponse: any) => {
        this.roomDetails = {
          roomNumber: roomResponse.room.roomNumber,
          type: roomResponse.room.type,
          pricePerNight: roomResponse.room.pricePerNight,
          capacity: roomResponse.room.capacity,
          description: roomResponse.room.description,
          imageUrl: roomResponse.room.imageUrl,
        };
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        this.loadError = error?.error?.message || 'We couldn’t load this room. It may have been deleted.';
      }
  });

    this.apiService.getRoomTypes().subscribe({
      next:(types: string[]) => {
        this.roomTypes = types;
      },
      error:() => {
        this.roomTypes = this.roomDetails.type ? [this.roomDetails.type] : [];
      }
  });
  }

  // Handle file input change (image upload)
  handleFileChange(event: Event): void {
    const input = <HTMLInputElement>event.target;
    const selectedFile = input.files ? input.files[0] : null;
    this.fileError = '';
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        this.fileError = 'Choose an image file, such as JPG or PNG.';
        input.value = '';
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        this.fileError = 'This image is larger than 5 MB. Choose a smaller one.';
        input.value = '';
        return;
      }
      this.file = selectedFile;
      this.preview = URL.createObjectURL(selectedFile);
    } else {
      this.file = null;
      this.preview = null;
    }
  }

  // Update room details
  handleUpdate(form: NgForm): void {
    this.error = '';
    if (form.invalid) return;

    const formData = new FormData();
    formData.append('roomNumber', String(this.roomDetails.roomNumber));
    formData.append('type', this.roomDetails.type);
    formData.append('pricePerNight', String(this.roomDetails.pricePerNight));
    formData.append('description', this.roomDetails.description || '');
    formData.append('capacity', String(this.roomDetails.capacity));
    formData.append('id', this.id);

    if (this.file) {
      formData.append('imageFile', this.file);
    }

    this.saving = true;
    this.apiService.updateRoom(formData).subscribe({
      next:() => {
        this.saving = false;
        this.toast.success('Room saved', `Changes to room ${this.roomDetails.roomNumber} are live.`);
        this.router.navigate(['/admin/manage-rooms']);
      },
      error:(error) => {
        this.saving = false;
        this.error = error?.error?.message || 'Your changes weren’t saved. Try again.';
      }
  });
  }

  // Delete the room
  async handleDelete(): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: `Delete room ${this.roomDetails.roomNumber}?`,
      message: 'Guests will no longer be able to book this room. This can’t be undone.',
      confirmLabel: 'Delete room',
      tone: 'danger'
    });
    if (!confirmed) return;

    this.deleting = true;
    this.apiService.deleteRoom(this.id).subscribe({
      next:() => {
        this.deleting = false;
        this.toast.success('Room deleted', `Room ${this.roomDetails.roomNumber} has been removed.`);
        this.router.navigate(['/admin/manage-rooms']);
      },
      error:(error) => {
        this.deleting = false;
        this.error = error?.error?.message || 'The room wasn’t deleted. Try again, and reload the page if it keeps failing.';
      }
  });
  }

  // Helper method to get full image URL
  getImageUrl(imagePath: string): string {
    return this.apiService.getImageUrl(imagePath);
  }

}
