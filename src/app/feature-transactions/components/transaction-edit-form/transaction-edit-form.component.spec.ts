import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { FormControl, FormGroup } from '@angular/forms';
import { vi } from 'vitest';
import {
  AccountsRepository,
  CategoriesRepository,
  RulesRepository,
  TransactionsRepository,
  TransfersRepository,
  type Account,
  type Category,
  type Transaction,
} from '@/core/data-access';
import { AccountsStore, CategoriesStore } from '@/core/state';
import type { AttributionOverrideFieldsetComponent } from '../attribution-override-fieldset/attribution-override-fieldset.component';
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

const jointAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 1,
  name: 'Joint',
  type: 'joint',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#fff',
  icon: 'users',
  archived: false,
  ownershipShare: 0.5,
  ...overrides,
});

/** Protected surface we reach into for attribution-control assertions. */
type Internals = {
  form: FormGroup<{
    categoryId: FormControl<string>;
    notes: FormControl<string>;
    alwaysCategorise: FormControl<boolean>;
  }>;
  attributionFieldset: () => AttributionOverrideFieldsetComponent | undefined;
};

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

describe('TransactionEditFormComponent: manual attribution override (TICKET-TXN-03)', () => {
  let fixture: ComponentFixture<TransactionEditFormComponent>;
  let component: TransactionEditFormComponent;
  const internals = (): Internals => component as unknown as Internals;

  const accountsRepository = { getAll: vi.fn().mockResolvedValue([]) };
  const transfersRepository = { getAll: vi.fn().mockResolvedValue([]) };

  const setup = async (accounts: Account[]): Promise<void> => {
    vi.clearAllMocks();
    accountsRepository.getAll.mockResolvedValue(accounts);
    transfersRepository.getAll.mockResolvedValue([]);

    await TestBed.configureTestingModule({
      imports: [TransactionEditFormComponent],
      providers: [
        { provide: TransactionsRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
        { provide: CategoriesRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
        { provide: RulesRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
        { provide: AccountsRepository, useValue: accountsRepository },
        { provide: TransfersRepository, useValue: transfersRepository },
      ],
    }).compileComponents();

    await TestBed.inject(AccountsStore).hydrate();

    fixture = TestBed.createComponent(TransactionEditFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('transaction', transaction());
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('hides the attribution section entirely when there are no joint accounts', async () => {
    await setup([]);
    expect(fixture.nativeElement.textContent).not.toContain('Attribution');
  });

  it('shows the attribution mode picker once a joint account exists', async () => {
    await setup([jointAccount()]);
    expect(fixture.nativeElement.textContent).toContain('Attribution');
  });

  it('wires the fieldset with this transaction and its joint accounts', async () => {
    await setup([jointAccount({ id: 1 }), jointAccount({ id: 2, name: 'Parent joint' })]);
    const fieldset = internals().attributionFieldset();

    expect(fieldset).toBeDefined();
    expect(
      (fieldset as unknown as { jointAccounts: () => Account[] }).jointAccounts(),
    ).toHaveLength(2);
  });

  it('emits attributionOverride on save and leaves categoryId untouched', async () => {
    await setup([jointAccount()]);
    const fieldset = internals().attributionFieldset() as unknown as {
      form: FormGroup<{ mode: FormControl<string> }>;
    };
    fieldset.form.controls.mode.setValue('personal');

    const emitted: { attributionOverride?: Transaction['attributionOverride'] }[] = [];
    component.saved.subscribe((result) => emitted.push(result));
    await (component as unknown as { submit: () => Promise<void> }).submit();

    expect(emitted).toHaveLength(1);
    expect(emitted[0].attributionOverride).toEqual({ mode: 'personal' });
  });

  it('rejects saving shared mode with more than one joint account and no jointAccountId picked, surfacing an error', async () => {
    await setup([jointAccount({ id: 1 }), jointAccount({ id: 2, name: 'Parent joint' })]);
    const fieldset = internals().attributionFieldset() as unknown as {
      form: FormGroup<{ mode: FormControl<string> }>;
    };
    fieldset.form.controls.mode.setValue('shared');

    const emitted: unknown[] = [];
    component.saved.subscribe((result) => emitted.push(result));
    await (component as unknown as { submit: () => Promise<void> }).submit();

    expect(emitted).toHaveLength(0);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Select which joint account');
  });
});

type NullifyInternals = {
  form: FormGroup<{
    categoryId: FormControl<string>;
    notes: FormControl<string>;
    alwaysCategorise: FormControl<boolean>;
    attributionMode: FormControl<string>;
    attributionJointAccountId: FormControl<string>;
    attributionReimbursementTransferId: FormControl<string>;
    nullified: FormControl<boolean>;
  }>;
};

describe('TransactionEditFormComponent: nullify toggle (TICKET-TXN-04)', () => {
  let fixture: ComponentFixture<TransactionEditFormComponent>;
  let component: TransactionEditFormComponent;
  const internals = (): NullifyInternals => component as unknown as NullifyInternals;

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
    component = fixture.componentInstance;
  });

  it('shows the toggle, unconditionally, for a plain non-transfer transaction', async () => {
    fixture.componentRef.setInput('transaction', transaction());
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Exclude from income/expense');
  });

  it('hides the toggle for a transaction linked as a transfer', async () => {
    fixture.componentRef.setInput('transaction', transaction({ transferId: 42 }));
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).not.toContain('Exclude from income/expense');
  });

  it('emits nullified on save without touching categoryId', async () => {
    fixture.componentRef.setInput('transaction', transaction({ categoryId: 5 }));
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    fixture.detectChanges();

    internals().form.controls.nullified.setValue(true);

    const emitted: { nullified?: boolean; categoryId?: number }[] = [];
    component.saved.subscribe((result) => emitted.push(result));
    await (component as unknown as { submit: () => Promise<void> }).submit();

    expect(emitted).toHaveLength(1);
    expect(emitted[0].nullified).toBe(true);
    expect(emitted[0].categoryId).toBeUndefined();
  });

  it('pre-fills the toggle from an already-nullified transaction', async () => {
    fixture.componentRef.setInput('transaction', transaction({ nullified: true }));
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(internals().form.controls.nullified.value).toBe(true);
  });
});

describe('TransactionEditFormComponent: delete', () => {
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

  it('requires confirmation before emitting deleteRequested and closing the popup', async () => {
    fixture.componentRef.setInput('transaction', transaction());
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    fixture.detectChanges();

    let deleteCount = 0;
    fixture.componentInstance.deleteRequested.subscribe(() => deleteCount++);

    const nativeElement = fixture.nativeElement as HTMLElement;
    [...nativeElement.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Delete')
      ?.click();
    fixture.detectChanges();
    await fixture.whenStable();

    // Clicking the popup's own Delete button only opens the confirm dialog — nothing emitted yet.
    expect(deleteCount).toBe(0);
    expect(fixture.componentInstance.open()).toBe(true);
    expect(nativeElement.textContent).toContain('permanently deletes this transaction');

    [...nativeElement.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Delete permanently')
      ?.click();

    expect(deleteCount).toBe(1);
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('warns that the linked transfer will also be removed for a transfer leg', async () => {
    fixture.componentRef.setInput('transaction', transaction({ transferId: 42 }));
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;
    [...nativeElement.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Delete')
      ?.click();
    fixture.detectChanges();

    expect(nativeElement.textContent).toContain('Its linked transfer will also be removed');
  });
});

describe('TransactionEditFormComponent: applicability-aware category picker (TICKET-CAT-11)', () => {
  let fixture: ComponentFixture<TransactionEditFormComponent>;

  const category = (id: number, name: string, window: Partial<Category> = {}): Category => ({
    id,
    name,
    kind: 'expense',
    color: '#7F77DD',
    icon: 'tag',
    archived: false,
    isSystem: false,
    sortOrder: id,
    ...window,
  });

  const setupWith = async (categories: Category[], edited: Transaction): Promise<HTMLElement> => {
    await TestBed.configureTestingModule({
      imports: [TransactionEditFormComponent],
      providers: [
        { provide: TransactionsRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
        {
          provide: CategoriesRepository,
          useValue: { getAll: vi.fn().mockResolvedValue(categories) },
        },
        { provide: RulesRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionEditFormComponent);
    await TestBed.inject(CategoriesStore).hydrate();
    fixture.componentRef.setInput('transaction', edited);
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    fixture.detectChanges();

    return fixture.nativeElement as HTMLElement;
  };

  const optionLabels = (host: HTMLElement): string[] =>
    [...host.querySelectorAll('mm-select option')].map(
      (option) => option.textContent?.trim() ?? '',
    );

  it('offers a windowless category to a transaction from any year', async () => {
    const host = await setupWith(
      [category(7, 'Groceries')],
      transaction({ bookingDate: '2020-01-15' }),
    );

    expect(optionLabels(host)).toEqual(['Uncategorised', 'Groceries']);
  });

  it('hides a category whose window closed before the booking date', async () => {
    const host = await setupWith(
      [category(7, 'Groceries'), category(9, 'Rent', { activeUntil: '2023-06-30' })],
      transaction({ bookingDate: '2026-07-01' }),
    );

    expect(optionLabels(host)).toEqual(['Uncategorised', 'Groceries']);
  });

  it('still offers that category to a transaction from inside its own window', async () => {
    const host = await setupWith(
      [category(7, 'Groceries'), category(9, 'Rent', { activeUntil: '2023-06-30' })],
      transaction({ bookingDate: '2022-11-01' }),
    );

    expect(optionLabels(host)).toEqual(['Uncategorised', 'Groceries', 'Rent']);
  });

  it('keeps the assigned out-of-window category, marked "(ended)", rather than dropping it', async () => {
    const host = await setupWith(
      [category(7, 'Groceries'), category(9, 'Rent', { activeUntil: '2023-06-30' })],
      transaction({ bookingDate: '2026-07-01', categoryId: 9 }),
    );

    expect(optionLabels(host)).toEqual(['Uncategorised', 'Groceries', 'Rent (ended)']);
    // The control's value stays selectable, which is the whole point of keeping it.
    expect(host.querySelector<HTMLSelectElement>('mm-select select')?.value).toBe('9');
  });

  it('prefixes a grouped category exactly as before', async () => {
    const host = await setupWith(
      [category(7, 'Groceries', { group: 'Living' })],
      transaction({ bookingDate: '2026-07-01' }),
    );

    expect(optionLabels(host)).toEqual(['Uncategorised', 'Living · Groceries']);
  });
});
