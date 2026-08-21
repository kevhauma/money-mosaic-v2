import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BadgeComponent, FlexComponent, PaperComponent, TypographyComponent } from '@/shared/ui';
import type { LoanCardVm } from '../../loan-card-vm';

/**
 * One loan's card in the loans overview grid (TICKET-LOAN-06) — purely presentational, the
 * `AccountCardComponent` shape: every display fact is already resolved on the `LoanCardVm` the
 * overview builds. Every `loanType` renders through the same badge treatment (`variant="outline"`,
 * no per-type colour) — the badge names the type, it never signals it.
 */
@Component({
  selector: 'app-loan-card',
  imports: [RouterLink, BadgeComponent, FlexComponent, PaperComponent, TypographyComponent],
  templateUrl: './loan-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoanCardComponent {
  readonly vm = input.required<LoanCardVm>();
}
