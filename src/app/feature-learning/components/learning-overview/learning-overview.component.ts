import { ChangeDetectionStrategy, Component } from '@angular/core';
import { PageHeaderComponent } from '@/shared/ui';

@Component({
  selector: 'app-learning-overview',
  imports: [PageHeaderComponent],
  templateUrl: './learning-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearningOverviewComponent {}
