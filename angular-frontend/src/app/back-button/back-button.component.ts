import { Component, OnInit } from '@angular/core';
import { Location } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-back-button',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './back-button.component.html',
  styleUrl: './back-button.component.css'
})
export class BackButtonComponent implements OnInit {
  showBackButton: boolean = true; // Default to true, will be updated by route check

  constructor(
    private location: Location,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check initial route immediately
    setTimeout(() => {
      this.updateVisibility();
    }, 0);

    // Listen to route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.updateVisibility();
      });
  }

  updateVisibility(): void {
    const currentUrl = this.router.url;
    // Hide back button on home page only
    // Show on all other routes including root redirect
    const isHomePage = currentUrl === '/home' || currentUrl === '/' || currentUrl === '';
    this.showBackButton = !isHomePage;
  }

  goBack(): void {
    this.location.back();
  }
}
