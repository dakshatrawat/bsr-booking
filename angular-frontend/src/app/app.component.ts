import { Component, ElementRef, ViewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from './navbar/navbar.component';
import { FooterComponent } from './footer/footer.component';
import { ChatbotComponent } from './chatbot/chatbot.component';
import { ToastOutletComponent } from './ui/toast-outlet.component';
import { ConfirmDialogComponent } from './ui/confirm-dialog.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NavbarComponent, FooterComponent, ChatbotComponent, ToastOutletComponent, ConfirmDialogComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Hotel-Angular';

  @ViewChild('main') main!: ElementRef<HTMLElement>;

  // A plain #main href would make the router reload "/" — focus the landmark instead
  skipToMain(event: Event): void {
    event.preventDefault();
    this.main.nativeElement.focus();
  }
}
