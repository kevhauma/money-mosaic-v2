import { TestBed } from '@angular/core/testing';
import type { UiPreferences } from '@/core/data-access';
import { StoreResetService } from '@/core/store-reset';
import { UiPreferencesService } from '@/core/ui-preferences';
import { fakeUiPreferences } from '@/core/ui-preferences/ui-preferences.testing';
import { ThemeService } from './theme.service';

const dataTheme = (): string | null => document.documentElement.getAttribute('data-theme');

describe('ThemeService', () => {
  /** Restores the account's preferences first, as the app initializer does before anything renders. */
  const setup = async (stored: Partial<UiPreferences> = {}) => {
    const fake = fakeUiPreferences(stored);
    TestBed.configureTestingModule({ providers: fake.providers });
    await TestBed.inject(UiPreferencesService).restore();
    const service = TestBed.inject(ThemeService);
    TestBed.tick();
    return { ...fake, service };
  };

  afterEach(() => {
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to the default light style when the account has never picked one', async () => {
    const { service } = await setup();

    expect(service.style()).toBe('deformable');
    expect(dataTheme()).toBe('deformable');
  });

  it("applies the account's stored style", async () => {
    const { service } = await setup({ themeStyle: 'cyberpunk' });

    expect(service.style()).toBe('cyberpunk');
    expect(dataTheme()).toBe('cyberpunk');
  });

  /** A theme retired after somebody picked it must not leave their page unthemed. */
  it('reads a stored id the catalogue no longer has as the default', async () => {
    const { service } = await setup({ themeStyle: 'not-a-real-style' as never });

    expect(service.style()).toBe('deformable');
    expect(dataTheme()).toBe('deformable');
  });

  it('select() saves the pick to the account, then applies it', async () => {
    const { service, repository } = await setup();

    await service.select('skeuomorphism');
    TestBed.tick();

    expect(repository.setThemeStyle).toHaveBeenCalledWith('skeuomorphism');
    expect(service.style()).toBe('skeuomorphism');
    expect(dataTheme()).toBe('skeuomorphism');
  });

  it('select() refuses an unknown style id without asking the server', async () => {
    const { service, repository } = await setup();

    await service.select('not-a-real-style' as never);

    expect(repository.setThemeStyle).not.toHaveBeenCalled();
    expect(service.style()).toBe('deformable');
  });

  /** The theme is the account's, so a signed-out screen is the app's default — not the last user's. */
  it('goes back to the default when the account signs out', async () => {
    const { service } = await setup({ themeStyle: 'memphis' });

    TestBed.inject(StoreResetService).resetAll();
    TestBed.tick();

    expect(service.style()).toBe('deformable');
    expect(dataTheme()).toBe('deformable');
  });
});
