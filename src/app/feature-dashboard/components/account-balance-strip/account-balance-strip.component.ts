import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AccountsStore } from '@/core/state';
import { FlexComponent, PaperComponent, TypographyComponent } from '@/shared/ui';
import { SignedAmountPipe } from '@/shared/utils';

/** Compact per-account balance strip (FR-STAT-1), each entry drilling down to its account detail. */
@Component({
  selector: 'app-account-balance-strip',
  imports: [SignedAmountPipe, FlexComponent, PaperComponent, TypographyComponent],
  templateUrl: './account-balance-strip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountBalanceStripComponent {
  protected readonly accountsStore = inject(AccountsStore);

  protected balanceFor(accountId: number): number {
    return this.accountsStore.balancesById().get(accountId) ?? 0;
  }
}
