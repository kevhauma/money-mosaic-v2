import { ThemeService } from './theme.service';

const STYLE_KEY = 'mm-theme-style';
const LEGACY_MODE_KEY = 'mm-theme';
const LEGACY_LIGHT_KEY = 'mm-style-light';
const LEGACY_DARK_KEY = 'mm-style-dark';

describe('ThemeService', () => {
  afterEach(() => {
    localStorage.removeItem(STYLE_KEY);
    localStorage.removeItem(LEGACY_MODE_KEY);
    localStorage.removeItem(LEGACY_LIGHT_KEY);
    localStorage.removeItem(LEGACY_DARK_KEY);
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to the default light style when nothing is stored', () => {
    const service = new ThemeService();

    expect(service.style()).toBe('deformable');
    expect(document.documentElement.getAttribute('data-theme')).toBe('deformable');
  });

  it('restores a stored style choice', () => {
    localStorage.setItem(STYLE_KEY, 'cyberpunk');

    const service = new ThemeService();

    expect(service.style()).toBe('cyberpunk');
    expect(document.documentElement.getAttribute('data-theme')).toBe('cyberpunk');
  });

  it('ignores an unknown/removed stored style id', () => {
    localStorage.setItem(STYLE_KEY, 'not-a-real-style');

    const service = new ThemeService();

    expect(service.style()).toBe('deformable');
  });

  it('select() applies and persists the chosen style', () => {
    const service = new ThemeService();

    service.select('skeuomorphism');

    expect(service.style()).toBe('skeuomorphism');
    expect(document.documentElement.getAttribute('data-theme')).toBe('skeuomorphism');
    expect(localStorage.getItem(STYLE_KEY)).toBe('skeuomorphism');
  });

  it('select() rejects an unknown style id', () => {
    const service = new ThemeService();

    service.select('not-a-real-style' as never);

    expect(service.style()).toBe('deformable');
  });

  it('migrates a legacy light-mode style pick on first read, then clears legacy keys', () => {
    localStorage.setItem(LEGACY_MODE_KEY, 'light');
    localStorage.setItem(LEGACY_LIGHT_KEY, 'memphis');
    localStorage.setItem(LEGACY_DARK_KEY, 'neumorphism');

    const service = new ThemeService();

    expect(service.style()).toBe('memphis');
    expect(document.documentElement.getAttribute('data-theme')).toBe('memphis');
    expect(localStorage.getItem(LEGACY_MODE_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_LIGHT_KEY)).toBeNull();
    expect(localStorage.getItem(LEGACY_DARK_KEY)).toBeNull();
    expect(localStorage.getItem(STYLE_KEY)).toBe('memphis');
  });

  it('migrates a legacy dark-mode "deformable" pick onto the new "deformable-dark" entry', () => {
    localStorage.setItem(LEGACY_MODE_KEY, 'dark');
    localStorage.setItem(LEGACY_DARK_KEY, 'deformable');

    const service = new ThemeService();

    expect(service.style()).toBe('deformable-dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('deformable-dark');
  });

  it('prefers a current-format stored style over legacy keys', () => {
    localStorage.setItem(STYLE_KEY, 'liquid-glass');
    localStorage.setItem(LEGACY_MODE_KEY, 'light');
    localStorage.setItem(LEGACY_LIGHT_KEY, 'memphis');

    const service = new ThemeService();

    expect(service.style()).toBe('liquid-glass');
  });
});
