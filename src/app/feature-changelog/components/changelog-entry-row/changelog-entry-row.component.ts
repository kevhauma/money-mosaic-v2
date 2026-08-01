import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { BadgeComponent, TypographyComponent } from '@/shared/ui';

/**
 * One row of the Changelog/Roadmap list: an area badge, the headline, and — for an entry that
 * landed a whole feature area at once — the per-feature bullets under it.
 */
@Component({
  selector: 'app-changelog-entry-row',
  imports: [BadgeComponent, TypographyComponent],
  templateUrl: './changelog-entry-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChangelogEntryRowComponent {
  readonly area = input.required<string>();
  readonly title = input.required<string>();
  readonly details = input<readonly string[]>([]);
}
