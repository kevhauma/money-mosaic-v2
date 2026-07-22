import { TestBed } from '@angular/core/testing';
import { ChangelogPageComponent } from './changelog-page.component';
import { CHANGELOG_ENTRIES } from '../../data/changelog-entries';
import { ROADMAP_ENTRIES } from '../../data/roadmap-entries';
import { groupChangelogEntries } from '../../group-changelog-entries';
import { formatRoadmapHeading, groupRoadmapEntries } from '../../group-roadmap-entries';

describe('ChangelogPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChangelogPageComponent],
    }).compileComponents();
  });

  it('renders every changelog entry title and area, grouped under its date heading newest-first, by default', () => {
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

  it('shows an empty-state message when there are no changelog entries', () => {
    if (CHANGELOG_ENTRIES.length > 0) {
      return;
    }
    const fixture = TestBed.createComponent(ChangelogPageComponent);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      "Nothing's been logged here yet.",
    );
  });

  it('does not render roadmap entries before the Roadmap tab is selected', () => {
    if (ROADMAP_ENTRIES.length === 0) {
      return;
    }
    const fixture = TestBed.createComponent(ChangelogPageComponent);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain(ROADMAP_ENTRIES[0].title);
  });

  it('renders every roadmap entry title and area, grouped under its version heading in build order, once the Roadmap tab is selected', () => {
    const fixture = TestBed.createComponent(ChangelogPageComponent);
    fixture.detectChanges();

    const tabButtons: HTMLButtonElement[] = [
      ...fixture.nativeElement.querySelectorAll('button.tab'),
    ];
    tabButtons.find((b) => b.textContent?.trim() === 'Roadmap')?.click();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    const expectedGroups = groupRoadmapEntries(ROADMAP_ENTRIES);

    for (const group of expectedGroups) {
      expect(text).toContain(formatRoadmapHeading(group.versionFolder));
      for (const entry of group.entries) {
        expect(text).toContain(entry.title);
        expect(text).toContain(entry.area);
      }
    }

    // Changelog content is hidden while the Roadmap tab is active.
    if (CHANGELOG_ENTRIES.length > 0) {
      expect(text).not.toContain(CHANGELOG_ENTRIES[0].title);
    }
  });

  it('shows an empty-state message when there are no roadmap entries', () => {
    if (ROADMAP_ENTRIES.length > 0) {
      return;
    }
    const fixture = TestBed.createComponent(ChangelogPageComponent);
    fixture.detectChanges();

    const tabButtons: HTMLButtonElement[] = [
      ...fixture.nativeElement.querySelectorAll('button.tab'),
    ];
    tabButtons.find((b) => b.textContent?.trim() === 'Roadmap')?.click();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      "Nothing's on the roadmap right now.",
    );
  });
});
