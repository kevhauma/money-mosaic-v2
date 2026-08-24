import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import {
  AccountsRepository,
  CategoriesRepository,
  TransactionsRepository,
  TransfersRepository,
  type Account,
  type Transaction,
  type Transfer,
} from '@/core/data-access';
import { AccountsStore, TransactionsStore, TransfersStore } from '@/core/state';

import { TransferReviewComponent } from './transfer-review.component';

describe('TransferReviewComponent', () => {
  let component: TransferReviewComponent;
  let fixture: ComponentFixture<TransferReviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransferReviewComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TransferReviewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

const account = (overrides: Partial<Account> = {}): Account => ({
  id: 1,
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#3366ff',
  icon: 'wallet',
  archived: false,
  ...overrides,
});

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-01',
  amount: -500,
  currency: 'EUR',
  rawDescription: 'Transfer',
  fingerprint: 'fp-1',
  createdAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
});

const transfer = (overrides: Partial<Transfer> = {}): Transfer => ({
  id: 1,
  fromTransactionId: 1,
  toTransactionId: 2,
  method: 'auto-iban',
  confidence: 'high',
  linkedAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
});

/**
 * TICKET-TRF-06 — "Review possible transfers" carried no count, so nothing on the page said whether
 * step three of import → categorise → review → read was done, pending or empty. The trigger states
 * its own status now, and it has to be true while the panel is *collapsed*, which is what forced the
 * `reviewExpanded` gate off the match scan (re-deciding CR-2.2).
 */
describe('TransferReviewComponent: the review trigger states its status (TICKET-TRF-06)', () => {
  const render = async (options: {
    transactions?: Transaction[];
    transfers?: Transfer[];
    accounts?: Account[];
  }): Promise<{ fixture: ComponentFixture<TransferReviewComponent>; element: HTMLElement }> => {
    await TestBed.configureTestingModule({
      imports: [TransferReviewComponent],
      providers: [
        provideRouter([]),
        {
          provide: TransactionsRepository,
          useValue: { getAll: vi.fn().mockResolvedValue(options.transactions ?? []) },
        },
        {
          provide: TransfersRepository,
          useValue: { getAll: vi.fn().mockResolvedValue(options.transfers ?? []) },
        },
        {
          provide: AccountsRepository,
          useValue: {
            getAll: vi.fn().mockResolvedValue(options.accounts ?? [account()]),
            update: vi.fn().mockResolvedValue(1),
          },
        },
        { provide: CategoriesRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
      ],
    }).compileComponents();

    await TestBed.inject(TransactionsStore).hydrate({ force: true });
    await TestBed.inject(TransfersStore).hydrate({ force: true });
    await TestBed.inject(AccountsStore).hydrate({ force: true });

    const fixture = TestBed.createComponent(TransferReviewComponent);
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  };

  /** A pair the matcher cannot resolve on its own: same amount and date, two candidate destinations. */
  const ambiguousSet: Transaction[] = [
    transaction({ id: 1, accountId: 1, amount: -500 }),
    transaction({ id: 2, accountId: 2, amount: 500 }),
    transaction({ id: 3, accountId: 3, amount: 500 }),
  ];

  const accounts = [
    account({ id: 1, name: 'Checking' }),
    account({ id: 2, name: 'Savings', type: 'savings' }),
    account({ id: 3, name: 'Buffer', type: 'savings' }),
  ];

  it('counts the pending pairs without the panel having to be expanded', async () => {
    const { fixture, element } = await render({ transactions: ambiguousSet, accounts });
    const internals = fixture.componentInstance as unknown as {
      reviewExpanded: () => boolean;
      pendingCount: () => number;
    };

    // The gate this replaced returned [] while collapsed, so the count could only ever be zero
    // until the user opened the very panel the count exists to draw them to.
    expect(internals.reviewExpanded()).toBe(false);
    expect(internals.pendingCount()).toBeGreaterThan(0);
    expect(element.textContent).toContain('need');
  });

  it('reads as resolved, not merely empty, when pairs are linked and none are pending', async () => {
    const { fixture, element } = await render({
      transactions: [
        transaction({ id: 1, accountId: 1, transferId: 1 }),
        transaction({ id: 2, accountId: 2, amount: 500, transferId: 1 }),
      ],
      transfers: [transfer()],
      accounts,
    });
    const internals = fixture.componentInstance as unknown as { pendingCount: () => number };

    expect(internals.pendingCount()).toBe(0);
    expect(element.textContent).toContain('1 pair linked, none to review');
  });

  it('distinguishes "nothing to review yet" from a finished review', async () => {
    const { element } = await render({ transactions: [], transfers: [], accounts });

    // An app with no linked pairs and no candidates has not finished reviewing — it has nothing to
    // review yet, and saying "none to review" there would claim a step was done that never ran.
    expect(element.textContent).toContain('No transfers found yet');
    expect(element.textContent).not.toContain('none to review');
  });
});
