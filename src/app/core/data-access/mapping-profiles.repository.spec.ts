import { TestBed } from '@angular/core/testing';
import { callApi, withApiTesting } from './api-client.testing';
import type { MappingProfile } from './entities';
import { MappingProfilesRepository } from './mapping-profiles.repository';

const profile = { id: 5, name: 'KBC', delimiter: ';' } as MappingProfile;

describe('MappingProfilesRepository', () => {
  withApiTesting();

  const repository = (): MappingProfilesRepository => TestBed.inject(MappingProfilesRepository);

  it('getAll reads the list endpoint', async () => {
    expect(
      await callApi(() => repository().getAll(), { method: 'GET', url: '/api/mappingProfiles' }, [
        profile,
      ]),
    ).toEqual([profile]);
  });

  it('add posts the profile and resolves to the id the server assigned', async () => {
    expect(
      await callApi(
        () => repository().add(profile),
        { method: 'POST', url: '/api/mappingProfiles', body: profile },
        { ...profile, id: 13 },
      ),
    ).toBe(13);
  });

  it('update patches the one row and resolves to the number of rows changed', async () => {
    expect(
      await callApi(
        () => repository().update(5, { name: 'KBC 2026' }),
        { method: 'PATCH', url: '/api/mappingProfiles/5', body: { name: 'KBC 2026' } },
        profile,
      ),
    ).toBe(1);
  });
});
