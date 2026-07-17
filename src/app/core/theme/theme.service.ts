import { Injectable, signal } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'mm-theme';
/** The two named daisyUI themes TICKET-UI-11 defined in styles.css. */
const DATA_THEME: Record<ThemeMode, string> = {
  light: 'moneymosaic',
  dark: 'moneymosaic-dark',
};

function readStoredTheme(): ThemeMode | null {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
}

/** jsdom (this repo's Vitest environment) doesn't implement `matchMedia` unless a spec stubs it — fall back to 'light' rather than throwing. */
function systemTheme(): ThemeMode {
  if (typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Navbar quick-toggle between the light/OLED-dark daisyUI themes (TICKET-UI-11) — deliberately not
 * the Dexie-backed `appSettings` table v2's TICKET-SET-01 would introduce; this is a simpler,
 * `localStorage`-only preference with no "system" option, until/unless that ticket lands.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _theme = signal<ThemeMode>(readStoredTheme() ?? systemTheme());
  readonly theme = this._theme.asReadonly();

  constructor() {
    this.applyTheme(this._theme());
  }

  toggle(): void {
    const mode = this._theme() === 'dark' ? 'light' : 'dark';
    this._theme.set(mode);
    this.applyTheme(mode);
  }

  private applyTheme(mode: ThemeMode): void {
    document.documentElement.setAttribute('data-theme', DATA_THEME[mode]);
    localStorage.setItem(STORAGE_KEY, mode);
  }
}
