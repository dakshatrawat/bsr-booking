import { Component } from '@angular/core';
import { ApiService } from '../../service/api.service';
import { FormsModule, NgForm } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { ToastService } from '../../ui/toast.service';


@Component({
  selector: 'app-adminregister',
  imports: [FormsModule, CommonModule, RouterLink],
  templateUrl: './adminregister.component.html',
  styleUrl: './adminregister.component.css'
})
export class AdminregisterComponent {

  constructor(private apiService: ApiService, private router: Router, private toast: ToastService) {}

  formData: any = {
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    role: 'CUSTOMER',
  };

  error: string | null = null;
  showPassword = false;
  submitting = false;

  handleSubmit(form: NgForm) {
    this.error = null;

    // Field-level messages are shown inline by the template
    if (form.invalid) {
      return;
    }

    this.submitting = true;
    this.apiService.registerUser(this.formData).subscribe({
      next: () => {
        this.submitting = false;
        this.toast.success('User created', `${this.formData.firstName} can now log in.`);
        this.router.navigate(['/admin']);
      },
      error: (err) => {
        this.submitting = false;
        this.error = err?.error?.message || 'We couldn’t create this user. Check the details and try again.';
      },
    });
  }

}
