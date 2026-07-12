import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import {
  CategoriesStore,
  CategoryModelStore,
  type CategoryModelStatus,
  type TrainingProgress,
} from '@/feature-categories';
import { TransactionsStore } from '@/feature-transactions';
import type { Category, Transaction } from '@/core/data-access';
import { ModelStatusComponent } from './model-status.component';

/** Protected surface we reach into for status-mapping assertions. */
type Internals = {
  alertStatus: () => string | undefined;
  badgeColor: () => string | undefined;
  statusLabel: () => string;
  statusCopy: () => string;
  accuracyPercent: () => number;
  trainedSampleCount: () => number | null;
  modelCategoryCount: () => number;
  activeCategoryCount: () => number;
  labelledTransactionCount: () => number;
  buttonLabel: () => string;
  trainDisabled: () => boolean;
  train: () => void;
};

const activeCategory = (id: number): Category => ({
  id,
  name: `Category ${id}`,
  kind: 'expense',
  color: '#000000',
  icon: 'tablerTag',
  sortOrder: id,
  archived: false,
  isSystem: false,
});

const labelledTransaction = (id: number, categoryId: number | undefined): Transaction =>
  ({ id, categoryId }) as Transaction;

describe('ModelStatusComponent', () => {
  let fixture: ComponentFixture<ModelStatusComponent>;

  const categoryModelStore = {
    status: signal<CategoryModelStatus>('untrained'),
    metrics: signal<{ accuracy: number; trainedSampleCount: number } | null>(null),
    lastTrainedAt: signal<string | null>(null),
    categoryIdByIndex: signal<number[]>([]),
    trainingProgress: signal<TrainingProgress | null>(null),
    train: vi.fn().mockResolvedValue(undefined),
  };

  const categoriesStore = {
    activeCategories: signal<Category[]>([]),
  };

  const transactionsStore = {
    transactions: signal<Transaction[]>([]),
  };

  const setup = async (): Promise<void> => {
    vi.clearAllMocks();
    categoryModelStore.status.set('untrained');
    categoryModelStore.metrics.set(null);
    categoryModelStore.lastTrainedAt.set(null);
    categoryModelStore.categoryIdByIndex.set([]);
    categoryModelStore.trainingProgress.set(null);
    categoriesStore.activeCategories.set([]);
    transactionsStore.transactions.set([]);
    await TestBed.configureTestingModule({
      imports: [ModelStatusComponent],
      providers: [
        { provide: CategoryModelStore, useValue: categoryModelStore },
        { provide: CategoriesStore, useValue: categoriesStore },
        { provide: TransactionsStore, useValue: transactionsStore },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ModelStatusComponent);
    await fixture.whenStable();
  };

  const internals = (): Internals => fixture.componentInstance as unknown as Internals;

  it('renders distinct, accurate copy and tone for "untrained"', async () => {
    await setup();
    categoryModelStore.status.set('untrained');
    const component = internals();

    expect(component.alertStatus()).toBeUndefined();
    expect(component.statusLabel()).toBe('Not trained');
    expect(component.statusCopy()).toBe('Not trained yet.');
    expect(component.buttonLabel()).toBe('Train');
    expect(component.trainDisabled()).toBe(false);
  });

  it('renders distinct, accurate copy and tone for "not-enough-data", with real labelled/category counts', async () => {
    await setup();
    categoryModelStore.status.set('not-enough-data');
    categoriesStore.activeCategories.set([activeCategory(1)]);
    transactionsStore.transactions.set([
      labelledTransaction(1, 1),
      labelledTransaction(2, 1),
      labelledTransaction(3, undefined),
    ]);
    const component = internals();

    expect(component.alertStatus()).toBe('info');
    expect(component.statusLabel()).toBe('Needs more data');
    expect(component.statusCopy()).toBe(
      'Categorise a few more transactions across at least two categories before training.',
    );
    expect(component.labelledTransactionCount()).toBe(2);
    expect(component.activeCategoryCount()).toBe(1);
    expect(component.buttonLabel()).toBe('Train');
    expect(component.trainDisabled()).toBe(false);
  });

  it('excludes transactions categorised outside the active category set from the labelled count', async () => {
    await setup();
    categoriesStore.activeCategories.set([activeCategory(1)]);
    transactionsStore.transactions.set([labelledTransaction(1, 1), labelledTransaction(2, 99)]);
    const component = internals();

    expect(component.labelledTransactionCount()).toBe(1);
  });

  it('renders distinct, accurate copy and tone for "training", and disables the button', async () => {
    await setup();
    categoryModelStore.status.set('training');
    const component = internals();

    expect(component.statusCopy()).toBe('Training…');
    expect(component.trainDisabled()).toBe(true);
  });

  it('falls back to the plain "Training…" copy while trainingProgress is still null (ML-15)', async () => {
    await setup();
    categoryModelStore.status.set('training');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.textContent as string).toContain('Training…');
  });

  it('shows live epoch/loss/accuracy once trainingProgress is populated (ML-15)', async () => {
    await setup();
    categoryModelStore.status.set('training');
    categoryModelStore.trainingProgress.set({
      epoch: 12,
      totalEpochs: 120,
      loss: 0.4567,
      accuracy: 0.812,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('epoch 12/120');
    expect(text).toContain('loss 0.457');
    expect(text).toContain('81% accuracy');
  });

  it('omits the accuracy segment while trainingProgress.accuracy is still null (ML-15)', async () => {
    await setup();
    categoryModelStore.status.set('training');
    categoryModelStore.trainingProgress.set({
      epoch: 1,
      totalEpochs: 120,
      loss: 1.2,
      accuracy: null,
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('epoch 1/120');
    expect(text).not.toContain('accuracy');
  });

  it('renders "ready" with success tone, formatted accuracy, and trained-sample/category counts', async () => {
    await setup();
    categoryModelStore.status.set('ready');
    categoryModelStore.metrics.set({ accuracy: 0.923, trainedSampleCount: 40 });
    categoryModelStore.lastTrainedAt.set('2026-07-01T12:00:00.000Z');
    categoryModelStore.categoryIdByIndex.set([1, 2, 3]);
    const component = internals();

    expect(component.alertStatus()).toBe('success');
    expect(component.badgeColor()).toBe('success');
    expect(component.statusLabel()).toBe('Ready');
    expect(component.accuracyPercent()).toBe(92);
    expect(component.trainedSampleCount()).toBe(40);
    expect(component.modelCategoryCount()).toBe(3);
    expect(component.buttonLabel()).toBe('Train');
    expect(component.trainDisabled()).toBe(false);
  });

  it('renders "stale" with warning tone, relabels the button to "Retrain", and keeps last-known counts', async () => {
    await setup();
    categoryModelStore.status.set('stale');
    categoryModelStore.metrics.set({ accuracy: 0.8, trainedSampleCount: 30 });
    categoryModelStore.categoryIdByIndex.set([1, 2]);
    const component = internals();

    expect(component.alertStatus()).toBe('warning');
    expect(component.badgeColor()).toBe('warning');
    expect(component.statusLabel()).toBe('Stale');
    expect(component.statusCopy()).toBe(
      'Categories changed since training — retrain to refresh suggestions.',
    );
    expect(component.trainedSampleCount()).toBe(30);
    expect(component.modelCategoryCount()).toBe(2);
    expect(component.buttonLabel()).toBe('Retrain');
    expect(component.trainDisabled()).toBe(false);
  });

  it('renders distinct, accurate copy and tone for "error"', async () => {
    await setup();
    categoryModelStore.status.set('error');
    const component = internals();

    expect(component.alertStatus()).toBe('error');
    expect(component.badgeColor()).toBe('error');
    expect(component.statusLabel()).toBe('Error');
    expect(component.statusCopy()).toBe('Something went wrong while training. Try again.');
    expect(component.buttonLabel()).toBe('Train');
    expect(component.trainDisabled()).toBe(false);
  });

  it('calls CategoryModelStore.train() exactly once per click, regardless of status', async () => {
    await setup();
    categoryModelStore.status.set('stale');
    const component = internals();

    component.train();

    expect(categoryModelStore.train).toHaveBeenCalledExactlyOnceWith();
  });
});
