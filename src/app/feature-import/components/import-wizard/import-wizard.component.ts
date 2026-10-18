import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AccountsStore } from '@/core/state';
import {
  AlertComponent,
  ButtonComponent,
  PageHeaderComponent,
  PaperComponent,
  TypographyComponent,
} from '@/shared/ui';
import { ImportWizardSession } from '../../import-wizard-session';
import { BatchWaitCardComponent } from '../batch-wait-card/batch-wait-card.component';
import { ImportSelectStepComponent } from '../import-select-step/import-select-step.component';
import { ImportMapStepComponent } from '../import-map-step/import-map-step.component';
import { ImportWhatChangedComponent } from '../import-what-changed/import-what-changed.component';

/**
 * A thin view over `ImportWizardSession` (TICKET-IMP-11) — reads its computeds and calls its named
 * transitions; holds no commit-ordering logic or guard fields of its own. `ImportWizardSession` is
 * provided here (not `providedIn: 'root'`), so a fresh session exists for each mount of this route.
 */
@Component({
  selector: 'app-import-wizard',
  imports: [
    BatchWaitCardComponent,
    ImportSelectStepComponent,
    ImportMapStepComponent,
    ImportWhatChangedComponent,
    ButtonComponent,
    AlertComponent,
    PageHeaderComponent,
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
