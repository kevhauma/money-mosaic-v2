import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { appDb, DEFAULT_APP_SETTINGS } from '@/core/data-access';
import { AppSettingsStore } from '@/core/state';
import { PrivacyToggleComponent } from './privacy-toggle.component';

describe('PrivacyToggleComponent (TICKET-PRIV-02)', () => {
  let fixture: ComponentFixture<PrivacyToggleComponent>;

  beforeEach(async () => {
    // `mm-button` renders an `<a routerLink>` branch, so the router has to be provided even though
    // this control never takes a `link`.
    await TestBed.configureTestingModule({
      imports: [PrivacyToggleComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  afterEach(async () => {
    // fake-indexeddb is a global singleton and Vitest runs with isolate:false, so a row written
    // here would otherwise leak into other spec files.
    await appDb.appSettings.clear();
  });

  const render = (): HTMLButtonElement => {
    fixture = TestBed.createComponent(PrivacyToggleComponent);
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  };

  it('reads "Hide amounts" with privacy mode off — worded as the action, not the state', () => {
    const button = render();

    expect(button.textContent?.trim()).toBe('Hide amounts');
    expect(button.querySelector('ng-icon')).not.toBeNull();
    // The visible label carries the accessible name, so there is no aria-label to drift from it.
    expect(button.getAttribute('aria-label')).toBeNull();
  });

  it('flips to "Show amounts" and a different icon once privacy mode is on', async () => {
    const button = render();
    const eyeGlyph = button.querySelector('ng-icon')?.innerHTML;

    await TestBed.inject(AppSettingsStore).setPrivacyMode(true);
    fixture.detectChanges();

    expect(button.textContent?.trim()).toBe('Show amounts');
    expect(button.querySelector('ng-icon')?.innerHTML).not.toBe(eyeGlyph);
  });

  it('writes the negated setting through AppSettingsStore on click', () => {
    const button = render();
    const setPrivacyMode = vi
      .spyOn(TestBed.inject(AppSettingsStore), 'setPrivacyMode')
      .mockResolvedValue();

    button.click();

    expect(setPrivacyMode).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('writes `false` when clicked while privacy mode is already on', async () => {
    const button = render();
    await TestBed.inject(AppSettingsStore).setPrivacyMode(true);
    fixture.detectChanges();
    const setPrivacyMode = vi
      .spyOn(TestBed.inject(AppSettingsStore), 'setPrivacyMode')
      .mockResolvedValue();

    button.click();

    expect(setPrivacyMode).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('opens on the persisted setting rather than the default, once the store hydrates', async () => {
    // Spread the defaults rather than enumerating every field — `AppSettings` grows an additive
    // optional field most versions, and this test cares about exactly one of them.
    await appDb.appSettings.put({ ...DEFAULT_APP_SETTINGS, privacyMode: true });
    const button = render();
    await TestBed.inject(AppSettingsStore).hydrate();
    fixture.detectChanges();

    expect(button.textContent?.trim()).toBe('Show amounts');
  });

  it('persists through the store, never touching the appSettings table itself', () => {
    const button = render();
    const put = vi.spyOn(appDb.appSettings, 'put');
    vi.spyOn(TestBed.inject(AppSettingsStore), 'setPrivacyMode').mockResolvedValue();

    button.click();

    expect(put).not.toHaveBeenCalled();
  });
});
