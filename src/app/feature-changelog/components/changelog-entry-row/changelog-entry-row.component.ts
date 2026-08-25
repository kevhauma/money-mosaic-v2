import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BadgeComponent, TypographyComponent } from '@/shared/ui';

/**
 * One row of the Changelog/Roadmap list: an area badge, the headline, and — for an entry that
 * landed a whole feature area at once — the per-feature bullets under it.
 *
 * `area` is optional because the two tabs group differently: Changelog groups by date, so the badge
 * is the only thing naming the area; Roadmap groups by area, so the group heading already says it
 * and a badge would repeat it on every row.
 */
@Component({
  selector: 'app-changelog-entry-row',
  imports: [BadgeComponent, TypographyComponent],
  templateUrl: './changelog-entry-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangelogEntryRowComponent {
  readonly area = input<string>('');
  readonly title = input.required<string>();
  readonly details = input<readonly string[]>([]);
}
