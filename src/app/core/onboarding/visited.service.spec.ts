import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { UiPreferences } from '@/core/data-access';
import { UiPreferencesService } from '@/core/ui-preferences';
import { fakeUiPreferences } from '@/core/ui-preferences/ui-preferences.testing';
import { VisitedService } from './visited.service';

describe('VisitedService', () => {
  const setup = async (stored: Partial<UiPreferences> = {}) => {
    const fake = fakeUiPreferences(stored);
    TestBed.configureTestingModule({ providers: fake.providers });
    await TestBed.inject(UiPreferencesService).restore();
    return { ...fake, service: TestBed.inject(VisitedService) };
  };

  it('reports not visited for an account that has never reached the dashboard', async () => {
    const { service } = await setup();

    expect(service.hasVisited()).toBe(false);
  });

  it("reads the account's stored flag", async () => {
    const { service } = await setup({ hasVisited: true });

    expect(service.hasVisited()).toBe(true);
  });

  it('markVisited() saves the flag to the account', async () => {
    const { service, repository } = await setup();

    service.markVisited();
    await vi.waitFor(() => expect(service.hasVisited()).toBe(true));

    expect(repository.setHasVisited).toHaveBeenCalledExactlyOnceWith(true);
  });

  /** The dashboard guard calls this on every visit; one write is enough to set a flag for good. */
  it('markVisited() does not write again once the flag is set', async () => {
    const { service, repository } = await setup({ hasVisited: true });

    service.markVisited();

    expect(repository.setHasVisited).not.toHaveBeenCalled();
  });
});
