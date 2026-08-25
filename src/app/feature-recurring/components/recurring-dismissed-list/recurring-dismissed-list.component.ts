import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { ButtonComponent, PrivacyBlurComponent, TypographyComponent } from '@/shared/ui';

/** One dismissed detection as this list renders it — display facts only, resolved by the panel. */
export type DismissedRow = {
  overrideId: number;
  label: string;
  typicalAmount: string;
  restoreAriaLabel: string;
};

/**
 * The detections the user said were not recurring, behind a disclosure with a way back
 * (TICKET-REC-11).
 *
 * Its own component rather than more markup on the payments panel: that template already carries
 * two row groups, a repeating-row `ng-template` and an evidence expansion, and this pushed it past
 * the complexity gate. The split is along the natural seam anyway — nothing here touches the table.
 */
@Component({
  selector: 'app-recurring-dismissed-list',
  imports: [ButtonComponent, PrivacyBlurComponent, TypographyComponent],
  templateUrl: './recurring-dismissed-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RecurringDismissedListComponent {
  readonly rows = input.required<DismissedRow[]>();
  readonly privacyMode = input(false);

  readonly restoreRequested = output<number>();

  /**
   * Closed on every visit, and component-local — the same reading-aid status the payments panel
   * gives its "Stopped (n)" group, and for the same reason: this half of the page only grows.
   */
  private readonly open = signal(false);

  protected readonly group = computed(() => {
    const count = this.rows().length;
    const open = this.open();
    return {
      open,
      expandIcon: open ? '▾' : '▸',
      label: `Dismissed (${count}) — not counted in the monthly total`,
      toggleAriaLabel: `${open ? 'Hide' : 'Show'} the ${count} dismissed ${count === 1 ? 'detection' : 'detections'}`,
    };
  });

  protected toggle(): void {
    this.open.update((open) => !open);
  }
}
