import { vi } from 'vitest';
import { ThemeService } from './theme.service';

const STORAGE_KEY = 'mm-theme';

const mockMatchMedia = (matches: boolean): void => {
  window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
};

describe('ThemeService', () => {
  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    document.documentElement.removeAttribute('data-theme');
    vi.restoreAllMocks();
  });

  it('defaults to the system light preference and sets the light data-theme', () => {
    mockMatchMedia(false);

    const service = new ThemeService();

    expect(service.theme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('moneymosaic');
  });

  it('defaults to the system dark preference and sets the dark data-theme', () => {
    mockMatchMedia(true);

    const service = new ThemeService();

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('moneymosaic-dark');
  });

  it('prefers a stored choice over the system preference', () => {
    mockMatchMedia(true);
    localStorage.setItem(STORAGE_KEY, 'light');

    const service = new ThemeService();

    expect(service.theme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('moneymosaic');
  });

  it('toggle() flips the mode, updates data-theme, and persists the choice', () => {
    mockMatchMedia(false);
    const service = new ThemeService();

    service.toggle();

    expect(service.theme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('moneymosaic-dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');

    service.toggle();

    expect(service.theme()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('moneymosaic');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('light');
  });
});
