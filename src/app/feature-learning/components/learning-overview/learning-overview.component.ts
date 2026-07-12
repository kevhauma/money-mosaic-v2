import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent } from '@/shared/ui';
import { ModelStatusComponent } from '../model-status/model-status.component';
import { RuleProposalsComponent } from '../rule-proposals/rule-proposals.component';
import { SuggestionsTableComponent } from '../suggestions-table/suggestions-table.component';

@Component({
  selector: 'app-learning-overview',
  imports: [
    PageHeaderComponent,
    ModelStatusComponent,
    SuggestionsTableComponent,
    RuleProposalsComponent,
  ],
  templateUrl: './learning-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearningOverviewComponent {}
