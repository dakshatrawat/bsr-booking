import { AfterViewChecked, ChangeDetectorRef, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AgentChatResponse,
  AgentChatService,
  AgentMessage,
} from './agent-chat.service';
import { ApiService } from '../service/api.service';
import { NavigationEnd, Router } from '@angular/router';
import { Subscription, filter } from 'rxjs';

interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  time: Date;
  // Bot messages that report a failure are shown but never sent back as history
  isError?: boolean;
  failed?: boolean;
}

const OPEN_KEY = 'bsr-chat-open';
const LAUNCHER_LABEL = 'Ask our assistant';
const BUSY_ROUTES = /^\/(admin|rooms|room-details|payment)/;

@Component({
  selector: 'app-chatbot',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chatbot.component.html',
  styleUrl: './chatbot.component.css'
})
export class ChatbotComponent implements OnInit, AfterViewChecked, OnDestroy {
  isOpen = false;
  // Opens in the small size; the expand button switches to the roomy one
  isCompact = true;
  // Launcher label; typed out letter by letter right after the user minimizes
  launcherText = LAUNCHER_LABEL;
  isTyping = false;
  showPeek = false;
  message = '';
  isLoading = false;
  // null until we hear back; drives the status line so we never claim "online" without proof
  isReachable: boolean | null = null;

  readonly greetings = [
    'Looking for a room for your dates?',
    'Not sure which room type suits you?',
    'Travelling as a family or group?',
    'Want to check or make a booking?',
  ];
  greetingIndex = 0;

  messages: ChatMessage[] = [
    {
      sender: 'bot',
      text: 'Hi! I can find free rooms for your dates, explain room types, show your bookings, or make a booking for you.',
      time: new Date(),
    },
  ];

  @ViewChild('messageList') messageList?: ElementRef<HTMLElement>;
  @ViewChild('composer') composer?: ElementRef<HTMLTextAreaElement>;
  @ViewChild('launcher') launcher?: ElementRef<HTMLButtonElement>;

  private openedByUser = false;
  private routerSub?: Subscription;
  private greetingTimer?: ReturnType<typeof setInterval>;
  private greetingPaused = false;
  private typingTimer?: ReturnType<typeof setInterval>;
  private shouldScroll = false;
  private readonly reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  private readonly sessionId = this.loadSessionId();

  constructor(private agentChatService: AgentChatService, private apiService: ApiService, private router: Router, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    const saved = this.readPreference();
    const isSmallScreen = window.matchMedia?.('(max-width: 639px)').matches ?? false;
    if (saved === null) {
      // First visit: open the small panel. On phones it would fill the screen,
      // so show a dismissible greeting next to the launcher instead.
      this.isOpen = !isSmallScreen;
      this.showPeek = isSmallScreen;
    } else {
      this.isOpen = saved && !isSmallScreen;
    }
    this.startGreetingRotation();

    // An auto-opened panel steps aside on pages where it would cover working controls
    // (admin tables, booking calendar, payment). If the user opened it, it stays.
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (this.isOpen && !this.openedByUser && BUSY_ROUTES.test(e.urlAfterRedirects)) {
          this.isOpen = false;
        }
      });
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.messageList) {
      const el = this.messageList.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  ngOnDestroy(): void {
    this.stopGreetingRotation();
    this.stopTyping();
    this.routerSub?.unsubscribe();
  }

  get isAuthenticated(): boolean {
    return this.apiService.isAuthenticated();
  }

  get hasConversation(): boolean {
    return this.messages.some((m) => m.sender === 'user');
  }

  // Suggestions map to what the agent can actually do (see AgentAction on the backend)
  get quickQuestions(): string[] {
    const questions = [
      'What rooms are free this weekend?',
      'Which room is best for a family of four?',
      'What room types do you have?',
    ];
    questions.push(this.isAuthenticated ? 'Show my bookings' : 'Help me book a room');
    return questions;
  }

  get currentGreeting(): string {
    return this.greetings[this.greetingIndex];
  }

  open(focusInput = true): void {
    this.stopTyping();
    this.isOpen = true;
    this.openedByUser = true;
    this.showPeek = false;
    this.shouldScroll = true;
    this.savePreference(true);
    if (focusInput) {
      // Change detection is coalesced to the next frame: render now so the input exists
      this.cdr.detectChanges();
      this.composer?.nativeElement.focus();
    }
  }

  minimize(): void {
    this.isOpen = false;
    this.savePreference(false);
    this.typeLauncherLabel();
    this.cdr.detectChanges();
    this.launcher?.nativeElement.focus();
  }

  // Types the launcher label once per minimize (never loops); instant under reduced motion
  private typeLauncherLabel(): void {
    this.stopTyping();
    if (this.reducedMotion) return;
    let shown = 0;
    this.launcherText = '';
    this.isTyping = true;
    this.typingTimer = setInterval(() => {
      shown++;
      this.launcherText = LAUNCHER_LABEL.slice(0, shown);
      if (shown >= LAUNCHER_LABEL.length) this.stopTyping();
    }, 55);
  }

  private stopTyping(): void {
    if (this.typingTimer) clearInterval(this.typingTimer);
    this.typingTimer = undefined;
    this.isTyping = false;
    this.launcherText = LAUNCHER_LABEL;
  }

  dismissPeek(): void {
    this.showPeek = false;
    this.savePreference(false);
  }

  toggleSize(): void {
    this.isCompact = !this.isCompact;
    this.shouldScroll = true;
  }

  @HostListener('keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (!this.isOpen) return;
    event.stopPropagation();
    this.minimize();
  }

  @HostListener('document:visibilitychange')
  onVisibilityChange(): void {
    if (document.hidden) {
      this.stopGreetingRotation();
    } else {
      this.startGreetingRotation();
    }
  }

  // Re-create the greeting element on change so its enter transition runs
  trackGreeting(_: number, greeting: string): string {
    return greeting;
  }

  pauseGreeting(paused: boolean): void {
    this.greetingPaused = paused;
  }

  onComposerKeydown(event: KeyboardEvent): void {
    // Enter sends; Shift+Enter inserts a newline; ignore Enter while composing (IME)
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  autoGrow(): void {
    const el = this.composer?.nativeElement;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 128) + 'px';
  }

  askQuickQuestion(question: string): void {
    if (this.isLoading) return;
    this.message = question;
    this.sendMessage();
  }

  sendMessage() {
    if (!this.message.trim() || this.isLoading) return;
    const content = this.message.trim();
    this.messages.push({ sender: 'user', text: content, time: new Date() });
    this.message = '';
    setTimeout(() => this.autoGrow());
    this.request();
  }

  // Re-send the conversation after a failure, without duplicating the user's message
  retry(): void {
    if (this.isLoading) return;
    this.messages = this.messages.filter((m) => !m.isError);
    this.messages.forEach((m) => (m.failed = false));
    this.request();
  }

  private request(): void {
    this.isLoading = true;
    this.shouldScroll = true;

    const payload: AgentMessage[] = this.messages
      .filter((m) => !m.isError)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }));

    this.agentChatService.chat({ sessionId: this.sessionId, messages: payload }).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.isReachable = true;
        this.handleAgentResponse(res);
        this.shouldScroll = true;
      },
      error: (err) => {
        // Always release the input; previously a failed request left it locked
        this.isLoading = false;
        const lastUser = [...this.messages].reverse().find((m) => m.sender === 'user');
        if (err.status === 401 || err.status === 403) {
          this.messages.push({
            sender: 'bot',
            text: 'Please log in to use this part of the assistant.',
            time: new Date(),
            isError: true,
          });
        } else {
          this.isReachable = err.status === 0 ? false : this.isReachable;
          if (lastUser) lastUser.failed = true;
          this.messages.push({
            sender: 'bot',
            text: err.status === 0
              ? 'I can’t reach the booking system right now. Check your connection, then retry.'
              : 'Something went wrong on our side. Your message wasn’t lost, so you can retry.',
            time: new Date(),
            isError: true,
          });
        }
        this.shouldScroll = true;
      },
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
    }
    if (res.note) {
      this.messages.push({ sender: 'bot', text: res.note, time: new Date(), isError: true });
    }
  }

  private formatPrice(value: any): string {
    const amount = Number(value);
    if (!value || isNaN(amount)) return '';
    return ` · ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)}/night`;
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
        return `• Room ${roomNumber} (${type})${this.formatPrice(r.pricePerNight)}`;
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
        return `• ${ref}: ${b.checkInDate} → ${b.checkOutDate}`;
      });
      const more = response.bookings.length > 5 ? '\n…and more bookings.' : '';
      return `Your bookings:\n${lines.join('\n')}${more}`;
    }

    if (response.room) {
      const r = response.room;
      const roomNumber = r.roomNumber ?? r.id ?? '';
      const type = r.type ?? '';
      const capacity = r.capacity ? ` · sleeps ${r.capacity}` : '';
      return `Room ${roomNumber} (${type})${this.formatPrice(r.pricePerNight)}${capacity}`;
    }

    if (response.booking) {
      const b = response.booking;
      const total = b.totalPrice != null
        ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(b.totalPrice))
        : 'N/A';
      return `Booking created. Reference: ${b.bookingReference ?? 'N/A'}, total: ${total}`;
    }

    if (response.message) {
      return response.message;
    }

    return null;
  }

  private startGreetingRotation(): void {
    // Reduced motion: keep the first greeting still
    if (this.reducedMotion || this.greetingTimer) return;
    this.greetingTimer = setInterval(() => {
      if (!this.greetingPaused) {
        this.greetingIndex = (this.greetingIndex + 1) % this.greetings.length;
      }
    }, 4500);
  }

  private stopGreetingRotation(): void {
    clearInterval(this.greetingTimer);
    this.greetingTimer = undefined;
  }

  private readPreference(): boolean | null {
    try {
      const value = localStorage.getItem(OPEN_KEY);
      return value === null ? null : value === 'true';
    } catch {
      return null;
    }
  }

  private savePreference(open: boolean): void {
    try {
      localStorage.setItem(OPEN_KEY, String(open));
    } catch {
      // Storage unavailable: preference lasts for this page view only
    }
  }

  // Lets the backend keep context for anonymous visitors within this tab
  private loadSessionId(): string {
    try {
      let id = sessionStorage.getItem('bsr-chat-session');
      if (!id) {
        id = crypto.randomUUID?.() ?? Math.random().toString(36).slice(2);
        sessionStorage.setItem('bsr-chat-session', id);
      }
      return id;
    } catch {
      return Math.random().toString(36).slice(2);
    }
  }
}
