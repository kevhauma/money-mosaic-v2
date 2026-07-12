import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { vi } from 'vitest';
import { CategoriesRepository, type Category } from '@/core/data-access';
import { RangeStore } from '@/core/stats';
import { echarts } from '@/shared/echarts';
import { CategoriesStore } from '@/feature-categories';
import { TransactionsStore } from '@/feature-transactions';
import { CategoryBreakdownPanelComponent } from './category-breakdown-panel.component';

// jsdom has no ResizeObserver; the echarts directive needs one to observe its host element.
class ResizeObserverStub {
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {};
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

const groceries: Category = {
  id: 1,
  name: 'Groceries',
  kind: 'expense',
  color: '#000000',
  icon: 'shopping-cart',
  archived: false,
  isSystem: false,
};

describe('CategoryBreakdownPanelComponent', () => {
  let fixture: ComponentFixture<CategoryBreakdownPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryBreakdownPanelComponent],
      providers: [
        provideRouter([]),
        provideEchartsCore({ echarts }),
        { provide: CategoriesRepository, useValue: { add: vi.fn().mockResolvedValue(1) } },
      ],
    }).compileComponents();

    TestBed.inject(RangeStore).setCustomRange('2026-07-01', '2026-07-31');

    fixture = TestBed.createComponent(CategoryBreakdownPanelComponent);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows an empty state when there is no data for the range', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No expense data for this range.');
  });

  describe('uncategorised spend callout (TICKET-STAT-09)', () => {
    it('shows the €/%/count callout on the expense tab when some spend is uncategorised', async () => {
      await TestBed.inject(CategoriesStore).addCategory(groceries);
      TestBed.inject(TransactionsStore).addMany([
        {
          id: 1,
          accountId: 1,
          bookingDate: '2026-07-05',
          amount: -75,
          currency: 'EUR',
          rawDescription: 'Supermarket',
          fingerprint: 'fp-1',
          createdAt: '2026-07-05T00:00:00.000Z',
          categoryId: 1,
        },
        {
          id: 2,
          accountId: 1,
          bookingDate: '2026-07-06',
          amount: -25,
          currency: 'EUR',
          rawDescription: 'Unknown shop',
          fingerprint: 'fp-2',
          createdAt: '2026-07-06T00:00:00.000Z',
        },
      ]);

      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain(
        '€25.00 uncategorised (25% of expense, 1 transaction)',
      );
    });

    it('hides the callout when the uncategorised total is zero', async () => {
      await TestBed.inject(CategoriesStore).addCategory(groceries);
      TestBed.inject(TransactionsStore).addMany([
        {
          id: 1,
          accountId: 1,
          bookingDate: '2026-07-05',
          amount: -75,
          currency: 'EUR',
          rawDescription: 'Supermarket',
          fingerprint: 'fp-1',
          createdAt: '2026-07-05T00:00:00.000Z',
          categoryId: 1,
        },
      ]);

      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('uncategorised');
    });

    it('hides the callout on the income tab even when expense has uncategorised spend', () => {
      TestBed.inject(TransactionsStore).addMany([
        {
          id: 1,
          accountId: 1,
          bookingDate: '2026-07-05',
          amount: -25,
          currency: 'EUR',
          rawDescription: 'Unknown shop',
          fingerprint: 'fp-1',
          createdAt: '2026-07-05T00:00:00.000Z',
        },
        {
          id: 2,
          accountId: 1,
          bookingDate: '2026-07-06',
          amount: 1000,
          currency: 'EUR',
          rawDescription: 'Salary',
          fingerprint: 'fp-2',
          createdAt: '2026-07-06T00:00:00.000Z',
        },
      ]);
      fixture.componentInstance['setKind']('income');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).not.toContain('% of expense');
    });
  });
});
