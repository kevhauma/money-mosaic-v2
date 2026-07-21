import { Injectable, signal } from '@angular/core';
import { DEFAULT_STYLE, themeStyleById, type ThemeStyleId } from './theme-styles';

const STYLE_STORAGE_KEY = 'mm-theme-style';

/** Superseded by `STYLE_STORAGE_KEY` — read once for best-effort migration, then cleared. */
const LEGACY_MODE_KEY = 'mm-theme';
const LEGACY_STYLE_KEY: Record<'light' | 'dark', string> = {
  light: 'mm-style-light',
  dark: 'mm-style-dark',
};

function readStoredStyle(): ThemeStyleId | null {
  return themeStyleById(localStorage.getItem(STYLE_STORAGE_KEY))?.id ?? null;
}

/**
 * Best-effort read of the pre-unification mode+per-mode-style storage shape. The old `deformable`
 * id spanned both modes; a legacy dark-mode `deformable` pick maps onto the new `deformable-dark`
 * entry so the migration doesn't silently drop it back to a light theme.
 */
function readLegacyStyle(): ThemeStyleId | null {
  const mode = localStorage.getItem(LEGACY_MODE_KEY);
  const key = mode === 'dark' ? LEGACY_STYLE_KEY.dark : LEGACY_STYLE_KEY.light;
  const legacyId = localStorage.getItem(key);
  if (legacyId === 'deformable' && mode === 'dark') return 'deformable-dark';
  return themeStyleById(legacyId)?.id ?? null;
}

function clearLegacyStorage(): void {
  localStorage.removeItem(LEGACY_MODE_KEY);
  localStorage.removeItem(LEGACY_STYLE_KEY.light);
  localStorage.removeItem(LEGACY_STYLE_KEY.dark);
}

/**
 * Owns the app's single appearance axis: which theme `style` from `THEME_STYLES` renders it,
 * resolved straight to a daisyUI `data-theme` attribute on `<html>`. Deliberately `localStorage`-
 * only, not the Dexie-backed `appSettings` table v2's TICKET-SET-01 would introduce — appearance
 * is a per-browser preference, not portable data.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _style = signal<ThemeStyleId>(
    readStoredStyle() ?? readLegacyStyle() ?? DEFAULT_STYLE,
  );
  readonly style = this._style.asReadonly();

  constructor() {
    this.apply();
  }

  select(style: ThemeStyleId): void {
    if (!themeStyleById(style)) return;
    this._style.set(style);
    this.apply();
  }

  private apply(): void {
    const dataTheme = themeStyleById(this._style())?.dataTheme ?? 'deformable';
    document.documentElement.setAttribute('data-theme', dataTheme);
    localStorage.setItem(STYLE_STORAGE_KEY, this._style());
    clearLegacyStorage();
  }
}
