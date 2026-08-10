import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import {
  AccountsRepository,
  CategoriesRepository,
  TransactionsRepository,
  type Transaction,
} from '@/core/data-access';
import { RangeStore, TransactionsStore } from '@/core/state';
import { RecurringOverviewComponent } from './recurring-overview.component';

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-06',
  amount: -50,
  currency: 'EUR',
  rawDescription: 'Supermarket',
  fingerprint: 'fp-1',
  createdAt: '2026-07-06T00:00:00.000Z',
  ...overrides,
});

/**
 * `TransactionsStore` self-hydrates on first injection (TICKET-PERF-07), so the repository has to
 * be faked *before* the component is created — re-faking afterwards hits the cached hydration and
 * changes nothing.
 */
const createFixture = async (
  transactions: Transaction[],
): Promise<ComponentFixture<RecurringOverviewComponent>> => {
  await TestBed.configureTestingModule({
    imports: [RecurringOverviewComponent],
    providers: [
      provideRouter([]),
      {
        provide: TransactionsRepository,
        useValue: { getAll: vi.fn().mockResolvedValue(transactions) },
      },
      { provide: AccountsRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
      { provide: CategoriesRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(RecurringOverviewComponent);
  await TestBed.inject(TransactionsStore).hydrate();
  fixture.detectChanges();
  return fixture;
};

describe('RecurringOverviewComponent', () => {
  it('renders the empty state, and neither section, when there are no transactions', async () => {
    const fixture = await createFixture([]);
    const host = fixture.nativeElement as HTMLElement;

    expect(host.textContent).toContain('Nothing recurring yet');
    expect(host.querySelector('app-recurring-payments-panel')).toBeNull();
    expect(host.querySelector('app-bills-calendar')).toBeNull();
  });

  it('renders both sections in reading order once transactions exist', async () => {
    const fixture = await createFixture([transaction()]);
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector(':scope > mm-empty-state')).toBeNull();
    // Order matters: the calendar's "renders nothing when nothing was detected" decision leans on
    // the payments panel above it having already explained why (TICKET-REC-03).
    const sections = [...host.querySelectorAll('app-recurring-payments-panel, app-bills-calendar')];
    expect(sections.map((element) => element.tagName.toLowerCase())).toEqual([
      'app-recurring-payments-panel',
      'app-bills-calendar',
    ]);
  });

  it('opens with a page header and no range switcher — this page is not range-scoped', async () => {
    const fixture = await createFixture([transaction()]);
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('mm-page-header')?.textContent).toContain('Recurring');
    expect(host.querySelector('mm-range-grouping-switcher')).toBeNull();
    expect(host.textContent).toContain('Detected across your whole transaction history');
  });

  it('carries the shared privacy toggle in the header’s end slot (TICKET-PRIV-02)', async () => {
    const fixture = await createFixture([transaction()]);
    const header = fixture.nativeElement.querySelector('mm-page-header') as HTMLElement;
    const toggle = header.querySelector('mm-privacy-toggle');

    // Both sections here have masked their figures since TICKET-PRIV-01; this is what lets you say
    // so without walking to the Dashboard.
    expect(toggle).not.toBeNull();
    expect(toggle?.textContent?.trim()).toBe('Hide amounts');
    expect(header.querySelector('.mm-page-actions')?.contains(toggle as Node)).toBe(true);
  });

  it('reaches the toggle in the empty state too — it writes a global setting (TICKET-PRIV-02)', async () => {
    const fixture = await createFixture([]);
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('mm-empty-state')).not.toBeNull();
    expect(host.querySelector('mm-page-header mm-privacy-toggle')).not.toBeNull();
  });

  it('leaves every other page range untouched, having none of its own', async () => {
    await createFixture([transaction()]);
    const rangeStore = TestBed.inject(RangeStore);

    // `RangePageKey` deliberately gained no 'recurring' member — nothing here reads or writes one.
    expect(rangeStore.preset('explore')).toBe(rangeStore.preset('dashboard'));
  });
});
