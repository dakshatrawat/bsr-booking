import { Component } from '@angular/core';
import { ApiService } from '../service/api.service';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule, NgForm } from '@angular/forms';
import { ConfirmService } from '../ui/confirm.service';
import { ToastService } from '../ui/toast.service';


@Component({
  selector: 'app-editprofile',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './editprofile.component.html',
  styleUrl: './editprofile.component.css'
})
export class EditprofileComponent {


  user: any = null;
  form = { firstName: '', lastName: '', phoneNumber: '' };
  loading: boolean = true;
  saving: boolean = false;
  deleting: boolean = false;
  error: string | null = null;
  saveError: string | null = null;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private confirmService: ConfirmService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.fetchUserProfile();
  }

  // Fetch user profile on component initialization
  fetchUserProfile(): void {
    this.loading = true;
    this.error = null;
    this.apiService.myProfile().subscribe({
      next: (response: any) => {
        this.user = response.user;
        this.resetForm();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'We couldn’t load your account details.';
      },
    });
  }

  resetForm(): void {
    this.form = {
      firstName: this.user?.firstName || '',
      lastName: this.user?.lastName || '',
      phoneNumber: this.user?.phoneNumber || '',
    };
    this.saveError = null;
  }

  get hasChanges(): boolean {
    return !!this.user && (
      this.form.firstName !== (this.user.firstName || '') ||
      this.form.lastName !== (this.user.lastName || '') ||
      this.form.phoneNumber !== (this.user.phoneNumber || '')
    );
  }

  // Email is the login identity (and the token subject), so it isn't editable here
  handleSave(form: NgForm): void {
    this.saveError = null;
    if (form.invalid || !this.hasChanges) return;

    this.saving = true;
    const changes = {
      firstName: this.form.firstName.trim(),
      lastName: this.form.lastName.trim(),
      phoneNumber: this.form.phoneNumber.trim(),
    };
    this.apiService.updateProfile(changes).subscribe({
      next: () => {
        this.saving = false;
        this.user = { ...this.user, ...changes };
        this.resetForm();
        form.resetForm(this.form);
        this.toast.success('Details saved');
      },
      error: (err) => {
        this.saving = false;
        this.saveError = err?.error?.message || 'Your changes weren’t saved. Try again.';
      },
    });
  }

  // Handle account deletion
  async handleDeleteProfile(): Promise<void> {
    const confirmed = await this.confirmService.confirm({
      title: 'Delete your account?',
      message: 'You’ll lose access to your profile and booking history. This can’t be undone.',
      confirmLabel: 'Delete account',
      cancelLabel: 'Keep account',
      tone: 'danger'
    });
    if (!confirmed) return;

    this.deleting = true;
    this.apiService.deleteAccount().subscribe({
      next: () => {
        this.deleting = false;
        // The old token belongs to a deleted user: clear it
        this.apiService.logout();
        this.toast.info('Your account has been deleted');
        this.router.navigate(['/home']);
      },
      error: (err) => {
        this.deleting = false;
        this.error = err?.error?.message || 'Your account wasn’t deleted. Try again, or contact the resort if it keeps failing.';
      },
    });
  }

}
