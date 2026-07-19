import { vi } from 'vitest';
import { ThemeService } from './theme.service';

const MODE_KEY = 'mm-theme';
const LIGHT_STYLE_KEY = 'mm-style-light';
const DARK_STYLE_KEY = 'mm-style-dark';

const mockMatchMedia = (matches: boolean): void => {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
};

describe('ThemeService', () => {
  afterEach(() => {
    localStorage.removeItem(MODE_KEY);
    localStorage.removeItem(LIGHT_STYLE_KEY);
    localStorage.removeItem(DARK_STYLE_KEY);
    document.documentElement.removeAttribute('data-theme');
    vi.restoreAllMocks();
  });

  it('defaults to the system light preference and the default light style', () => {
    mockMatchMedia(false);

    const service = new ThemeService();

    expect(service.mode()).toBe('light');
    expect(service.activeStyle()).toBe('deformable');
    expect(document.documentElement.getAttribute('data-theme')).toBe('deformable');
  });

  it('defaults to the system dark preference and the default dark style', () => {
    mockMatchMedia(true);

    const service = new ThemeService();

    expect(service.mode()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('deformable-dark');
  });

  it('prefers a stored mode choice over the system preference', () => {
    mockMatchMedia(true);
    localStorage.setItem(MODE_KEY, 'light');

    const service = new ThemeService();

    expect(service.mode()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('deformable');
  });

  it('restores stored per-mode style choices', () => {
    mockMatchMedia(false);
    localStorage.setItem(MODE_KEY, 'dark');
    localStorage.setItem(DARK_STYLE_KEY, 'neumorphism');
    localStorage.setItem(LIGHT_STYLE_KEY, 'memphis');

    const service = new ThemeService();

    expect(service.darkStyle()).toBe('neumorphism');
    expect(service.lightStyle()).toBe('memphis');
    expect(document.documentElement.getAttribute('data-theme')).toBe('neumorphism');
  });

  it('ignores a stored style that does not support its mode', () => {
    mockMatchMedia(false);
    // memphis is light-only — an (impossible via UI, but possible via stale storage) dark pick.
    localStorage.setItem(DARK_STYLE_KEY, 'memphis');

    const service = new ThemeService();

    expect(service.darkStyle()).toBe('deformable');
  });

  it('toggle() flips the mode between the two per-mode style picks and persists', () => {
    mockMatchMedia(false);
    const service = new ThemeService();
    service.selectStyle('dark', 'cyberpunk');
    service.selectStyle('light', 'retro-futurism');

    expect(service.mode()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('retro-futurism');

    service.toggle();

    expect(service.mode()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('cyberpunk');
    expect(localStorage.getItem(MODE_KEY)).toBe('dark');

    service.toggle();

    expect(document.documentElement.getAttribute('data-theme')).toBe('retro-futurism');
  });

  it('selectStyle() sets the style for that mode, switches to it, and persists both picks', () => {
    mockMatchMedia(false);
    const service = new ThemeService();

    service.selectStyle('dark', 'liquid-glass');

    expect(service.mode()).toBe('dark');
    expect(service.activeStyle()).toBe('liquid-glass');
    expect(document.documentElement.getAttribute('data-theme')).toBe('liquid-glass');
    expect(localStorage.getItem(DARK_STYLE_KEY)).toBe('liquid-glass');
    expect(localStorage.getItem(MODE_KEY)).toBe('dark');
  });

  it('selectStyle() rejects a style that does not support the requested mode', () => {
    mockMatchMedia(false);
    const service = new ThemeService();

    service.selectStyle('light', 'neumorphism');

    expect(service.mode()).toBe('light');
    expect(service.lightStyle()).toBe('deformable');
    expect(document.documentElement.getAttribute('data-theme')).toBe('deformable');
  });
});
