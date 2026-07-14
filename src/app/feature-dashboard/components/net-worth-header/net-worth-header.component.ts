import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AccountsStore } from '@/core/state';
import { SignedAmountPipe } from '@/shared/utils';

/** Point-in-time combined net worth (FR-STAT-1) — deliberately not range-scoped, unlike the rest of the dashboard. */
@Component({
  selector: 'app-net-worth-header',
  imports: [SignedAmountPipe],
  templateUrl: './net-worth-header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NetWorthHeaderComponent {
  protected readonly accountsStore = inject(AccountsStore);
}
