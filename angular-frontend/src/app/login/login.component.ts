
import { Component } from '@angular/core';
import { ApiService } from '../service/api.service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';


@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {

  constructor( private apiService: ApiService, private router: Router){}

  formData: any = {

    email: '',
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
    this.apiService.loginUser(this.formData).subscribe({
      next: (res:any) => {
        this.submitting = false;
        if (res.status === 200) {
          this.apiService.encryptAndSaveToStorage('token', res.token);
          this.apiService.encryptAndSaveToStorage('role', res.role);
          this.router.navigate(['/home'])
        }
      },
      error: (err: any) => {
        this.submitting = false;
        // Errors stay visible until the next attempt
        this.error = err?.error?.message || 'We couldn’t log you in. Check your email and password and try again.';
      }
    });
  }
}
