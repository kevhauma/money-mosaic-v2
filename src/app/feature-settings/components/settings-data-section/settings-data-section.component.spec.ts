import { TestBed } from '@angular/core/testing';
import { provideFakeApi } from '@/core/data-access/fake-api.testing';
import { SettingsDataSectionComponent } from './settings-data-section.component';

describe('SettingsDataSectionComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsDataSectionComponent],
      providers: [...provideFakeApi()],
    }).compileComponents();
  });

  it('embeds the Data Management panel directly, not behind a link (TICKET-SET-06)', () => {
    const fixture = TestBed.createComponent(SettingsDataSectionComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('app-data-management-overview')).toBeTruthy();
    expect(element.querySelector('a[href="/settings/data"]')).toBeNull();
  });
});
