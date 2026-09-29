import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DEFAULT_APP_SETTINGS } from '@/core/data-access';
import { AppSettingsStore } from '@/core/state';
import { SettingsPrivacySectionComponent } from './settings-privacy-section.component';
import { provideFakeApi, seedApi } from '@/core/data-access/fake-api.testing';

/** The one endpoint this section's setting lives behind. */
const APP_SETTINGS_URL = '/api/settings/appSettings';

describe('SettingsPrivacySectionComponent: privacy-mode toggle', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [...provideFakeApi()],
      imports: [SettingsPrivacySectionComponent],
    }).compileComponents();
  });

  const render = (): HTMLElement => {
    const fixture = TestBed.createComponent(SettingsPrivacySectionComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  const toggle = (element: HTMLElement): HTMLInputElement =>
    element.querySelector('input[type="checkbox"]') as HTMLInputElement;

  it('renders the toggle off by default', () => {
    expect(toggle(render()).checked).toBe(false);
  });

  it('flipping the toggle on calls AppSettingsStore.setPrivacyMode', () => {
    const element = render();
    const setPrivacyMode = vi
      .spyOn(TestBed.inject(AppSettingsStore), 'setPrivacyMode')
      .mockResolvedValue();

    const input = toggle(element);
    input.checked = true;
    input.dispatchEvent(new Event('change'));

    expect(setPrivacyMode).toHaveBeenCalledExactlyOnceWith(true);
  });

  it('flipping the toggle back off calls AppSettingsStore.setPrivacyMode with false', () => {
    const element = render();
    const setPrivacyMode = vi
      .spyOn(TestBed.inject(AppSettingsStore), 'setPrivacyMode')
      .mockResolvedValue();

    const input = toggle(element);
    input.checked = true;
    input.dispatchEvent(new Event('change'));
    input.checked = false;
    input.dispatchEvent(new Event('change'));

    expect(setPrivacyMode).toHaveBeenLastCalledWith(false);
  });

  it('reflects a persisted privacyMode once the store hydrates', async () => {
    // Spread the defaults rather than enumerating every field — `AppSettings` grows an additive
    // optional field most versions, and this test cares about exactly one of them.
    seedApi(APP_SETTINGS_URL, { ...DEFAULT_APP_SETTINGS, privacyMode: true });
    const fixture = TestBed.createComponent(SettingsPrivacySectionComponent);
    fixture.detectChanges();
    await TestBed.inject(AppSettingsStore).hydrate();
    fixture.detectChanges();

    // The pull half of `linkControlToSetting`: hydration resolves after the control read its
    // initial value, so the effect has to write the store's value back into the control.
    expect(toggle(fixture.nativeElement as HTMLElement).checked).toBe(true);
  });
});
