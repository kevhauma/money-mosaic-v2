import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DataManagementOverviewComponent } from '@/feature-data-management';
import { PaperComponent } from '@/shared/ui';

/**
 * Settings' Data section (TICKET-SET-07) — the export/import/delete-all panel, embedded directly
 * rather than routed (TICKET-SET-06, ratified by TICKET-DAT-04). It owns nothing itself: the panel
 * brings its own heading, controls, and repository wiring; this component is the seam that decides
 * *where* in Settings it renders.
 */
@Component({
  selector: 'app-settings-data-section',
  imports: [DataManagementOverviewComponent, PaperComponent],
  templateUrl: './settings-data-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsDataSectionComponent {}
