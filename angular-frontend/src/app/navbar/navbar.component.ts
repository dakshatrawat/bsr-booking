import { Component, HostListener, ElementRef } from '@angular/core';
import { ApiService } from '../service/api.service';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ToastService } from '../ui/toast.service';
import { ThemeService } from '../ui/theme.service';


@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  isMenuOpen: boolean = false;
  isScrolled: boolean = false;

  constructor(private router: Router, private apiService: ApiService, private elementRef: ElementRef, private toast: ToastService, public themeService: ThemeService){}

  // Lift the header off the page once content scrolls under it
  @HostListener('window:scroll')
  onScroll(): void {
    const scrolled = window.scrollY > 4;
    if (scrolled !== this.isScrolled) this.isScrolled = scrolled;
  }

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

  // Logging out is not destructive, so no confirmation: just do it and say so
  handleLogout(): void{
    this.apiService.logout();
    this.closeMenu();
    this.router.navigate(['/home']);
    this.toast.info('You have been logged out');
  }

  // Close menu when clicking outside
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeMenu();
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isMenuOpen) {
      this.closeMenu();
      this.elementRef.nativeElement.querySelector('.menu-toggle')?.focus();
    }
  }
}
