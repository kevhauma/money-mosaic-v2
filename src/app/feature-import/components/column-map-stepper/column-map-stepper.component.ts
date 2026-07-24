import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type {
  MapperStepId,
  MapperStepTrackerItem,
} from '../import-map-step/import-map-step.component';

/**
 * Horizontal step tracker for the guided column-mapping flow (TICKET-IMP-09) — reuses the exact
 * daisyUI `steps`/`step`/`step-primary` markup already used by the outer wizard's own
 * Select/Map/Summary stepper. Purely presentational; every step is clickable (jumping ahead is
 * allowed, not just backward), the parent only decides each step's done/current/upcoming state.
 */
@Component({
  selector: 'app-column-map-stepper',
  imports: [],
  templateUrl: './column-map-stepper.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ColumnMapStepperComponent {
  readonly items = input.required<MapperStepTrackerItem[]>();

  readonly stepClicked = output<MapperStepId>();
}
