import { Directive, ElementRef, Input, OnDestroy, OnInit } from '@angular/core';

// Fades an element up as it enters the viewport.
// Content is only hidden once this directive has run (html.reveal-ready), so if
// scripts fail it stays visible. Reduced-motion users see it immediately.
@Directive({
  selector: '[appReveal]',
  standalone: true,
})
export class RevealDirective implements OnInit, OnDestroy {
  @Input() revealDelay = 0; // ms, for small staggered groups

  private observer?: IntersectionObserver;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    const node = this.el.nativeElement;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !('IntersectionObserver' in window)) return;

    document.documentElement.classList.add('reveal-ready');
    node.classList.add('reveal');
    node.style.setProperty('--reveal-delay', `${this.revealDelay}ms`);

    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          node.classList.add('is-revealed');
          this.observer?.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );
    this.observer.observe(node);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
