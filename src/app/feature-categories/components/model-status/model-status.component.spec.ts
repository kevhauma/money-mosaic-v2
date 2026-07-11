import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { CategoryModelStore, type CategoryModelStatus } from '../../category-model.store';
import { ModelStatusComponent } from './model-status.component';

/** Protected surface we reach into for status-mapping assertions. */
type Internals = {
  alertStatus: () => string | undefined;
  badgeColor: () => string | undefined;
  statusLabel: () => string;
  statusCopy: () => string;
  accuracyPercent: () => number;
  buttonLabel: () => string;
  trainDisabled: () => boolean;
  train: () => void;
};

describe('ModelStatusComponent', () => {
  let fixture: ComponentFixture<ModelStatusComponent>;

  const categoryModelStore = {
    status: signal<CategoryModelStatus>('untrained'),
    metrics: signal<{ accuracy: number; trainedSampleCount: number } | null>(null),
    lastTrainedAt: signal<string | null>(null),
    train: vi.fn().mockResolvedValue(undefined),
  };

  const setup = async (): Promise<void> => {
    vi.clearAllMocks();
    categoryModelStore.status.set('untrained');
    categoryModelStore.metrics.set(null);
    categoryModelStore.lastTrainedAt.set(null);
    await TestBed.configureTestingModule({
      imports: [ModelStatusComponent],
      providers: [{ provide: CategoryModelStore, useValue: categoryModelStore }],
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

  it('renders distinct, accurate copy and tone for "not-enough-data"', async () => {
    await setup();
    categoryModelStore.status.set('not-enough-data');
    const component = internals();

    expect(component.alertStatus()).toBe('info');
    expect(component.statusLabel()).toBe('Needs more data');
    expect(component.statusCopy()).toBe(
      'Categorise a few more transactions across at least two categories before training.',
    );
    expect(component.buttonLabel()).toBe('Train');
    expect(component.trainDisabled()).toBe(false);
  });

  it('renders distinct, accurate copy and tone for "training", and disables the button', async () => {
    await setup();
    categoryModelStore.status.set('training');
    const component = internals();

    expect(component.statusCopy()).toBe('Training…');
    expect(component.trainDisabled()).toBe(true);
  });

  it('renders "ready" with success tone, formatted accuracy, and keeps the "Train" label', async () => {
    await setup();
    categoryModelStore.status.set('ready');
    categoryModelStore.metrics.set({ accuracy: 0.923, trainedSampleCount: 40 });
    categoryModelStore.lastTrainedAt.set('2026-07-01T12:00:00.000Z');
    const component = internals();

    expect(component.alertStatus()).toBe('success');
    expect(component.badgeColor()).toBe('success');
    expect(component.statusLabel()).toBe('Ready');
    expect(component.accuracyPercent()).toBe(92);
    expect(component.buttonLabel()).toBe('Train');
    expect(component.trainDisabled()).toBe(false);
  });

  it('renders "stale" with warning tone and relabels the button to "Retrain"', async () => {
    await setup();
    categoryModelStore.status.set('stale');
    const component = internals();

    expect(component.alertStatus()).toBe('warning');
    expect(component.badgeColor()).toBe('warning');
    expect(component.statusLabel()).toBe('Stale');
    expect(component.statusCopy()).toBe(
      'Categories changed since training — retrain to refresh suggestions.',
    );
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
