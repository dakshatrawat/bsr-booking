import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AgentChatResponse,
  AgentChatService,
  AgentMessage,
} from './agent-chat.service';

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css'
})
export class ChatbotComponent {
  isOpen = false;
  message = '';
  isLoading = false;
  error?: string;

  messages: { sender: 'user' | 'bot'; text: string; time: Date }[] = [
    {
      sender: 'bot',
      text: 'Hi! I am your AI booking assistant. Ask me to find rooms, view your bookings, or create a booking.',
      time: new Date(),
    },
  ];

  constructor(private agentChatService: AgentChatService) {}

  toggleChat() {
    this.isOpen = !this.isOpen;
  }

  sendMessage() {
    if (!this.message.trim() || this.isLoading) return;
    const content = this.message.trim();
    this.messages.push({ sender: 'user', text: content, time: new Date() });
    this.message = '';
    this.error = undefined;
    this.isLoading = true;

    const payload: AgentMessage[] = this.messages.map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    this.agentChatService.chat({ messages: payload }).subscribe({
      next: (res) => this.handleAgentResponse(res),
      error: (err) => {
        console.error('Agent chat error', err);
        if (err.status === 401 || err.status === 403) {
          this.messages.push({
            sender: 'bot',
            text: 'Please log in to use the assistant.',
            time: new Date(),
          });
        } else {
        this.messages.push({
          sender: 'bot',
          text: 'Sorry, something went wrong. Please try again.',
          time: new Date(),
        });
        }
        this.error = 'Unable to contact assistant';
      },
      complete: () => (this.isLoading = false),
    });
  }

  private handleAgentResponse(res: AgentChatResponse) {
    const reply = res.reply || 'Done.';
    this.messages.push({ sender: 'bot', text: reply, time: new Date() });

    if (res.backendResponse) {
      const details = this.formatBackendResponse(res.backendResponse);
      if (details) {
        this.messages.push({ sender: 'bot', text: details, time: new Date() });
      }
      console.info('Agent backend response', res.backendResponse);
    }
    if (res.note) {
      this.error = res.note;
    }
  }

  private formatBackendResponse(response: any): string | null {
    if (!response) return null;

    if (response.rooms && Array.isArray(response.rooms)) {
      if (response.rooms.length === 0) {
        return 'No rooms available for those dates.';
      }
      const lines = response.rooms.slice(0, 5).map((r: any) => {
        const roomNumber = r.roomNumber ?? r.id ?? '';
        const type = r.type ?? '';
        const price = r.pricePerNight ? ` - $${r.pricePerNight}/night` : '';
        return `Room ${roomNumber} (${type})${price}`;
      });
      const more = response.rooms.length > 5 ? '\n…and more rooms available.' : '';
      return `Available rooms:\n${lines.join('\n')}${more}`;
    }

    if (response.bookings && Array.isArray(response.bookings)) {
      if (response.bookings.length === 0) {
        return 'You have no bookings yet.';
      }
      const lines = response.bookings.slice(0, 5).map((b: any) => {
        const ref = b.bookingReference ?? b.id ?? '';
        return `Booking ${ref} | ${b.checkInDate} → ${b.checkOutDate}`;
      });
      const more = response.bookings.length > 5 ? '\n…and more bookings.' : '';
      return `Your bookings:\n${lines.join('\n')}${more}`;
    }

    if (response.room) {
      const r = response.room;
      const roomNumber = r.roomNumber ?? r.id ?? '';
      const type = r.type ?? '';
      const price = r.pricePerNight ? ` - $${r.pricePerNight}/night` : '';
      const capacity = r.capacity ? ` | sleeps ${r.capacity}` : '';
      return `Room ${roomNumber} (${type})${price}${capacity}`;
    }

    if (response.booking) {
      const b = response.booking;
      return `Booking created. Reference: ${b.bookingReference ?? 'N/A'}, total: ${b.totalPrice ?? 'N/A'}`;
    }

    if (response.message) {
      return response.message;
    }

    return null;
  }
}
