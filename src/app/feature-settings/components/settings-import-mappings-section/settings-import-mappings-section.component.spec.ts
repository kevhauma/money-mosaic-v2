import { TestBed } from '@angular/core/testing';
import { DEFAULT_MAPPING_PROFILE_TEMPLATES, type MappingProfile } from '@/core/data-access';
import { provideFakeApi, seedApi } from '@/core/data-access/fake-api.testing';
import { AccountsStore } from '@/core/state';
import { MappingProfilesStore } from '@/feature-import';
import { SettingsImportMappingsSectionComponent } from './settings-import-mappings-section.component';

const [KBC] = DEFAULT_MAPPING_PROFILE_TEMPLATES;
const remembered: MappingProfile = {
  ...KBC,
  id: 2,
  name: 'kbc-export',
  headerSignature: undefined,
  defaultAccountId: 1,
};

describe('SettingsImportMappingsSectionComponent', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SettingsImportMappingsSectionComponent],
      providers: [...provideFakeApi()],
    });
  });

  const render = async (profiles: MappingProfile[]): Promise<HTMLElement> => {
    seedApi('/api/mappingProfiles', profiles);
    seedApi('/api/accounts', [{ id: 1, name: 'Everyday', iban: 'BE00', archived: false }]);
    await TestBed.inject(MappingProfilesStore).hydrate();
    await TestBed.inject(AccountsStore).hydrate();
    const fixture = TestBed.createComponent(SettingsImportMappingsSectionComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('shows an empty state when there are no mappings', async () => {
    const element = await render([]);

    expect(element.querySelector('mm-empty-state')?.textContent).toContain(
      'No import mappings yet',
    );
    expect(element.querySelector('tbody')).toBeNull();
  });

  it('lists every mapping with its preset, default account and auto-detect status', async () => {
    const element = await render([
      { ...KBC, id: 1 },
      remembered,
      { ...remembered, id: 3, name: 'old-export', bankPreset: undefined, defaultAccountId: 99 },
    ]);

    const rows = Array.from(element.querySelectorAll('tbody tr')).map((row) =>
      Array.from(row.querySelectorAll('td'))
        .slice(0, 4)
        .map((cell) => cell.textContent?.trim()),
    );
    expect(rows).toEqual([
      ['KBC', 'kbc', 'Any', 'Yes'],
      ['kbc-export', 'kbc', 'Everyday', 'No'],
      // Its account was deleted, but `findRemembered` still ties it to that id: not "Any".
      ['old-export', '—', 'Unknown account', 'No'],
    ]);
  });
});
