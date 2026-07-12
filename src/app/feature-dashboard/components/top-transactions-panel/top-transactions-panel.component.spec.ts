import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { CategoriesRepository, type Category } from '@/core/data-access';
import { RangeStore } from '@/core/stats';
import { CategoriesStore } from '@/feature-categories';
import { TransactionsStore } from '@/feature-transactions';
import { TopTransactionsPanelComponent } from './top-transactions-panel.component';

const groceries: Category = {
  id: 1,
  name: 'Groceries',
  kind: 'expense',
  color: '#ff0000',
  icon: 'shopping-cart',
  archived: false,
  isSystem: false,
};

describe('TopTransactionsPanelComponent', () => {
  let fixture: ComponentFixture<TopTransactionsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopTransactionsPanelComponent],
      providers: [
        provideRouter([]),
        { provide: CategoriesRepository, useValue: { add: vi.fn().mockResolvedValue(1) } },
      ],
    }).compileComponents();

    TestBed.inject(RangeStore).setCustomRange('2026-07-01', '2026-07-31');

    fixture = TestBed.createComponent(TopTransactionsPanelComponent);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows an empty state when there is no expense data for the range', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No expense transactions for this range.');
  });

  it('lists the biggest expense transactions sorted by amount, with category name resolved', async () => {
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
        amount: -800,
        currency: 'EUR',
        rawDescription: 'Appliance store',
        fingerprint: 'fp-2',
        createdAt: '2026-07-06T00:00:00.000Z',
      },
    ]);

    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Appliance store');
    expect(text).toContain('€800.00');
    expect(text).toContain('Supermarket');
    expect(text).toContain('Groceries');

    const rows = fixture.nativeElement.querySelectorAll('a');
    expect(rows[0].textContent).toContain('Appliance store');
  });

  it('excludes income transactions from the list', async () => {
    TestBed.inject(TransactionsStore).addMany([
      {
        id: 1,
        accountId: 1,
        bookingDate: '2026-07-05',
        amount: 2000,
        currency: 'EUR',
        rawDescription: 'Salary',
        fingerprint: 'fp-1',
        createdAt: '2026-07-05T00:00:00.000Z',
      },
    ]);

    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No expense transactions for this range.');
  });

  it('builds a drill-down link scoped to the transaction’s own date, account, and category', async () => {
    await TestBed.inject(CategoriesStore).addCategory(groceries);
    TestBed.inject(TransactionsStore).addMany([
      {
        id: 1,
        accountId: 3,
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

    const link = fixture.nativeElement.querySelector('a');
    expect(link.getAttribute('href')).toContain('from=2026-07-05');
    expect(link.getAttribute('href')).toContain('to=2026-07-05');
    expect(link.getAttribute('href')).toContain('accountId=3');
    expect(link.getAttribute('href')).toContain('categoryId=1');
  });
});
