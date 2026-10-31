import { Component } from '@angular/core';
import { ApiService } from '../service/api.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ToastService } from '../ui/toast.service';



@Component({
  selector: 'app-register',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  constructor( private apiService: ApiService, private router: Router, private toast: ToastService){}

  formData: any = {

    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: ''
  }

  error: any = null;
  showPassword: boolean = false;
  submitting: boolean = false;

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  handleSubmit(form: NgForm){
    this.error = null;

    // Field-level messages are shown inline by the template
    if (form.invalid) {
      return
    }

    this.submitting = true;
    this.apiService.registerUser(this.formData).subscribe({
      next:(res: any) => {
        this.submitting = false;
        this.toast.success('Account created', 'Log in with your new email and password.');
        this.router.navigate(['/login'])
      },
      error: (err: any) => {
        this.submitting = false;
        this.error = err?.error?.message || 'We couldn’t create your account. Check your details and try again.';
      }
    });
  }

}
