import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  CategoryModelStore,
  type CategoryModelStatus,
  type TrainingProgress,
} from '@/feature-categories';
import { ModelStatusBadgeComponent } from './model-status-badge.component';

/**
 * Driven through a faked `CategoryModelStore` (the real one is worker-backed and would need an
 * actually-trained model to reach `ready`/`stale`), which is also why this lives on the badge
 * rather than on the page: every state is reachable in one line here.
 */
describe('ModelStatusBadgeComponent (TICKET-ML-18)', () => {
  let fixture: ComponentFixture<ModelStatusBadgeComponent>;

  const categoryModelStore = {
    status: signal<CategoryModelStatus>('untrained'),
    trainingProgress: signal<TrainingProgress | null>(null),
  };

  const setup = async (): Promise<void> => {
    categoryModelStore.status.set('untrained');
    categoryModelStore.trainingProgress.set(null);

    await TestBed.configureTestingModule({
      imports: [ModelStatusBadgeComponent],
      providers: [{ provide: CategoryModelStore, useValue: categoryModelStore }],
    }).compileComponents();

    fixture = TestBed.createComponent(ModelStatusBadgeComponent);
    await fixture.whenStable();
  };

  const badge = (): HTMLElement | null => fixture.nativeElement.querySelector('.badge');
  const root = (): HTMLElement => fixture.nativeElement;

  it.each([
    ['ready' as const, 'Ready', 'badge-success'],
    ['stale' as const, 'Stale', 'badge-warning'],
    ['error' as const, 'Error', 'badge-error'],
  ])('renders %s as "%s" in %s', async (status, label, colorClass) => {
    await setup();
    categoryModelStore.status.set(status);
    fixture.detectChanges();

    expect(badge()?.textContent?.trim()).toBe(label);
    expect(badge()?.classList.contains(colorClass)).toBe(true);
  });

  it.each([
    ['untrained' as const, 'Not trained'],
    ['not-enough-data' as const, 'Needs more data'],
    ['training' as const, 'Training'],
  ])('renders %s as "%s" with no verdict colour', async (status, label) => {
    await setup();
    categoryModelStore.status.set(status);
    fixture.detectChanges();

    expect(badge()?.textContent?.trim()).toBe(label);
    expect(
      ['badge-success', 'badge-warning', 'badge-error'].some((cls) =>
        badge()?.classList.contains(cls),
      ),
    ).toBe(false);
  });

  it('shows a spinner and a live epoch counter while training, updating as progress changes', async () => {
    await setup();
    categoryModelStore.status.set('training');
    categoryModelStore.trainingProgress.set({
      epoch: 3,
      totalEpochs: 10,
      loss: 0.42,
      accuracy: 0.61,
    });
    fixture.detectChanges();

    expect(root().querySelector('.loading-spinner')).not.toBeNull();
    expect(root().textContent).toContain('epoch 3/10');
    expect(root().textContent).toContain('61%');

    categoryModelStore.trainingProgress.set({
      epoch: 7,
      totalEpochs: 10,
      loss: 0.21,
      accuracy: 0.84,
    });
    fixture.detectChanges();

    expect(root().textContent).toContain('epoch 7/10');
    expect(root().textContent).not.toContain('epoch 3/10');
  });

  it('shows the spinner but no counter before the first epoch reports', async () => {
    await setup();
    categoryModelStore.status.set('training');
    fixture.detectChanges();

    expect(root().querySelector('.loading-spinner')).not.toBeNull();
    expect(root().textContent).not.toContain('epoch');
  });

  it('drops the spinner and the counter once training ends', async () => {
    await setup();
    categoryModelStore.status.set('training');
    categoryModelStore.trainingProgress.set({
      epoch: 9,
      totalEpochs: 10,
      loss: 0.1,
      accuracy: 0.9,
    });
    fixture.detectChanges();
    expect(root().querySelector('.loading-spinner')).not.toBeNull();

    categoryModelStore.status.set('ready');
    fixture.detectChanges();

    expect(root().querySelector('.loading-spinner')).toBeNull();
    expect(root().textContent).not.toContain('epoch');
    expect(badge()?.textContent?.trim()).toBe('Ready');
  });
});
