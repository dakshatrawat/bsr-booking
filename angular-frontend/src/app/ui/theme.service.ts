import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'bsr-theme';

// The initial theme is applied by an inline script in index.html (before first paint).
// This service reads that state and handles user changes from then on.
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<Theme>(this.initialTheme());

  toggle(): void {
    this.set(this.theme() === 'dark' ? 'light' : 'dark');
  }

  set(theme: Theme): void {
    const root = document.documentElement;
    // Animate colours only for this one change, not on every render
    root.classList.add('theme-transition');
    root.dataset['theme'] = theme;
    this.theme.set(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Storage blocked (private mode): the choice still applies for this visit
    }
    window.setTimeout(() => root.classList.remove('theme-transition'), 300);
  }

  private initialTheme(): Theme {
    const applied = document.documentElement.dataset['theme'];
    if (applied === 'light' || applied === 'dark') return applied;
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
