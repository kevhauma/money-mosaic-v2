import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { appDb } from '@/core/data-access';
import {
  DEFAULT_CURRENCY_SYMBOL,
  DEFAULT_CURRENCY_SYMBOL_POSITION,
  DEFAULT_LOCALE,
  syncFormatSettings,
} from '@/shared/utils';
import { SettingsOverviewComponent } from './settings-overview.component';

/**
 * Composition only (TICKET-SET-07) — each section's own behaviour is covered by its own spec, so
 * this file just proves the page mounts every section and the welcome link.
 */
describe('SettingsOverviewComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsOverviewComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(async () => {
    localStorage.removeItem('mm-theme-style');
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.removeProperty('--color-primary');
    document.documentElement.style.removeProperty('--color-primary-content');
    await appDb.appSettings.clear();
    syncFormatSettings({
      currencySymbol: DEFAULT_CURRENCY_SYMBOL,
      currencySymbolPosition: DEFAULT_CURRENCY_SYMBOL_POSITION,
      locale: DEFAULT_LOCALE,
    });
  });

  const render = (): HTMLElement => {
    const fixture = TestBed.createComponent(SettingsOverviewComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('renders every settings section, in order', () => {
    const element = render();

    const sections = Array.from(
      element.querySelectorAll(
        'app-settings-theme-section, app-settings-currency-locale-section, app-settings-data-section, app-settings-about-section',
      ),
    ).map((section) => section.tagName.toLowerCase());

    expect(sections).toEqual([
      'app-settings-theme-section',
      'app-settings-currency-locale-section',
      'app-settings-data-section',
      'app-settings-about-section',
    ]);
  });

  it('opens with a bare "Settings" header and no subtitle caption (TICKET-UI-22)', () => {
    const header = render().querySelector('mm-page-header');

    expect(header?.querySelector('h1')?.textContent?.trim()).toBe('Settings');
    expect(header?.querySelector('.mm-text-caption')).toBeNull();
  });

  it('links back to the public welcome page', () => {
    const link = render().querySelector('a[href="/home"]');

    expect(link?.textContent?.trim()).toBe('View the welcome page');
  });
});
