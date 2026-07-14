import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CategoryModelStore, type CategoryModelStatus } from '@/feature-categories';
import { CategoriesStore, TransactionsStore } from '@/core/state';
import { isWithinTrainingWindow, MIN_CATEGORIES, MIN_TRAINING_LABELS } from '@/core/ml';
import {
  AlertComponent,
  BadgeComponent,
  ButtonComponent,
  type AlertStatus,
  type BadgeColor,
} from '@/shared/ui';

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

/** Training-window presets (FR-ML-17) — `null` = "All time", the pre-ML-17 unrestricted default. */
const TRAINING_WINDOW_OPTIONS: { years: number | null; label: string }[] = [
  { years: 1, label: '1y' },
  { years: 2, label: '2y' },
  { years: 3, label: '3y' },
  { years: 5, label: '5y' },
  { years: null, label: 'All time' },
];

/** Model status chip + diagnostic detail + Train/Retrain control (FR-ML-10, expanded by FR-ML-12), mounted on the Learning page. */
@Component({
  selector: 'app-model-status',
  imports: [DatePipe, DecimalPipe, AlertComponent, BadgeComponent, ButtonComponent],
  templateUrl: './model-status.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelStatusComponent {
  protected readonly categoryModelStore = inject(CategoryModelStore);
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly transactionsStore = inject(TransactionsStore);

  protected readonly minTrainingLabels = MIN_TRAINING_LABELS;
  protected readonly minCategories = MIN_CATEGORIES;

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

  /** Trained-sample count from the last completed training run, when one exists (`'ready'`/`'stale'`). */
  protected readonly trainedSampleCount = computed(
    () => this.categoryModelStore.metrics()?.trainedSampleCount ?? null,
  );

  /** Number of categories the current model was trained to distinguish between. */
  protected readonly modelCategoryCount = computed(
    () => this.categoryModelStore.categoryIdByIndex().length,
  );

  /** Active category count right now — independent of whether a model has ever been trained. */
  protected readonly activeCategoryCount = computed(
    () => this.categoriesStore.activeCategories().length,
  );

  /**
   * Categorised transactions in an active category right now, within the current training window
   * (ML-17) — mirrors `CategoryModelStore.train()`'s own sample-counting logic so the
   * `'not-enough-data'` copy shows the same numbers training would use.
   */
  protected readonly labelledTransactionCount = computed(() => {
    const activeCategoryIds = new Set(
      this.categoriesStore.activeCategories().map((category) => category.id!),
    );
    const trainingWindowYears = this.categoryModelStore.trainingWindowYears();
    return this.transactionsStore
      .transactions()
      .filter(
        (transaction) =>
          transaction.categoryId != null &&
          activeCategoryIds.has(transaction.categoryId) &&
          isWithinTrainingWindow(transaction.bookingDate, trainingWindowYears),
      ).length;
  });

  protected readonly trainingWindowOptions = TRAINING_WINDOW_OPTIONS;

  protected setTrainingWindow(years: number | null): void {
    void this.categoryModelStore.setTrainingWindowYears(years);
  }

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
