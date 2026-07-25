import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AppSettingsRepository } from '@/core/data-access';
import { ThemeService } from '@/core/theme';
import { AppSettingsStore } from './app-settings.store';

describe('AppSettingsStore', () => {
  const repository = { get: vi.fn(), setPrimaryColor: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    repository.get.mockResolvedValue({ id: 1 });
    repository.setPrimaryColor.mockResolvedValue(1);

    TestBed.configureTestingModule({
      providers: [{ provide: AppSettingsRepository, useValue: repository }],
    });
  });

  it('defaults to the empty settings before hydrate resolves', () => {
    const store = TestBed.inject(AppSettingsStore);
    expect(store.id()).toBe(1);
  });

  it('hydrate patches state from the repository', async () => {
    repository.get.mockResolvedValue({ id: 1 });
    const store = TestBed.inject(AppSettingsStore);

    await store.hydrate();

    expect(store.id()).toBe(1);
  });

  it('hydrates itself on first injection without a caller invoking hydrate() (TICKET-PERF-07)', async () => {
    const store = TestBed.inject(AppSettingsStore);

    await store.hydrate();

    expect(repository.get).toHaveBeenCalledTimes(1);
  });

  it('is idempotent: double injection and repeated calls all resolve without re-fetching', async () => {
    const store = TestBed.inject(AppSettingsStore);

    await Promise.all([store.hydrate(), store.hydrate()]);
    await store.hydrate();

    expect(repository.get).toHaveBeenCalledTimes(1);
  });

  it('setPrimaryColor persists through the repository and updates local state', async () => {
    const store = TestBed.inject(AppSettingsStore);

    await store.setPrimaryColor('sky');

    expect(repository.setPrimaryColor).toHaveBeenCalledExactlyOnceWith('sky');
    expect(store.primaryColor()).toBe('sky');
  });
});

describe('AppSettingsStore: --color-primary override (TICKET-SET-02)', () => {
  const repository = { get: vi.fn(), setPrimaryColor: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    repository.get.mockResolvedValue({ id: 1 });
    repository.setPrimaryColor.mockResolvedValue(1);

    TestBed.configureTestingModule({
      providers: [{ provide: AppSettingsRepository, useValue: repository }],
    });
  });

  afterEach(() => {
    localStorage.removeItem('mm-theme-style');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.removeProperty('--color-primary');
    document.documentElement.style.removeProperty('--color-primary-content');
  });

  it('applies the selected swatch while the Default Light theme is active', async () => {
    const store = TestBed.inject(AppSettingsStore);
    TestBed.inject(ThemeService).select('deformable');

    await store.setPrimaryColor('sky');
    TestBed.tick();

    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe(
      'oklch(60% 0.15 230)',
    );
  });

  it('applies the dark-mode pair while the Default Dark theme is active', async () => {
    const store = TestBed.inject(AppSettingsStore);
    TestBed.inject(ThemeService).select('deformable-dark');

    await store.setPrimaryColor('sky');
    TestBed.tick();

    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe(
      'oklch(75% 0.1425 230)',
    );
  });

  it('leaves --color-primary unset while a non-default theme is active', async () => {
    const store = TestBed.inject(AppSettingsStore);
    TestBed.inject(ThemeService).select('cyberpunk');

    await store.setPrimaryColor('sky');
    TestBed.tick();

    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('');
  });

  it('clears the override when the color is unset back to Default', async () => {
    const store = TestBed.inject(AppSettingsStore);
    TestBed.inject(ThemeService).select('deformable');
    await store.setPrimaryColor('sky');
    TestBed.tick();

    await store.setPrimaryColor(undefined);
    TestBed.tick();

    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('');
  });

  it('switching from a default theme to another theme clears the override', async () => {
    const themeService = TestBed.inject(ThemeService);
    const store = TestBed.inject(AppSettingsStore);
    themeService.select('deformable');
    await store.setPrimaryColor('rose');
    TestBed.tick();
    expect(document.documentElement.style.getPropertyValue('--color-primary')).not.toBe('');

    themeService.select('anti-polish');
    TestBed.tick();

    expect(document.documentElement.style.getPropertyValue('--color-primary')).toBe('');
  });
});
