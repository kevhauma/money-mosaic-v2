import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AccountsStore, AppSettingsStore } from '@/core/state';
import {
  FlexComponent,
  PaperComponent,
  PrivacyBlurComponent,
  TypographyComponent,
} from '@/shared/ui';
import { SignedAmountPipe } from '@/shared/utils';

/** Compact per-account balance strip (FR-STAT-1), each entry drilling down to its account detail. */
@Component({
  selector: 'app-account-balance-strip',
  imports: [
    SignedAmountPipe,
    FlexComponent,
    PaperComponent,
    PrivacyBlurComponent,
    TypographyComponent,
  ],
  templateUrl: './account-balance-strip.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountBalanceStripComponent {
  protected readonly accountsStore = inject(AccountsStore);

  /** Blurs each balance while privacy mode is on (TICKET-PRIV-01); account names stay, so the strip is still navigable. */
  protected readonly privacyMode = inject(AppSettingsStore).privacyModeEnabled;

  protected balanceFor(accountId: number): number {
    return this.accountsStore.balancesById().get(accountId) ?? 0;
  }
}
