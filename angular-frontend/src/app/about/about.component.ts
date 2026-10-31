import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../ui/reveal.directive';

@Component({
  selector: 'app-about',
  imports: [CommonModule, RouterLink, RevealDirective],
  templateUrl: './about.component.html',
  styleUrl: './about.component.css'
})
export class AboutComponent {
  readonly features = [
    { icon: 'fa-mountain', title: 'Mountain views', text: 'Wake up to wide views of the surrounding peaks and valley.' },
    { icon: 'fa-tree', title: 'Natural surroundings', text: 'Quiet hills and fresh air, away from city noise.' },
    { icon: 'fa-bed', title: 'Comfortable rooms', text: 'Clean, warm rooms with hot water and the basics done well.' },
    { icon: 'fa-utensils', title: 'Home-style food', text: 'Fresh meals from our kitchen, served when you need them.' }
  ];
}
