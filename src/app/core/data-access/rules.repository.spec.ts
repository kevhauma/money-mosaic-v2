import { TestBed } from '@angular/core/testing';
import { callApi, withApiTesting } from './api-client.testing';
import type { Rule } from './entities';
import { RulesRepository } from './rules.repository';

const rule = { id: 2, name: 'Supermarket', priority: 1, enabled: true } as unknown as Rule;

describe('RulesRepository', () => {
  withApiTesting();

  const repository = (): RulesRepository => TestBed.inject(RulesRepository);

  it('getAll reads the list endpoint', async () => {
    expect(
      await callApi(() => repository().getAll(), { method: 'GET', url: '/api/rules' }, [rule]),
    ).toEqual([rule]);
  });

  it('add posts the rule and resolves to the id the server assigned', async () => {
    expect(
      await callApi(
        () => repository().add(rule),
        { method: 'POST', url: '/api/rules', body: rule },
        { ...rule, id: 11 },
      ),
    ).toBe(11);
  });

  it('update patches the one row and resolves to the number of rows changed', async () => {
    expect(
      await callApi(
        () => repository().update(2, { enabled: false }),
        { method: 'PATCH', url: '/api/rules/2', body: { enabled: false } },
        rule,
      ),
    ).toBe(1);
  });

  it('remove deletes the one row', async () => {
    await expect(
      callApi(() => repository().remove(2), { method: 'DELETE', url: '/api/rules/2' }),
    ).resolves.toBeUndefined();
  });
});
