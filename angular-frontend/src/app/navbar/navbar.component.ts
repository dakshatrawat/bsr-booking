import { Component, HostListener, ElementRef, ViewChild } from '@angular/core';
import { ApiService } from '../service/api.service';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';


@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  isMenuOpen: boolean = false;

  @ViewChild('navMenu') navMenu!: ElementRef;

  constructor(private router: Router, private apiService: ApiService, private elementRef: ElementRef){}

  get isAuthemticated():boolean{
    return this.apiService.isAuthenticated();
  }

  get isCustomer():boolean{
    return this.apiService.isCustomer();
  }

  get isAdmin():boolean{
    return this.apiService.isAdmin();
  }

  toggleMenu(): void {
    this.isMenuOpen = !this.isMenuOpen;
  }

  closeMenu(): void {
    this.isMenuOpen = false;
  }

  handleLogout(): void{
    const isLogout = window.confirm("Are you sure you want to logout? ")
    if (isLogout) {
      this.apiService.logout();
      this.router.navigate(['/home'])
      this.closeMenu();
    }
  }

  // Close menu when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeMenu();
    }
  }

  // Close menu when route changes
  onNavClick(): void {
    this.closeMenu();
  }
}
