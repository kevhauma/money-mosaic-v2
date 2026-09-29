import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '@/core/data-access';
import { AppSettingsStore } from '@/core/state';
import { PrivacyToggleComponent } from './privacy-toggle.component';
import { FakeApiBackend, provideFakeApi, seedApi } from '@/core/data-access/fake-api.testing';

/** The one endpoint this section's setting lives behind. */
const APP_SETTINGS_URL = '/api/settings/appSettings';

describe('PrivacyToggleComponent (TICKET-PRIV-02)', () => {
  let fixture: ComponentFixture<PrivacyToggleComponent>;

  beforeEach(async () => {
    // `mm-button` renders an `<a routerLink>` branch, so the router has to be provided even though
    // this control never takes a `link`.
    await TestBed.configureTestingModule({
      imports: [PrivacyToggleComponent],
      providers: [...provideFakeApi(), provideRouter([])],
    }).compileComponents();
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
    seedApi(APP_SETTINGS_URL, { ...DEFAULT_APP_SETTINGS, privacyMode: true });
    const button = render();
    await TestBed.inject(AppSettingsStore).hydrate();
    fixture.detectChanges();

    expect(button.textContent?.trim()).toBe('Show amounts');
  });

  // The toggle goes through the store, which goes through the repository — it never writes the
  // setting itself. With the database gone, "never wrote it directly" is "made no request of its
  // own": the only call the click may produce is the one the stubbed store no longer makes.
  it('persists through the store, never calling the settings endpoint itself', () => {
    const button = render();
    const backend = TestBed.inject(FakeApiBackend);
    vi.spyOn(TestBed.inject(AppSettingsStore), 'setPrivacyMode').mockResolvedValue();
    const before = backend.calls.length;

    button.click();

    expect(backend.calls.slice(before)).toEqual([]);
  });
});
