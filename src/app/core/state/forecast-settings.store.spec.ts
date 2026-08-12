import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DEFAULT_FORECAST_SETTINGS, ForecastSettingsRepository } from '@/core/data-access';
import { ForecastSettingsStore } from './forecast-settings.store';

describe('ForecastSettingsStore', () => {
  const forecastSettingsRepository = {
    get: vi.fn().mockResolvedValue(DEFAULT_FORECAST_SETTINGS),
    setLookbackMonths: vi.fn().mockResolvedValue(1),
    setBasis: vi.fn().mockResolvedValue(1),
    setSafetyNetAmount: vi.fn().mockResolvedValue(1),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    forecastSettingsRepository.get.mockResolvedValue(DEFAULT_FORECAST_SETTINGS);
    TestBed.configureTestingModule({
      providers: [{ provide: ForecastSettingsRepository, useValue: forecastSettingsRepository }],
    });
  });

  it('reads the defaults when the row has never been written', async () => {
    const store = TestBed.inject(ForecastSettingsStore);
    await store.hydrate();

    expect(store.lookbackMonths()).toBe(6);
    expect(store.basis()).toBe('net-cash-flow');
    expect(store.safetyNetAmount()).toBe(0);
  });

  it('hydrates from the stored row', async () => {
    forecastSettingsRepository.get.mockResolvedValue({
      id: 1,
      lookbackMonths: 12,
      basis: 'savings-transfers',
      safetyNetAmount: 2500,
      mode: 'when-affordable',
    });
    const store = TestBed.inject(ForecastSettingsStore);
    await store.hydrate();

    expect(store.lookbackMonths()).toBe(12);
    expect(store.basis()).toBe('savings-transfers');
    expect(store.safetyNetAmount()).toBe(2500);
  });

  it('persists each setter through the repository and patches only its own field', async () => {
    const store = TestBed.inject(ForecastSettingsStore);
    await store.hydrate();

    await store.setLookbackMonths(3);
    await store.setBasis('savings-transfers');
    await store.setSafetyNetAmount(1000);

    expect(forecastSettingsRepository.setLookbackMonths).toHaveBeenCalledWith(3);
    expect(forecastSettingsRepository.setBasis).toHaveBeenCalledWith('savings-transfers');
    expect(forecastSettingsRepository.setSafetyNetAmount).toHaveBeenCalledWith(1000);
    expect(store.lookbackMonths()).toBe(3);
    expect(store.basis()).toBe('savings-transfers');
    expect(store.safetyNetAmount()).toBe(1000);
  });

  it('hydrates once however many times hydrate() is called', async () => {
    const store = TestBed.inject(ForecastSettingsStore);

    await Promise.all([store.hydrate(), store.hydrate(), store.hydrate()]);

    // The onInit hook already fired one hydration on injection; the three explicit calls reuse it.
    expect(forecastSettingsRepository.get).toHaveBeenCalledTimes(1);
  });
});
