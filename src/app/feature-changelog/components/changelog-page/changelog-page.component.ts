import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CHANGELOG_ENTRIES } from '../../data/changelog-entries';
import { groupChangelogEntries, type ChangelogGroup } from '../../group-changelog-entries';
import {
  BadgeComponent,
  DividerComponent,
  PageHeaderComponent,
  TypographyComponent,
} from '@/shared/ui';

@Component({
  selector: 'app-changelog-page',
  imports: [BadgeComponent, DividerComponent, PageHeaderComponent, TypographyComponent],
  templateUrl: './changelog-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangelogPageComponent {
  protected readonly groups: readonly ChangelogGroup[] = groupChangelogEntries(CHANGELOG_ENTRIES);
}
