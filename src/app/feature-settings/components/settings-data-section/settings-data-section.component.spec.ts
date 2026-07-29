import { TestBed } from '@angular/core/testing';
import { appDb } from '@/core/data-access';
import { SettingsDataSectionComponent } from './settings-data-section.component';

describe('SettingsDataSectionComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsDataSectionComponent],
    }).compileComponents();
  });

  afterEach(async () => {
    await appDb.appSettings.clear();
  });

  it('embeds the Data Management panel directly, not behind a link (TICKET-SET-06)', () => {
    const fixture = TestBed.createComponent(SettingsDataSectionComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-data-management-overview')).toBeTruthy();
    expect(element.querySelector('a[href="/settings/data"]')).toBeNull();
  });
});
