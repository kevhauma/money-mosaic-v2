import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AppSettingsRepository, type Transaction } from '@/core/data-access';
import type { TransactionRowVm } from '../../transaction-row-vm';
import type { CategorySelectOption } from '../../category-picker';
import { TransactionRowComponent } from './transaction-row.component';

const categoryOptions: CategorySelectOption[] = [
  { value: '7', label: 'Groceries' },
  { value: '9', label: 'Rent' },
];

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-06-01',
  amount: -12.5,
  currency: 'EUR',
  rawDescription: 'CARREFOUR MARKET',
  fingerprint: 'fp-1',
  createdAt: '2026-06-01T00:00:00.000Z',
  ...overrides,
});

const rowVm = (overrides: Partial<TransactionRowVm> = {}): TransactionRowVm => ({
  id: 1,
  transaction: transaction(),
  accountName: 'Checking',
  transferId: undefined,
  likelyTransfer: false,
  selected: false,
  ariaLabel: 'Select transaction 06/01/2026 CARREFOUR MARKET',
  categoryId: '',
  ...overrides,
});

describe('TransactionRowComponent', () => {
  let fixture: ComponentFixture<TransactionRowComponent>;

  const setup = async (vm: TransactionRowVm): Promise<HTMLElement> => {
    await TestBed.configureTestingModule({
      imports: [TransactionRowComponent],
      // The row's `localeDate`/`signedAmount` pipes read the shared, settings-driven locale
      // (TICKET-NG-10); a deterministic repository keeps the default (en-US/EUR) formatting.
      providers: [
        { provide: AppSettingsRepository, useValue: { get: vi.fn().mockResolvedValue({ id: 1 }) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TransactionRowComponent);
    fixture.componentRef.setInput('row', vm);
    fixture.componentRef.setInput('categoryOptions', categoryOptions);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('renders the row cells from the VM without re-deriving anything', async () => {
    const element = await setup(
      rowVm({
        accountName: 'Joint account',
        transaction: transaction({ counterpartyName: 'Carrefour' }),
      }),
    );

    const text = element.textContent ?? '';
    expect(text).toContain('CARREFOUR MARKET');
    expect(text).toContain('Carrefour');
    expect(text).toContain('Joint account');
    expect(element.querySelectorAll('td')).toHaveLength(7);
  });

  it('takes the checkbox accessible name straight off the VM (TICKET-TXN-07)', async () => {
    const element = await setup(rowVm({ ariaLabel: 'Select transaction 06/01/2026 Row 1' }));

    const checkbox = element.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.getAttribute('aria-label')).toBe('Select transaction 06/01/2026 Row 1');
    expect(checkbox.checked).toBe(false);
  });

  it('reflects the selected flag on the checkbox', async () => {
    const element = await setup(rowVm({ selected: true }));

    expect((element.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(
      true,
    );
  });

  it('leaves the likely-transfer and nullified badges off a plain row', async () => {
    const element = await setup(rowVm());

    expect(element.textContent).not.toContain('Likely transfer');
    expect(element.textContent).not.toContain('Nullified');
  });

  it('shows the likely-transfer and nullified badges when the VM flags them', async () => {
    const element = await setup(
      rowVm({ likelyTransfer: true, transaction: transaction({ nullified: true }) }),
    );

    expect(element.textContent).toContain('Likely transfer');
    expect(element.textContent).toContain('Nullified');
  });

  it('preselects the row category in the quick-set cell', async () => {
    const element = await setup(rowVm({ categoryId: '9' }));

    expect((element.querySelector('select') as HTMLSelectElement).value).toBe('9');
  });

  it('relays the quick-set pick as a typed categoryChanged event', async () => {
    const element = await setup(rowVm());
    const picked: (number | undefined)[] = [];
    fixture.componentInstance.categoryChanged.subscribe((value) => picked.push(value));

    const select = element.querySelector('select') as HTMLSelectElement;
    select.value = '7';
    select.dispatchEvent(new Event('change'));

    expect(picked).toEqual([7]);
  });

  it('emits selectionToggled when the checkbox is clicked', async () => {
    const element = await setup(rowVm());
    let toggles = 0;
    fixture.componentInstance.selectionToggled.subscribe(() => (toggles += 1));

    (element.querySelector('input[type="checkbox"]') as HTMLInputElement).click();

    expect(toggles).toBe(1);
  });

  it('leaves the unlink button off a row that is not part of a transfer', async () => {
    const element = await setup(rowVm());

    expect(element.querySelector('[aria-label="Unlink transfer"]')).toBeNull();
  });

  it('renders the unlink button for a linked row and emits its transfer id', async () => {
    const element = await setup(rowVm({ transferId: 42 }));
    const emitted: number[] = [];
    fixture.componentInstance.unlinkRequested.subscribe((id) => emitted.push(id));

    (element.querySelector('[aria-label="Unlink transfer"]') as HTMLElement).click();

    expect(emitted).toEqual([42]);
  });

  it('emits editRequested from the edit button', async () => {
    const element = await setup(rowVm());
    let edits = 0;
    fixture.componentInstance.editRequested.subscribe(() => (edits += 1));

    (element.querySelector('[aria-label="Edit transaction"]') as HTMLElement).click();

    expect(edits).toBe(1);
  });
});
