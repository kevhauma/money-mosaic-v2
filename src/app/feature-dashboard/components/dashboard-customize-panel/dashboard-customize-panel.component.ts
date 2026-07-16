import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CdkDragDrop, DragDropModule, moveItemInArray } from '@angular/cdk/drag-drop';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  tablerChevronDown,
  tablerChevronUp,
  tablerEye,
  tablerEyeOff,
  tablerGripVertical,
  tablerRestore,
} from '@ng-icons/tabler-icons';
import type { DashboardRowId } from '@/core/data-access';
import { ButtonComponent, TypographyComponent } from '@/shared/ui';
import { DashboardLayoutSettingsStore } from '../../dashboard-layout-settings.store';
import { DASHBOARD_ROW_LABELS, resolveDashboardRowOrder } from '../../dashboard-row-order';

/** Drag-to-reorder / hide-toggle list for every Dashboard row, entered via the "Customize dashboard" toggle (TICKET-STAT-14). Loaded lazily — see the `@defer` block in `dashboard-overview.component.html` — so `@angular/cdk` never ships in the base Dashboard bundle. */
@Component({
  selector: 'app-dashboard-customize-panel',
  imports: [DragDropModule, NgIcon, ButtonComponent, TypographyComponent],
  templateUrl: './dashboard-customize-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({
      tablerChevronUp,
      tablerChevronDown,
      tablerEye,
      tablerEyeOff,
      tablerGripVertical,
      tablerRestore,
    }),
  ],
})
export class DashboardCustomizePanelComponent {
  private readonly dashboardLayoutSettingsStore = inject(DashboardLayoutSettingsStore);

  protected readonly rowLabels = DASHBOARD_ROW_LABELS;

  /** Every row (hidden included), in resolved order, so the user can unhide one. */
  protected readonly rows = computed(() =>
    resolveDashboardRowOrder(this.dashboardLayoutSettingsStore.rowOrder()),
  );

  protected isHidden(id: DashboardRowId): boolean {
    return this.dashboardLayoutSettingsStore.hiddenRowIds().includes(id);
  }

  protected moveRow(id: DashboardRowId, direction: 'up' | 'down'): void {
    void this.dashboardLayoutSettingsStore.reorderRow(id, direction);
  }

  protected toggleHidden(id: DashboardRowId): void {
    void this.dashboardLayoutSettingsStore.toggleRowHidden(id);
  }

  protected reset(): void {
    void this.dashboardLayoutSettingsStore.resetToDefault();
  }

  protected onDrop(event: CdkDragDrop<DashboardRowId[]>): void {
    const reordered = [...this.rows()];
    moveItemInArray(reordered, event.previousIndex, event.currentIndex);
    void this.dashboardLayoutSettingsStore.setRowOrder(reordered);
  }
}
