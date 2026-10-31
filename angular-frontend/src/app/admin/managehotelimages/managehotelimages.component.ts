import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../service/api.service';
import { ConfirmService } from '../../ui/confirm.service';
import { ToastService } from '../../ui/toast.service';

@Component({
  selector: 'app-managehotelimages',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './managehotelimages.component.html',
  styleUrl: './managehotelimages.component.css'
})
export class ManagehotelimagesComponent implements OnInit, OnDestroy {
  hotelImages: any[] = [];
  loading = false;
  loadError = '';
  uploading = false;
  deletingId: number | null = null;
  failedImages = new Set<number>();

  newImageFiles: File[] = [];
  newDescriptions: string[] = [];
  filePreviews: string[] = [];

  constructor(
    private apiService: ApiService,
    private confirmService: ConfirmService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.fetchHotelImages();
  }

  ngOnDestroy(): void {
    this.filePreviews.forEach(url => URL.revokeObjectURL(url));
  }

  get uploadLabel(): string {
    const n = this.newImageFiles.length;
    if (n === 0) return 'Upload photos';
    return n === 1 ? 'Upload 1 photo' : `Upload ${n} photos`;
  }

  fetchHotelImages(): void {
    this.loading = true;
    this.loadError = '';
    this.apiService.getAllHotelImages().subscribe({
      next: (res: any) => {
        this.loading = false;
        if (res?.status === 200) {
          this.hotelImages = Array.isArray(res.hotelImages) ? res.hotelImages : [];
        } else {
          this.hotelImages = [];
          this.loadError = res?.message || 'The server returned an unexpected response.';
        }
      },
      error: (err) => {
        this.loading = false;
        this.hotelImages = [];
        this.loadError = this.describeError(err);
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.filePreviews.forEach(url => URL.revokeObjectURL(url));
    this.newImageFiles = Array.from(input.files ?? []);
    this.newDescriptions = this.newImageFiles.map(() => '');
    this.filePreviews = this.newImageFiles.map(file => URL.createObjectURL(file));
  }

  removeFile(index: number): void {
    URL.revokeObjectURL(this.filePreviews[index]);
    this.newImageFiles.splice(index, 1);
    this.newDescriptions.splice(index, 1);
    this.filePreviews.splice(index, 1);
    if (this.newImageFiles.length === 0) this.clearFileInput();
  }

  addMultipleHotelImages(): void {
    if (this.newImageFiles.length === 0 || this.uploading) return;

    const formData = new FormData();
    this.newImageFiles.forEach(file => formData.append('imageFiles', file));
    // Backend expects descriptions aligned by index, so empty ones are sent too
    this.newDescriptions.forEach(desc => formData.append('descriptions', desc || ''));

    const count = this.newImageFiles.length;
    this.uploading = true;
    this.apiService.addMultipleHotelImages(formData).subscribe({
      next: (res: any) => {
        this.uploading = false;
        if (res?.status === 200) {
          this.toast.success(count === 1 ? 'Photo uploaded' : `${count} photos uploaded`);
          this.resetAddForm();
          this.fetchHotelImages();
        } else {
          this.toast.error("Photos weren't uploaded", res?.message);
        }
      },
      error: (err) => {
        this.uploading = false;
        this.toast.error("Photos weren't uploaded", this.describeError(err));
      }
    });
  }

  async deleteHotelImage(imageId: number): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Delete this photo?',
      message: 'It will be removed from the website straight away. This can’t be undone.',
      confirmLabel: 'Delete photo',
      tone: 'danger'
    });
    if (!confirmed) return;

    this.deletingId = imageId;
    this.apiService.deleteHotelImage(imageId.toString()).subscribe({
      next: (res: any) => {
        this.deletingId = null;
        if (res?.status === 200) {
          this.toast.success('Photo deleted');
          this.hotelImages = this.hotelImages.filter(img => img.id !== imageId);
        } else {
          this.toast.error("Photo wasn't deleted", res?.message);
        }
      },
      error: (err) => {
        this.deletingId = null;
        this.toast.error("Photo wasn't deleted", this.describeError(err));
      }
    });
  }

  trackById(_: number, image: any): number {
    return image.id;
  }

  getImageUrl(image: any): string {
    if (image?.id) return this.apiService.getHotelImageUrl(image.id);
    return this.apiService.getImageUrl(image?.imageUrl);
  }

  private resetAddForm(): void {
    this.filePreviews.forEach(url => URL.revokeObjectURL(url));
    this.newImageFiles = [];
    this.newDescriptions = [];
    this.filePreviews = [];
    this.clearFileInput();
  }

  private clearFileInput(): void {
    const input = document.getElementById('imageFiles') as HTMLInputElement | null;
    if (input) input.value = '';
  }

  private describeError(err: any): string {
    if (err?.status === 0) return "Can't reach the server. Check that the backend is running.";
    if (err?.status === 401 || err?.status === 403) return 'Your session has expired. Log in again.';
    return err?.error?.message || err?.message || 'Something went wrong. Try again.';
  }
}
