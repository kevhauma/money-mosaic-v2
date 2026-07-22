import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { CHANGELOG_ENTRIES } from '../../data/changelog-entries';
import { ROADMAP_ENTRIES } from '../../data/roadmap-entries';
import { groupChangelogEntries } from '../../group-changelog-entries';
import { formatRoadmapHeading, groupRoadmapEntries } from '../../group-roadmap-entries';
import {
  BadgeComponent,
  DividerComponent,
  PageHeaderComponent,
  TabsComponent,
  TypographyComponent,
  type TabDefinition,
} from '@/shared/ui';

type DisplayEntry = { readonly key: string; readonly area: string; readonly title: string };
type DisplayGroup = { readonly heading: string; readonly entries: readonly DisplayEntry[] };

const TABS: TabDefinition[] = [
  { label: 'Changelog', value: 'changelog' },
  { label: 'Roadmap', value: 'roadmap' },
];

/** Both tabs render the same heading+badge+title shape, so grouping is normalized once here rather than templated twice. */
const CHANGELOG_GROUPS: readonly DisplayGroup[] = groupChangelogEntries(CHANGELOG_ENTRIES).map(
  (group) => ({
    heading: group.date,
    entries: group.entries.map((entry) => ({
      key: entry.title,
      area: entry.area,
      title: entry.title,
    })),
  }),
);

const ROADMAP_GROUPS: readonly DisplayGroup[] = groupRoadmapEntries(ROADMAP_ENTRIES).map(
  (group) => ({
    heading: formatRoadmapHeading(group.versionFolder),
    entries: group.entries.map((entry) => ({
      key: entry.ticketId,
      area: entry.area,
      title: entry.title,
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
    BadgeComponent,
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
