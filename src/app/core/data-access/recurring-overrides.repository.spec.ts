import { TestBed } from '@angular/core/testing';
import { callApi, withApiTesting } from './api-client.testing';
import type { RecurringOverride } from './entities';
import { RecurringOverridesRepository } from './recurring-overrides.repository';

const override = { id: 8, seriesKey: 'netflix', kind: 'dismissed' } as unknown as RecurringOverride;

describe('RecurringOverridesRepository', () => {
  withApiTesting();

  const repository = (): RecurringOverridesRepository =>
    TestBed.inject(RecurringOverridesRepository);

  it('getAll reads the list endpoint', async () => {
    expect(
      await callApi(
        () => repository().getAll(),
        { method: 'GET', url: '/api/recurringOverrides' },
        [override],
      ),
    ).toEqual([override]);
  });

  it('add posts the override and resolves to the id the server assigned', async () => {
    expect(
      await callApi(
        () => repository().add(override),
        { method: 'POST', url: '/api/recurringOverrides', body: override },
        { ...override, id: 15 },
      ),
    ).toBe(15);
  });

  it('remove deletes the one row', async () => {
    await expect(
      callApi(() => repository().remove(8), { method: 'DELETE', url: '/api/recurringOverrides/8' }),
    ).resolves.toBeUndefined();
  });
});
