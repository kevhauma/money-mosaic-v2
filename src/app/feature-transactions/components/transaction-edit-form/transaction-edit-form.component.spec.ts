import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import {
  CategoriesRepository,
  RulesRepository,
  TransactionsRepository,
  type Transaction,
} from '@/core/data-access';
import { TransactionEditFormComponent } from './transaction-edit-form.component';

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-01',
  amount: -10,
  currency: 'EUR',
  rawDescription: 'Carrefour Market',
  fingerprint: 'fp-1',
  createdAt: '2026-07-01T00:00:00.000Z',
  ...overrides,
});

describe('TransactionEditFormComponent: original CSV row (TICKET-TXN-06)', () => {
  let fixture: ComponentFixture<TransactionEditFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransactionEditFormComponent],
      providers: [
        { provide: TransactionsRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
        { provide: CategoriesRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
        { provide: RulesRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionEditFormComponent);
  });

  it('shows a labeled table, in column order, when the transaction has a rawRow', async () => {
    fixture.componentRef.setInput(
      'transaction',
      transaction({
        rawRow: { Date: '01/07/2026', Amount: '-10,00', Desc: 'Carrefour Market' },
        rawLine: '01/07/2026;-10,00;Carrefour Market',
      }),
    );
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    fixture.detectChanges();

    const rows = [...(fixture.nativeElement as HTMLElement).querySelectorAll('table tr')].map(
      (row) => [row.querySelector('th')?.textContent, row.querySelector('td')?.textContent],
    );
    expect(rows).toEqual([
      ['Date', '01/07/2026'],
      ['Amount', '-10,00'],
      ['Desc', 'Carrefour Market'],
    ]);
  });

  it('falls back to the flat rawLine block when there is no rawRow (legacy transaction)', async () => {
    fixture.componentRef.setInput(
      'transaction',
      transaction({ rawLine: '01/07/2026;-10,00;Carrefour Market' }),
    );
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    expect(nativeElement.textContent).toContain('Original CSV row');
    expect(nativeElement.textContent).toContain('01/07/2026;-10,00;Carrefour Market');
    expect(nativeElement.querySelector('table')).toBeNull();
  });

  it('omits the section entirely when the transaction has neither rawRow nor rawLine', async () => {
    fixture.componentRef.setInput('transaction', transaction());
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Original CSV row');
  });
});
