import { vi } from 'vitest';
import { StorageStatusService } from './storage-status.service';

describe('StorageStatusService: checkAndRequest', () => {
  const originalStorage = navigator.storage;

  afterEach(() => {
    Object.defineProperty(navigator, 'storage', { value: originalStorage, configurable: true });
  });

  it('no-ops to "unsupported" without throwing when navigator.storage is absent', async () => {
    // @ts-expect-error simulating a browser (e.g. Safari) without the Storage API at all
    delete navigator.storage;
    const service = new StorageStatusService();

    await expect(service.checkAndRequest()).resolves.toBeUndefined();

    expect(service.status()).toBe('unsupported');
  });

  it('reflects persisted() === true without calling persist() again', async () => {
    const persist = vi.fn();
    Object.defineProperty(navigator, 'storage', {
      value: { persisted: vi.fn().mockResolvedValue(true), persist },
      configurable: true,
    });
    const service = new StorageStatusService();

    await service.checkAndRequest();

    expect(service.status()).toBe('granted');
    expect(persist).not.toHaveBeenCalled();
  });

  it('reflects a granted persist() call when not yet persisted', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: {
        persisted: vi.fn().mockResolvedValue(false),
        persist: vi.fn().mockResolvedValue(true),
      },
      configurable: true,
    });
    const service = new StorageStatusService();

    await service.checkAndRequest();

    expect(service.status()).toBe('granted');
  });

  it('reflects a denied persist() call when not yet persisted', async () => {
    Object.defineProperty(navigator, 'storage', {
      value: {
        persisted: vi.fn().mockResolvedValue(false),
        persist: vi.fn().mockResolvedValue(false),
      },
      configurable: true,
    });
    const service = new StorageStatusService();

    await service.checkAndRequest();

    expect(service.status()).toBe('denied');
  });
});
