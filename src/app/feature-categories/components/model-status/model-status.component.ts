import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import {
  AlertComponent,
  BadgeComponent,
  ButtonComponent,
  type AlertStatus,
  type BadgeColor,
} from '@/shared/ui';
import { CategoryModelStore, type CategoryModelStatus } from '../../category-model.store';

/** Short chip label per status (FR-ML-10) — distinct copy so `'error'` never reads like `'not-enough-data'`. */
const STATUS_LABEL: Record<CategoryModelStatus, string> = {
  untrained: 'Not trained',
  'not-enough-data': 'Needs more data',
  training: 'Training',
  ready: 'Ready',
  stale: 'Stale',
  error: 'Error',
};

const STATUS_COPY: Record<CategoryModelStatus, string> = {
  untrained: 'Not trained yet.',
  'not-enough-data':
    'Categorise a few more transactions across at least two categories before training.',
  training: 'Training…',
  ready: 'Trained',
  stale: 'Categories changed since training — retrain to refresh suggestions.',
  error: 'Something went wrong while training. Try again.',
};

const ALERT_STATUS: Partial<Record<CategoryModelStatus, AlertStatus>> = {
  'not-enough-data': 'info',
  ready: 'success',
  stale: 'warning',
  error: 'error',
};

const BADGE_COLOR: Partial<Record<CategoryModelStatus, BadgeColor>> = {
  ready: 'success',
  stale: 'warning',
  error: 'error',
};

/** Model status chip + Train/Retrain control (FR-ML-10), mounted on the categories page. */
@Component({
  selector: 'app-model-status',
  imports: [DatePipe, AlertComponent, BadgeComponent, ButtonComponent],
  templateUrl: './model-status.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelStatusComponent {
  protected readonly categoryModelStore = inject(CategoryModelStore);

  protected readonly alertStatus = computed<AlertStatus | undefined>(
    () => ALERT_STATUS[this.categoryModelStore.status()],
  );

  protected readonly badgeColor = computed<BadgeColor | undefined>(
    () => BADGE_COLOR[this.categoryModelStore.status()],
  );

  protected readonly statusLabel = computed(() => STATUS_LABEL[this.categoryModelStore.status()]);

  protected readonly statusCopy = computed(() => STATUS_COPY[this.categoryModelStore.status()]);

  protected readonly accuracyPercent = computed(() => {
    const metrics = this.categoryModelStore.metrics();
    return metrics ? Math.round(metrics.accuracy * 100) : 0;
  });

  /** Only `'stale'` relabels the button to "Retrain" — every other status, including `'ready'`, keeps "Train". */
  protected readonly buttonLabel = computed(() =>
    this.categoryModelStore.status() === 'stale' ? 'Retrain' : 'Train',
  );

  protected readonly trainDisabled = computed(
    () => this.categoryModelStore.status() === 'training',
  );

  protected train(): void {
    void this.categoryModelStore.train();
  }
}
