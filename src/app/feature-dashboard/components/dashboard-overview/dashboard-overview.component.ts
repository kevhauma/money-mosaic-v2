import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonComponent } from '@/shared/ui';
import { DashboardStore } from '../../dashboard.store';

@Component({
  selector: 'app-dashboard-overview',
  imports: [ButtonComponent],
  templateUrl: './dashboard-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardOverviewComponent {
  private readonly dashboardStore = inject(DashboardStore);

  protected readonly message = this.dashboardStore.message;
}
