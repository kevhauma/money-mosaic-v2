import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AppSettingsRepository, type Transaction } from '@/core/data-access';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import type { TransactionRowVm } from '../../transaction-row-vm';
import type { CategorySelectOption } from '../../category-picker';
import { TransactionRowComponent } from '../transaction-row/transaction-row.component';
import { TransactionCardComponent } from './transaction-card.component';

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
  amountColor: 'money-negative',
  transferLabel: undefined,
  ...overrides,
});

const settingsProvider = {
  provide: AppSettingsRepository,
  useValue: { get: vi.fn().mockResolvedValue({ id: 1 }) },
};

describe('TransactionCardComponent (TICKET-TXN-12)', () => {
  // The card asserts formatted amounts and dates, and `format-settings`' signals are module-level
  // under `isolate: false` — without this bracket a spec file that leaves a non-default locale
  // behind fails these assertions instead of its own.
  withCleanFormatSettings();

  let fixture: ComponentFixture<TransactionCardComponent>;

  const setup = async (vm: TransactionRowVm): Promise<HTMLElement> => {
    await TestBed.configureTestingModule({
      imports: [TransactionCardComponent],
      providers: [settingsProvider],
    }).compileComponents();
    fixture = TestBed.createComponent(TransactionCardComponent);
    fixture.componentRef.setInput('row', vm);
    fixture.componentRef.setInput('categoryOptions', categoryOptions);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('renders the amount on the card, which is the column the table pushed off-screen', async () => {
    const element = await setup(rowVm());

    expect(element.textContent).toContain('12,50');
  });

  it('takes the checkbox accessible name straight off the VM, like the table row does', async () => {
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

  it('gives every row-level target a 44px hit area', async () => {
    const element = await setup(rowVm({ transferId: 42 }));

    // The classes are the contract here: jsdom computes no layout, so the live 44px measurement is
    // the browser check on the ticket. What a unit test can hold is that no target ships without
    // the utility that grows it (TICKET-TXN-12).
    const checkboxTarget = element.querySelector('label') as HTMLLabelElement;
    expect(checkboxTarget.className).toContain('min-h-11');
    expect(checkboxTarget.className).toContain('min-w-11');

    for (const label of ['Unlink transfer', 'Edit transaction']) {
      const button = element.querySelector('[aria-label="' + label + '"]') as HTMLElement;
      expect(button.className).toContain('min-h-11');
      expect(button.className).toContain('min-w-11');
    }

    // The category picker is a target too, and `select-sm` is 32px — the card asks for the taller one.
    expect((element.querySelector('select') as HTMLSelectElement).className).toContain('min-h-11');
  });

  it('shows the likely-transfer and nullified badges when the VM flags them', async () => {
    const element = await setup(
      rowVm({ likelyTransfer: true, transaction: transaction({ nullified: true }) }),
    );

    expect(element.textContent).toContain('Likely transfer');
    expect(element.textContent).toContain('Nullified');
  });

  it('preselects the row category in the quick-set cell and relays a typed pick', async () => {
    const element = await setup(rowVm({ categoryId: '9' }));
    const picked: (number | undefined)[] = [];
    fixture.componentInstance.categoryChanged.subscribe((value) => picked.push(value));

    const select = element.querySelector('select') as HTMLSelectElement;
    expect(select.value).toBe('9');

    select.value = '7';
    select.dispatchEvent(new Event('change'));
    expect(picked).toEqual([7]);
  });

  it('replaces the picker with the transfer label on a linked row (TICKET-TRF-06)', async () => {
    const element = await setup(rowVm({ transferId: 7, transferLabel: 'Transfer · Savings' }));

    expect(element.textContent).toContain('Transfer · Savings');
    expect(element.textContent).not.toContain('Uncategorised');
    expect(element.querySelector('app-category-select-cell')).toBeNull();
  });

  it('emits selectionToggled, editRequested and unlinkRequested like the table row', async () => {
    const element = await setup(rowVm({ transferId: 42 }));
    let toggles = 0;
    let edits = 0;
    const unlinked: number[] = [];
    fixture.componentInstance.selectionToggled.subscribe(() => (toggles += 1));
    fixture.componentInstance.editRequested.subscribe(() => (edits += 1));
    fixture.componentInstance.unlinkRequested.subscribe((id) => unlinked.push(id));

    (element.querySelector('input[type="checkbox"]') as HTMLInputElement).click();
    (element.querySelector('[aria-label="Edit transaction"]') as HTMLElement).click();
    (element.querySelector('[aria-label="Unlink transfer"]') as HTMLElement).click();

    expect([toggles, edits, unlinked]).toEqual([1, 1, [42]]);
  });

  it('leaves the unlink button off a row that is not part of a transfer', async () => {
    const element = await setup(rowVm());

    expect(element.querySelector('[aria-label="Unlink transfer"]')).toBeNull();
  });
});

/**
 * The one thing a second presentation can quietly get wrong is dropping a field. This renders the
 * *same* VM through both components and asserts the card says everything the table row says
 * (TICKET-TXN-12) — so a field added to the row later fails here until the card carries it too.
 */
describe('TransactionCardComponent: the same row data as the table (TICKET-TXN-12)', () => {
  withCleanFormatSettings();

  const render = async (
    component: typeof TransactionRowComponent | typeof TransactionCardComponent,
    vm: TransactionRowVm,
  ): Promise<HTMLElement> => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [component],
      providers: [settingsProvider],
    }).compileComponents();

    const fixture = TestBed.createComponent(component);
    fixture.componentRef.setInput('row', vm);
    fixture.componentRef.setInput('categoryOptions', categoryOptions);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('renders every field the table row renders, for a plain row', async () => {
    const vm = rowVm({
      accountName: 'Joint account',
      transaction: transaction({ counterpartyName: 'Carrefour', amount: -84.31 }),
      categoryId: '7',
    });

    const row = await render(TransactionRowComponent, vm);
    const card = await render(TransactionCardComponent, vm);

    // Date, description, counterparty, account and amount — the five the review named.
    for (const fact of ['01/06/2026', 'CARREFOUR MARKET', 'Carrefour', 'Joint account', '84,31']) {
      expect(row.textContent, 'table row is missing ' + fact).toContain(fact);
      expect(card.textContent, 'card is missing ' + fact).toContain(fact);
    }

    // And the same interactive surface: a category picker on its current value, edit, no unlink.
    expect((card.querySelector('select') as HTMLSelectElement).value).toBe('7');
    expect(card.querySelector('[aria-label="Edit transaction"]')).not.toBeNull();
    expect(card.querySelector('[aria-label="Unlink transfer"]')).toBeNull();
  });

  it('renders every field the table row renders, for a flagged, linked row', async () => {
    const vm = rowVm({
      accountName: 'Savings',
      likelyTransfer: true,
      transferId: 42,
      transferLabel: 'Transfer · Checking',
      transaction: transaction({ nullified: true, amount: 250 }),
    });

    const row = await render(TransactionRowComponent, vm);
    const card = await render(TransactionCardComponent, vm);

    for (const fact of [
      'CARREFOUR MARKET',
      'Savings',
      'Likely transfer',
      'Nullified',
      'Transfer · Checking',
      '250,00',
    ]) {
      expect(row.textContent, 'table row is missing ' + fact).toContain(fact);
      expect(card.textContent, 'card is missing ' + fact).toContain(fact);
    }

    expect(card.querySelector('[aria-label="Unlink transfer"]')).not.toBeNull();
  });
});
