import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CHANGELOG_ENTRIES } from '../../data/changelog-entries';
import { ROADMAP_ENTRIES } from '../../data/roadmap-entries';
import { groupChangelogEntries } from '../../group-changelog-entries';
import { groupRoadmapEntries } from '../../group-roadmap-entries';
import {
  DividerComponent,
  PageHeaderComponent,
  TabsComponent,
  TypographyComponent,
  type TabDefinition,
} from '@/shared/ui';
import { ChangelogEntryRowComponent } from '../changelog-entry-row/changelog-entry-row.component';

type DisplayEntry = {
  readonly key: string;
  /** Empty when the group heading already names the area (Roadmap), so the badge isn't repeated. */
  readonly area: string;
  readonly title: string;
  readonly details: readonly string[];
};
type DisplayGroup = { readonly heading: string; readonly entries: readonly DisplayEntry[] };

const TABS: TabDefinition[] = [
  { label: 'Changelog', value: 'changelog' },
  { label: 'Roadmap', value: 'roadmap' },
];

/** Both tabs render the same heading+badge+title shape, so grouping is normalized once here rather than templated twice. Changelog groups by date and badges the area; Roadmap groups by area, so it leaves the badge empty. */
const CHANGELOG_GROUPS: readonly DisplayGroup[] = groupChangelogEntries(CHANGELOG_ENTRIES).map(
  (group) => ({
    heading: group.date,
    entries: group.entries.map((entry) => ({
      key: entry.title,
      area: entry.area,
      title: entry.title,
      details: entry.details ?? [],
    })),
  }),
);

const ROADMAP_GROUPS: readonly DisplayGroup[] = groupRoadmapEntries(ROADMAP_ENTRIES).map(
  (group) => ({
    heading: group.area,
    entries: group.entries.map((entry) => ({
      key: entry.ticketId,
      area: '',
      title: entry.title,
      details: [],
    })),
  }),
);

const EMPTY_MESSAGES = {
  changelog: "Nothing's been logged here yet.",
  roadmap: "Nothing's on the roadmap right now.",
} as const;

@Component({
  selector: 'app-changelog-page',
  imports: [
    ChangelogEntryRowComponent,
    DividerComponent,
    PageHeaderComponent,
    TabsComponent,
    TypographyComponent,
  ],
  templateUrl: './changelog-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangelogPageComponent {
  protected readonly tabs = TABS;
  protected readonly selectedTab = signal<'changelog' | 'roadmap'>('changelog');
  protected readonly activeGroups = computed(() =>
    this.selectedTab() === 'roadmap' ? ROADMAP_GROUPS : CHANGELOG_GROUPS,
  );
  protected readonly emptyMessage = computed(() => EMPTY_MESSAGES[this.selectedTab()]);

  protected onTabChange(value: string | undefined): void {
    this.selectedTab.set(value === 'roadmap' ? 'roadmap' : 'changelog');
  }
}
