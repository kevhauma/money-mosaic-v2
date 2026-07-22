import { TestBed } from '@angular/core/testing';
import { ChangelogPageComponent } from './changelog-page.component';
import { CHANGELOG_ENTRIES } from '../../data/changelog-entries';
import { groupChangelogEntries } from '../../group-changelog-entries';

describe('ChangelogPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangelogPageComponent],
    }).compileComponents();
  });

  it('renders every entry title and area, grouped under its date heading newest-first', () => {
    const fixture = TestBed.createComponent(ChangelogPageComponent);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const expectedGroups = groupChangelogEntries(CHANGELOG_ENTRIES);

    for (const group of expectedGroups) {
      expect(text).toContain(group.date);
      for (const entry of group.entries) {
        expect(text).toContain(entry.title);
        expect(text).toContain(entry.area);
      }
    }

    const dateOrderInText = expectedGroups.map((g) => text.indexOf(g.date));
    expect(dateOrderInText).toEqual([...dateOrderInText].sort((a, b) => a - b));
  });

  it('shows an empty-state message when there are no entries', () => {
    if (CHANGELOG_ENTRIES.length > 0) {
      return;
    }
    const fixture = TestBed.createComponent(ChangelogPageComponent);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      "Nothing's been logged here yet.",
    );
  });
});
