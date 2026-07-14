import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DashboardLayoutSettingsRepository, type DashboardRowId } from '@/core/data-access';
import { DashboardCustomizePanelComponent } from './dashboard-customize-panel.component';

const DEFAULT_ORDER: DashboardRowId[] = [
  'stats',
  'weekday-weekend',
  'category-breakdown',
  'category-comparison',
  'trend-top-transactions',
  'action-queue',
  'account-balance',
];

describe('DashboardCustomizePanelComponent', () => {
  let component: DashboardCustomizePanelComponent;
  let fixture: ComponentFixture<DashboardCustomizePanelComponent>;
  const repository = { get: vi.fn(), setRowOrder: vi.fn(), setHiddenRowIds: vi.fn() };

  beforeEach(async () => {
    vi.clearAllMocks();
    repository.get.mockResolvedValue({ id: 1, rowOrder: DEFAULT_ORDER, hiddenRowIds: [] });
    repository.setRowOrder.mockResolvedValue(1);
    repository.setHiddenRowIds.mockResolvedValue(1);

    await TestBed.configureTestingModule({
      imports: [DashboardCustomizePanelComponent],
      providers: [{ provide: DashboardLayoutSettingsRepository, useValue: repository }],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardCustomizePanelComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('lists every row, including hidden ones, in resolved order', () => {
    expect(component['rows']()).toEqual(DEFAULT_ORDER);
  });

  it('moveRow persists a swapped order through the store', async () => {
    component['moveRow']('weekday-weekend', 'up');
    await Promise.resolve();

    expect(repository.setRowOrder).toHaveBeenCalledExactlyOnceWith([
      'weekday-weekend',
      'stats',
      'category-breakdown',
      'category-comparison',
      'trend-top-transactions',
      'action-queue',
      'account-balance',
    ]);
  });

  it('toggleHidden persists the hidden-row set through the store', async () => {
    component['toggleHidden']('action-queue');
    await Promise.resolve();

    expect(repository.setHiddenRowIds).toHaveBeenCalledExactlyOnceWith(['action-queue']);
  });

  it('reset restores the default order and unhides every row', async () => {
    component['reset']();
    await Promise.resolve();

    expect(repository.setRowOrder).toHaveBeenCalledExactlyOnceWith(DEFAULT_ORDER);
    expect(repository.setHiddenRowIds).toHaveBeenCalledExactlyOnceWith([]);
  });

  it('onDrop reorders rows by the dragged-to index and persists through the store', async () => {
    component['onDrop']({ previousIndex: 0, currentIndex: 2 } as never);
    await Promise.resolve();

    expect(repository.setRowOrder).toHaveBeenCalledExactlyOnceWith([
      'weekday-weekend',
      'category-breakdown',
      'stats',
      'category-comparison',
      'trend-top-transactions',
      'action-queue',
      'account-balance',
    ]);
  });
});
