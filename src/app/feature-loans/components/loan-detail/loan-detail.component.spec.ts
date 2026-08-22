import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import {
  LoansRepository,
  TransactionsRepository,
  type Loan,
  type Transaction,
} from '@/core/data-access';
import { TransactionsStore } from '@/core/state';
import { LoanBalanceChartComponent } from '../loan-balance-chart/loan-balance-chart.component';
import { LoanDetailComponent } from './loan-detail.component';

/**
 * Stands in for the real `<app-loan-balance-chart>` (TICKET-LOAN-07) in every test here — none of
 * them are about the chart itself (that's `loan-balance-chart.component.spec.ts`'s job), and a real
 * `NgxEchartsDirective` needs a working canvas 2D context, which jsdom doesn't provide. Mounting the
 * real directive anyway "works" for an initial render, but an *update* transition (exactly what an
 * archive/unarchive click triggers, since the chart's `loan` input changes) drives zrender's
 * animation ticker into a repaint against a canvas jsdom never gave it a context for — a real
 * `Cannot read properties of null (reading 'clearRect')`, not a false assertion to route around.
 */
@Component({ selector: 'app-loan-balance-chart', template: '' })
class LoanBalanceChartStub {
  readonly loan = input.required<Loan>();
  readonly payments = input<Transaction[]>([]);
}

// jsdom has no ResizeObserver; keep the polyfill in case a future test here reaches the real chart.
class ResizeObserverStub {
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {};
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

const loan = (overrides: Partial<Loan> = {}): Loan => ({
  id: 1,
  name: 'Home mortgage',
  loanType: 'mortgage',
  principal: 200000,
  interestRate: 6,
  termMonths: 360,
  startDate: '2024-01-01',
  categoryId: 1,
  archived: false,
  sortOrder: 0,
  ...overrides,
});

const loansRepository = {
  getAll: vi.fn().mockResolvedValue([]),
  add: vi.fn().mockResolvedValue(9),
  update: vi.fn().mockResolvedValue(1),
  remove: vi.fn().mockResolvedValue(undefined),
};
const transactionsRepository = { getAll: vi.fn().mockResolvedValue([]) };

const createFixture = async (
  loans: Loan[],
  id: string,
  transactions: Transaction[] = [],
): Promise<ComponentFixture<LoanDetailComponent>> => {
  vi.clearAllMocks();
  loansRepository.getAll.mockResolvedValue(loans);
  transactionsRepository.getAll.mockResolvedValue(transactions);
  await TestBed.configureTestingModule({
    imports: [LoanDetailComponent],
    providers: [
      // `deleteConfirmed()` navigates to `/loans` after removal — a real route so that resolves.
      provideRouter([{ path: 'loans', children: [] }]),
      { provide: LoansRepository, useValue: loansRepository },
      { provide: TransactionsRepository, useValue: transactionsRepository },
    ],
  })
    .overrideComponent(LoanDetailComponent, {
      remove: { imports: [LoanBalanceChartComponent] },
      add: { imports: [LoanBalanceChartStub] },
    })
    .compileComponents();

  const fixture = TestBed.createComponent(LoanDetailComponent);
  fixture.componentRef.setInput('id', id);
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
};

describe('LoanDetailComponent (TICKET-LOAN-06)', () => {
  it('resolves the loan by id and shows its name in the header', async () => {
    const fixture = await createFixture([loan({ id: 1, name: 'Home mortgage' })], '1');
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('mm-page-header')?.textContent).toContain('Home mortgage');
  });

  it('shows a "not found" state when the id matches no loan', async () => {
    const fixture = await createFixture([loan({ id: 1, name: 'Home mortgage' })], '999');
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('mm-page-header')).toBeNull();
    expect(host.textContent).toContain('Loan not found');
  });

  it('renders the ahead/behind-schedule badge and interest-saved caption (TICKET-LOAN-10)', async () => {
    const fixture = await createFixture([loan({ id: 1 })], '1');
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('mm-badge')).not.toBeNull();
    expect(host.textContent).toMatch(/ahead of schedule|behind schedule|On schedule/);
    expect(host.textContent).toMatch(/interest saved so far|extra interest so far/);
  });

  it('renders the amortization schedule table (TICKET-LOAN-08)', async () => {
    const fixture = await createFixture([loan({ id: 1 })], '1');
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('app-loan-amortization-table')).not.toBeNull();
    expect(host.textContent).toContain('Amortization schedule');
  });

  it('renders the linked payments list (TICKET-LOAN-09)', async () => {
    const fixture = await createFixture([loan({ id: 1 })], '1');
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('app-loan-payments-list')).not.toBeNull();
    expect(host.textContent).toContain('Linked payments');
  });
});

describe('LoanDetailComponent: archive/unarchive/delete (TICKET-LOAN-11)', () => {
  for (const loanType of ['mortgage', 'auto'] as const) {
    it(`archives a ${loanType}-type loan through LoansStore.archiveLoan, never appDb directly`, async () => {
      const fixture = await createFixture([loan({ id: 1, loanType, archived: false })], '1');
      const host = fixture.nativeElement as HTMLElement;

      const archiveButton = [...host.querySelectorAll('button')].find((element) =>
        element.textContent?.includes('Archive'),
      );
      archiveButton?.click();
      await fixture.whenStable();

      expect(loansRepository.update).toHaveBeenCalledWith(1, { archived: true });
    });

    it(`unarchives an already-archived ${loanType}-type loan through LoansStore.unarchiveLoan, never appDb directly`, async () => {
      const fixture = await createFixture([loan({ id: 1, loanType, archived: true })], '1');
      const host = fixture.nativeElement as HTMLElement;

      const unarchiveButton = [...host.querySelectorAll('button')].find((element) =>
        element.textContent?.includes('Unarchive'),
      );
      unarchiveButton?.click();
      await fixture.whenStable();

      expect(loansRepository.update).toHaveBeenCalledWith(1, { archived: false });
    });
  }

  it('reads "this loan," never a type-specific word, in the delete confirmation', async () => {
    const fixture = await createFixture([loan({ id: 1, loanType: 'mortgage' })], '1');
    const host = fixture.nativeElement as HTMLElement;

    const deleteButton = [...host.querySelectorAll('button')].find((element) =>
      element.textContent?.includes('Delete'),
    );
    deleteButton?.click();
    fixture.detectChanges();

    const dialogText = host.querySelector('mm-confirm-dialog')?.textContent ?? '';
    expect(dialogText).toContain('Delete this loan?');
    expect(dialogText.toLowerCase()).not.toContain('mortgage');
  });

  for (const loanType of ['mortgage', 'auto'] as const) {
    it(`deletes only the ${loanType}-type Loan row through LoansStore.removeLoan, leaving transactions in its category untouched`, async () => {
      const linkedTransaction: Transaction = {
        id: 1,
        accountId: 1,
        categoryId: 1,
        bookingDate: '2024-02-01',
        amount: -100,
        currency: 'EUR',
        rawDescription: 'Loan payment',
        fingerprint: 'fp-1',
        createdAt: '2024-02-01T00:00:00.000Z',
      };
      const fixture = await createFixture([loan({ id: 1, loanType, categoryId: 1 })], '1', [
        linkedTransaction,
      ]);
      await TestBed.inject(TransactionsStore).hydrate({ force: true });
      const getAllCallsBeforeDelete = transactionsRepository.getAll.mock.calls.length;

      await fixture.componentInstance['deleteConfirmed']();

      expect(loansRepository.remove).toHaveBeenCalledWith(1);
      // Deleting a loan never reaches into transactions at all — no further repository
      // interaction, and the category's transaction is still exactly there afterwards.
      expect(transactionsRepository.getAll.mock.calls.length).toBe(getAllCallsBeforeDelete);
      expect(TestBed.inject(TransactionsStore).transactions()).toEqual([linkedTransaction]);
    });
  }
});
