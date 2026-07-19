import { Injectable, computed, signal } from '@angular/core';
import { DEFAULT_STYLE, themeStyleById, type ThemeMode, type ThemeStyleId } from './theme-styles';

const MODE_STORAGE_KEY = 'mm-theme';
const STYLE_STORAGE_KEY: Record<ThemeMode, string> = {
  light: 'mm-style-light',
  dark: 'mm-style-dark',
};

function readStoredMode(): ThemeMode | null {
  const stored = localStorage.getItem(MODE_STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : null;
}

/** Ignores unknown/removed style ids (and styles that don't support the mode) rather than throwing — localStorage outlives refactors. */
function readStoredStyle(mode: ThemeMode): ThemeStyleId | null {
  const style = themeStyleById(localStorage.getItem(STYLE_STORAGE_KEY[mode]));
  return style && style.dataTheme[mode] !== undefined ? style.id : null;
}

/** jsdom (this repo's Vitest environment) doesn't implement `matchMedia` unless a spec stubs it — fall back to 'light' rather than throwing. */
function systemTheme(): ThemeMode {
  if (typeof window.matchMedia !== 'function') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Owns the two axes of the app's appearance: the light/dark `mode` (navbar sun/moon quick-toggle)
 * and, per mode, which theme *style* from `THEME_STYLES` renders it (settings page picker). The
 * two resolve to a single daisyUI `data-theme` attribute on `<html>`. Deliberately
 * `localStorage`-only, not the Dexie-backed `appSettings` table v2's TICKET-SET-01 would
 * introduce — appearance is a per-browser preference, not portable data.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _mode = signal<ThemeMode>(readStoredMode() ?? systemTheme());
  readonly mode = this._mode.asReadonly();
  /** Back-compat alias — pre-theme-picker callers (navbar toggle icon) read this as `theme`. */
  readonly theme = this._mode.asReadonly();

  private readonly _lightStyle = signal<ThemeStyleId>(
    readStoredStyle('light') ?? DEFAULT_STYLE.light,
  );
  private readonly _darkStyle = signal<ThemeStyleId>(readStoredStyle('dark') ?? DEFAULT_STYLE.dark);
  readonly lightStyle = this._lightStyle.asReadonly();
  readonly darkStyle = this._darkStyle.asReadonly();

  /** The style rendering the current mode. */
  readonly activeStyle = computed<ThemeStyleId>(() =>
    this._mode() === 'dark' ? this._darkStyle() : this._lightStyle(),
  );

  constructor() {
    this.apply();
  }

  toggle(): void {
    this._mode.set(this._mode() === 'dark' ? 'light' : 'dark');
    this.apply();
  }

  /**
   * Picks `style` as the look for `mode`, and switches the app to that mode so the choice is
   * immediately visible — the settings page's two picker groups are "what does light mode look
   * like" / "what does dark mode look like", and tapping either previews it live.
   */
  selectStyle(mode: ThemeMode, style: ThemeStyleId): void {
    if (themeStyleById(style)?.dataTheme[mode] === undefined) return;
    (mode === 'dark' ? this._darkStyle : this._lightStyle).set(style);
    this._mode.set(mode);
    this.apply();
  }

  private apply(): void {
    const mode = this._mode();
    // The guards in readStoredStyle/selectStyle keep style↔mode pairs valid, so the lookup can't miss.
    const dataTheme = themeStyleById(this.activeStyle())?.dataTheme[mode] ?? 'deformable';
    document.documentElement.setAttribute('data-theme', dataTheme);
    localStorage.setItem(MODE_STORAGE_KEY, mode);
    localStorage.setItem(STYLE_STORAGE_KEY.light, this._lightStyle());
    localStorage.setItem(STYLE_STORAGE_KEY.dark, this._darkStyle());
  }
}
