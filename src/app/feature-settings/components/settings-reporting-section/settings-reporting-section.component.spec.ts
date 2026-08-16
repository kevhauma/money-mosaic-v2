import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { appDb, DEFAULT_APP_SETTINGS } from '@/core/data-access';
import { AppSettingsStore } from '@/core/state';
import { syncFormatSettings } from '@/shared/utils';
import { SettingsReportingSectionComponent } from './settings-reporting-section.component';

describe('SettingsReportingSectionComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsReportingSectionComponent],
    }).compileComponents();
  });

  afterEach(async () => {
    // fake-indexeddb is a global singleton and Vitest runs with isolate:false, so a row written
    // here would otherwise leak into other spec files.
    await appDb.appSettings.clear();
    syncFormatSettings({ locale: '' });
  });

  const render = (): HTMLElement => {
    const fixture = TestBed.createComponent(SettingsReportingSectionComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  const currentYear = new Date().getUTCFullYear();

  it('falls back to January when the field has never been written', () => {
    const select = render().querySelector('select') as HTMLSelectElement;

    expect(select.value).toBe('1');
  });

  it('renders twelve month options', () => {
    const options = render().querySelectorAll('select option');

    expect(options.length).toBe(12);
    expect(options[0].textContent?.trim()).toBe('January');
    expect(options[11].textContent?.trim()).toBe('December');
  });

  it('selecting a month calls AppSettingsStore.setFiscalYearStartMonth with a number', () => {
    const element = render();
    const setFiscalYearStartMonth = vi
      .spyOn(TestBed.inject(AppSettingsStore), 'setFiscalYearStartMonth')
      .mockResolvedValue();

    const select = element.querySelector('select') as HTMLSelectElement;
    select.value = '4';
    select.dispatchEvent(new Event('change'));

    expect(setFiscalYearStartMonth).toHaveBeenCalledExactlyOnceWith(4);
  });

  it('selecting January stores it explicitly rather than leaving the field unwritten', () => {
    const element = render();
    const setFiscalYearStartMonth = vi
      .spyOn(TestBed.inject(AppSettingsStore), 'setFiscalYearStartMonth')
      .mockResolvedValue();

    const select = element.querySelector('select') as HTMLSelectElement;
    select.value = '4';
    select.dispatchEvent(new Event('change'));
    select.value = '1';
    select.dispatchEvent(new Event('change'));

    expect(setFiscalYearStartMonth).toHaveBeenLastCalledWith(1);
  });

  it('reflects a hydrated non-January value in the select on load', async () => {
    // Spread the defaults rather than enumerating every field — `AppSettings` grows an additive
    // field most versions, and this test cares about exactly one of them.
    await appDb.appSettings.put({ ...DEFAULT_APP_SETTINGS, fiscalYearStartMonth: 4 });
    const fixture = TestBed.createComponent(SettingsReportingSectionComponent);
    fixture.detectChanges();
    await TestBed.inject(AppSettingsStore).hydrate();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    // The pull half of `linkControlToSetting`: hydration resolves after the control read its
    // initial value, so the effect has to write the store's value back into the control.
    expect((element.querySelector('select') as HTMLSelectElement).value).toBe('4');
  });

  it('the live span readout states both ends for a non-January start', async () => {
    const fixture = TestBed.createComponent(SettingsReportingSectionComponent);
    fixture.detectChanges();

    await TestBed.inject(AppSettingsStore).setFiscalYearStartMonth(4);
    fixture.detectChanges();

    const span = (fixture.nativeElement as HTMLElement)
      .querySelector('[aria-label="Fiscal year span"]')
      ?.textContent?.trim();
    expect(span).toMatch(/^April \d{4} – March \d{4}$/);
  });

  it('the live span readout updates when the selection changes', async () => {
    const fixture = TestBed.createComponent(SettingsReportingSectionComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const readSpan = () =>
      element.querySelector('[aria-label="Fiscal year span"]')?.textContent?.trim();

    const januarySpan = readSpan();
    expect(januarySpan).toBe(`January ${currentYear} – December ${currentYear}`);

    await TestBed.inject(AppSettingsStore).setFiscalYearStartMonth(7);
    fixture.detectChanges();

    expect(readSpan()).not.toBe(januarySpan);
    expect(readSpan()).toMatch(/^July \d{4} – June \d{4}$/);
  });
});
