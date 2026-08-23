import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { Loan } from '@/core/data-access';
import { loanCardVmFor } from '../../loan-card-vm';
import { LoanCardComponent } from './loan-card.component';

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

const createFixture = async (testLoan: Loan): Promise<ComponentFixture<LoanCardComponent>> => {
  // Reset first — a test that builds two fixtures in one `it` (the mortgage/auto comparison
  // below) would otherwise hit "cannot configure the test module when it has already been
  // instantiated" on the second call.
  TestBed.resetTestingModule();
  await TestBed.configureTestingModule({
    imports: [LoanCardComponent],
    providers: [provideRouter([])],
  }).compileComponents();

  const fixture = TestBed.createComponent(LoanCardComponent);
  fixture.componentRef.setInput(
    'vm',
    loanCardVmFor(testLoan, {
      actualBalance: 199000,
      totalPrincipalPaid: 1000,
      totalInterestPaid: 500,
      percentPaidOff: 0.005,
      lastPaymentDate: '2024-02-01',
    }),
  );
  fixture.detectChanges();
  return fixture;
};

describe('LoanCardComponent (TICKET-LOAN-06)', () => {
  it('renders the loan name, type badge, and remaining balance', async () => {
    const fixture = await createFixture(loan());
    const host = fixture.nativeElement as HTMLElement;

    expect(host.textContent).toContain('Home mortgage');
    expect(host.textContent).toContain('Mortgage');
    expect(host.querySelector('mm-badge')).not.toBeNull();
  });

  /**
   * jsdom has no layout engine, so "does the caption escape the card" can only be *measured* in a
   * browser — those numbers live on TICKET-LOAN-15. What a spec can hold is the class contract
   * that produced them: the row wraps, it has a gap, and the amount is allowed to give way. The
   * bug was precisely the absence of all three.
   */
  it('lets the balance row wrap, gap and shrink rather than overflow the card (TICKET-LOAN-15)', async () => {
    const fixture = await createFixture(loan({ principal: 1248392.1 }));
    const host = fixture.nativeElement as HTMLElement;
    const amount = Array.from(host.querySelectorAll('mm-text')).find(
      (text) => text.getAttribute('variant') === 'display',
    ) as HTMLElement;
    const row = amount.closest('mm-flex') as HTMLElement;

    // `flex-wrap`, so "remaining" drops to its own line instead of being pushed out of the card…
    expect(row.querySelector('div')?.classList).toContain('flex-wrap');
    // …a gap, so the two never touch when they do share a line…
    expect(row.querySelector('div')?.classList).toContain('gap-2');
    // …and an amount that can give way, so even a seven-figure balance stays inside a narrow card.
    expect(amount.classList).toContain('min-w-0');
    expect(amount.classList).toContain('break-words');
  });

  it('renders identical layout for a mortgage and a non-mortgage loanType — only the badge text differs', async () => {
    const mortgage = await createFixture(loan({ loanType: 'mortgage' }));
    const auto = await createFixture(loan({ loanType: 'auto', name: 'Car loan' }));

    const structureOf = (fixture: ComponentFixture<LoanCardComponent>): string =>
      (fixture.nativeElement as HTMLElement).innerHTML.replace(
        /Home mortgage|Car loan|Mortgage|Auto/g,
        '',
      );

    // Same DOM shape once the type-specific text is stripped out — no per-type styling branch.
    expect(structureOf(mortgage)).toBe(structureOf(auto));
  });

  it('links the loan name to its detail route', async () => {
    const fixture = await createFixture(loan({ id: 42 }));
    const host = fixture.nativeElement as HTMLElement;

    const link = host.querySelector('a.card-title');
    expect(link?.getAttribute('href')).toBe('/loans/42');
  });

  it('renders the progress bar at the resolved percentPaidOff', async () => {
    const fixture = await createFixture(loan());
    const host = fixture.nativeElement as HTMLElement;

    const progress = host.querySelector('progress') as HTMLProgressElement | null;
    expect(progress?.value).toBe(1);
  });

  it('renders the ahead/behind-schedule badge and interest-saved caption (TICKET-LOAN-10)', async () => {
    const fixture = await createFixture(loan());
    const host = fixture.nativeElement as HTMLElement;

    const badges = host.querySelectorAll('mm-badge');
    expect(badges.length).toBe(2); // type badge + schedule-status badge
    expect(host.textContent).toMatch(/ahead of schedule|behind schedule|On schedule/);
    expect(host.textContent).toMatch(/interest saved so far|extra interest so far/);
  });
});
