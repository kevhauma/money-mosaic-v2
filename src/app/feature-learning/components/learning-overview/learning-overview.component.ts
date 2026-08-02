import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent, TypographyComponent } from '@/shared/ui';
import { ModelStatusBadgeComponent } from '../model-status-badge/model-status-badge.component';
import { ModelStatusComponent } from '../model-status/model-status.component';
import { RuleProposalsComponent } from '../rule-proposals/rule-proposals.component';
import { SuggestionsTableComponent } from '../suggestions-table/suggestions-table.component';

@Component({
  selector: 'app-learning-overview',
  imports: [
    PageHeaderComponent,
    ModelStatusBadgeComponent,
    ModelStatusComponent,
    SuggestionsTableComponent,
    RuleProposalsComponent,
    TypographyComponent,
  ],
  templateUrl: './learning-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearningOverviewComponent {}
