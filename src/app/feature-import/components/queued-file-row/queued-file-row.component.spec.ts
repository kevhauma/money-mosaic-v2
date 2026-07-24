import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { Account } from '@/core/data-access';
import type {
  PendingAccountDraft,
  QueuedImportFile,
} from '../import-select-step/import-select-step.component';
import { QueuedFileRowComponent } from './queued-file-row.component';

const account = (overrides: Partial<Account> = {}): Account => ({
  id: 1,
  name: 'Everyday Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#7F77DD',
  icon: 'wallet',
  archived: false,
  ...overrides,
});

const row = (overrides: Partial<QueuedImportFile> = {}): QueuedImportFile => ({
  file: new File(['a'], 'bank.csv'),
  accountId: null,
  autoDetected: false,
  pendingDraftId: null,
  detectedIban: null,
  ...overrides,
});

const draft = (overrides: Partial<PendingAccountDraft> = {}): PendingAccountDraft => ({
  id: 'draft-1',
  ownerFile: new File(['a'], 'owner.csv'),
  name: 'New Account',
  iban: '',
  type: 'checking',
  ...overrides,
});

describe('QueuedFileRowComponent (TICKET-IMP-08)', () => {
  let fixture: ComponentFixture<QueuedFileRowComponent>;

  const setup = async (overrides: {
    row?: QueuedImportFile;
    accounts?: Account[];
    pendingDrafts?: PendingAccountDraft[];
    mode?: 'owner' | 'empty-nudge' | 'select';
  }): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [QueuedFileRowComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(QueuedFileRowComponent);
    fixture.componentRef.setInput('row', overrides.row ?? row());
    fixture.componentRef.setInput('accounts', overrides.accounts ?? [account()]);
    fixture.componentRef.setInput('pendingDrafts', overrides.pendingDrafts ?? []);
    fixture.componentRef.setInput('mode', overrides.mode ?? 'select');
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('renders the account select in "select" mode', async () => {
    await setup({ mode: 'select' });
    expect(fixture.nativeElement.querySelector('select')).toBeTruthy();
  });

  it('renders the draft editor in "owner" mode', async () => {
    const theDraft = draft();
    await setup({
      mode: 'owner',
      row: row({ pendingDraftId: theDraft.id }),
      pendingDrafts: [theDraft],
    });
    expect(fixture.nativeElement.querySelector('app-account-draft-editor')).toBeTruthy();
  });

  it('renders the empty-accounts nudge in "empty-nudge" mode', async () => {
    await setup({ mode: 'empty-nudge' });
    expect(fixture.nativeElement.textContent).toContain('No accounts yet');
  });

  it('lists a pending draft as a selectable option, labelled by its owner file', async () => {
    const theDraft = draft({ ownerFile: new File(['a'], 'owner-file.csv') });
    await setup({ mode: 'select', pendingDrafts: [theDraft] });

    const options = [...fixture.nativeElement.querySelectorAll('option')];
    const draftOption = options.find((o: HTMLOptionElement) => o.value === `draft:${theDraft.id}`);
    expect(draftOption?.textContent).toContain('owner-file.csv');
  });

  it('emits accountChange with the selected value', async () => {
    await setup({ mode: 'select' });
    const emitSpy = vi.fn();
    fixture.componentInstance.accountChange.subscribe(emitSpy);
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;

    select.value = '1';
    select.dispatchEvent(new Event('change'));

    expect(emitSpy).toHaveBeenCalledWith('1');
  });

  it('shows the Auto-detected badge when the row was auto-detected', async () => {
    await setup({ row: row({ accountId: 1, autoDetected: true }) });
    expect(fixture.nativeElement.textContent).toContain('Auto-detected');
  });

  it('emits removed when the remove button is clicked', async () => {
    await setup({});
    const emitSpy = vi.fn();
    fixture.componentInstance.removed.subscribe(emitSpy);
    const removeButton = fixture.nativeElement.querySelector(
      'button[aria-label="Remove file"]',
    ) as HTMLButtonElement;

    removeButton.click();

    expect(emitSpy).toHaveBeenCalled();
  });

  it('emits newAccountRequested when "+ New account" is clicked', async () => {
    await setup({ mode: 'select' });
    const emitSpy = vi.fn();
    fixture.componentInstance.newAccountRequested.subscribe(emitSpy);
    const addButton = [...fixture.nativeElement.querySelectorAll('button')].find(
      (b: HTMLButtonElement) => b.textContent?.includes('New account'),
    ) as HTMLButtonElement;

    addButton.click();

    expect(emitSpy).toHaveBeenCalled();
  });
});
