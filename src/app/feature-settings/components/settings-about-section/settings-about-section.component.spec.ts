import { TestBed } from '@angular/core/testing';
import { SettingsAboutSectionComponent } from './settings-about-section.component';

describe('SettingsAboutSectionComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SettingsAboutSectionComponent],
    }).compileComponents();
  });

  it('renders a GitHub repository link that opens safely in a new tab', () => {
    const fixture = TestBed.createComponent(SettingsAboutSectionComponent);
    fixture.detectChanges();

    const link = (fixture.nativeElement as HTMLElement).querySelector(
      'a[href="https://github.com/kevhauma/money-mosaic-v2"]',
    ) as HTMLAnchorElement | null;

    expect(link).toBeTruthy();
    expect(link?.target).toBe('_blank');
    expect(link?.rel).toBe('noopener noreferrer');
  });
});
