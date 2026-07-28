import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AccountsStore } from '@/core/state';
import {
  AlertComponent,
  ButtonComponent,
  FlexComponent,
  PaperComponent,
  TypographyComponent,
} from '@/shared/ui';
import { ImportWizardSession } from '../../import-wizard-session';
import { ImportSelectStepComponent } from '../import-select-step/import-select-step.component';
import { ImportMapStepComponent } from '../import-map-step/import-map-step.component';
import { ImportSummaryStepComponent } from '../import-summary-step/import-summary-step.component';

/**
 * A thin view over `ImportWizardSession` (TICKET-IMP-11) — reads its computeds and calls its named
 * transitions; holds no commit-ordering logic or guard fields of its own. `ImportWizardSession` is
 * provided here (not `providedIn: 'root'`), so a fresh session exists for each mount of this route.
 */
@Component({
  selector: 'app-import-wizard',
  imports: [
    ImportSelectStepComponent,
    ImportMapStepComponent,
    ImportSummaryStepComponent,
    ButtonComponent,
    AlertComponent,
    FlexComponent,
    PaperComponent,
    TypographyComponent,
  ],
  providers: [ImportWizardSession],
  templateUrl: './import-wizard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportWizardComponent {
  protected readonly session = inject(ImportWizardSession);
  protected readonly accountsStore = inject(AccountsStore);
}
