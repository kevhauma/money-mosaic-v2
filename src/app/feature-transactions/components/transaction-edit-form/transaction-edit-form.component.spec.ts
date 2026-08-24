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
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
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
  /** The delete confirm's own open model (TICKET-UI-30) — the edit dialog's is the public `open`. */
  deleteConfirmOpen: () => boolean;
  /** Spans the detour through the delete confirm; what seeds both forms (TICKET-UI-30). */
  editSessionOpen: () => boolean;
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

/**
 * TICKET-UI-30 rewrote this flow: the confirm used to open *on top of* a still-live edit dialog,
 * whose un-dimmed "Save changes" stayed clickable behind it. The edit dialog now closes first, so
 * exactly one `showModal()` dialog is open at a time — which is what gives the focus trap, the
 * backdrop and Escape a single owner — and Cancel or Escape brings the edit dialog back with the
 * form untouched.
 */
describe('TransactionEditFormComponent: delete', () => {
  // The confirm now quotes the row's date and amount, which are locale-formatted.
  withCleanFormatSettings();

  let fixture: ComponentFixture<TransactionEditFormComponent>;

  /** The rendered button carrying exactly this label, or `undefined` when it isn't on screen. */
  const buttonLabelled = (label: string): HTMLButtonElement | undefined =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === label,
    );

  const openForm = async (overrides: Partial<Transaction> = {}): Promise<void> => {
    fixture.componentRef.setInput('transaction', transaction(overrides));
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    fixture.detectChanges();
  };

  /** Both dialogs' open models at once — the invariant is that they are never both `true`. */
  const openStates = (): { edit: boolean; confirm: boolean } => ({
    edit: fixture.componentInstance.open(),
    confirm: (fixture.componentInstance as unknown as Internals).deleteConfirmOpen(),
  });

  const openDeleteConfirm = async (): Promise<void> => {
    buttonLabelled('Delete')?.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

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

  it('requires confirmation before emitting deleteRequested', async () => {
    await openForm();

    let deleteCount = 0;
    fixture.componentInstance.deleteRequested.subscribe(() => deleteCount++);

    await openDeleteConfirm();

    // Clicking the popup's own Delete button only opens the confirm dialog — nothing emitted yet.
    expect(deleteCount).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('permanently deletes this transaction');

    buttonLabelled('Delete permanently')?.click();
    fixture.detectChanges();

    expect(deleteCount).toBe(1);
    expect(fixture.componentInstance.open()).toBe(false);
  });

  it('never has both dialogs open at once, so the edit actions go inert (TICKET-UI-30)', async () => {
    await openForm();
    const [editDialog, confirmDialog] = [
      ...(fixture.nativeElement as HTMLElement).querySelectorAll('dialog'),
    ];
    expect(editDialog.contains(buttonLabelled('Save changes') ?? null)).toBe(true);
    expect(openStates()).toEqual({ edit: true, confirm: false });

    await openDeleteConfirm();

    // The defect was both being open together: the un-dimmed "Save changes" stayed clickable
    // behind the confirm, two competing primary actions on screen, and no telling which dialog
    // Escape or a click would reach. `mm-modal` leaves its `<dialog>` in the DOM and calls
    // `close()`, so it is the closed dialog — not a removed subtree — that makes the button
    // unreachable to click and to Tab, which is why this asserts open-state rather than presence.
    // jsdom implements neither `showModal()` nor top-layer inertness, so the component's own two
    // open models are as far as this can be taken here; the live check covers the rest.
    expect(confirmDialog.contains(buttonLabelled('Delete permanently') ?? null)).toBe(true);
    expect(openStates()).toEqual({ edit: false, confirm: true });
  });

  it('names the transaction by date and amount, not by description alone (TICKET-UI-30)', async () => {
    await openForm();
    await openDeleteConfirm();

    // "Supermarket" alone identified eight rows in the seeded data — the user could not tell which
    // one they were about to lose.
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('01/07/2026');
    expect(text).toContain('10,00');
    expect(text).toContain('Carrefour Market');
  });

  /** The confirm's own Cancel — clicked through the template, so the `(openChange)` binding this
   * flow depends on is part of what the test exercises. Both dialogs render a "Cancel", which is
   * why the lookup is scoped to the confirm's own `<dialog>`. */
  const dismissConfirm = async (): Promise<void> => {
    const confirmDialog = [...(fixture.nativeElement as HTMLElement).querySelectorAll('dialog')][1];
    [...confirmDialog.querySelectorAll('button')]
      .find((button) => button.textContent?.trim() === 'Cancel')
      ?.click();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('returns to the edit dialog with unsaved edits intact when the confirm is dismissed', async () => {
    await openForm();
    const form = (fixture.componentInstance as unknown as Internals).form;
    form.controls.notes.setValue('half-written note');

    await openDeleteConfirm();
    expect(openStates()).toEqual({ edit: false, confirm: true });

    // Cancel and Escape are the same event to this component: the confirm closes itself, emitting
    // `openChange(false)` without ever emitting `confirmed`.
    await dismissConfirm();

    expect(openStates()).toEqual({ edit: true, confirm: false });
    // The reopen must not run `resetForm()` — that would silently discard the note.
    expect(form.controls.notes.value).toBe('half-written note');
  });

  it('holds the edit session open across the detour, so no child re-seeds either', async () => {
    await openForm();
    const internals = fixture.componentInstance as unknown as Internals;

    await openDeleteConfirm();

    // The subtle half of the fix: `app-attribution-override-fieldset` is mounted outside the
    // dialog's own `@if` and reseeds on every `false → true` of its `open` input, so binding it to
    // the raw dialog state would discard an unsaved attribution pick on the way back while leaving
    // `notes` — which this component seeds itself — looking fine. Both now read the session.
    expect(internals.editSessionOpen()).toBe(true);
    expect(fixture.componentInstance.open()).toBe(false);

    await dismissConfirm();
    expect(internals.editSessionOpen()).toBe(true);
  });

  it('does not reopen the edit dialog once the delete went through', async () => {
    await openForm();
    await openDeleteConfirm();

    buttonLabelled('Delete permanently')?.click();
    await fixture.whenStable();
    fixture.detectChanges();

    // `confirmed` fires before the dialog closes itself, so the same `openChange(false)` must not be
    // read as a dismissal — the row is gone, there is nothing to go back to.
    expect(openStates()).toEqual({ edit: false, confirm: false });
    expect((fixture.componentInstance as unknown as Internals).editSessionOpen()).toBe(false);
  });

  it('warns that the linked transfer will also be removed for a transfer leg', async () => {
    await openForm({ transferId: 42 });
    await openDeleteConfirm();

    expect(fixture.nativeElement.textContent).toContain('Its linked transfer will also be removed');
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
