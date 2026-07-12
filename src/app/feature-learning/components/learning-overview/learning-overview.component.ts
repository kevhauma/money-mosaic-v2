import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent } from '@/shared/ui';
import { ModelStatusComponent } from '../model-status/model-status.component';

@Component({
  selector: 'app-learning-overview',
  imports: [PageHeaderComponent, ModelStatusComponent],
  templateUrl: './learning-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearningOverviewComponent {}
