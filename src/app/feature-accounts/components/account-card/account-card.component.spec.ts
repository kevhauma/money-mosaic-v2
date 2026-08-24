import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import type { Account } from '@/core/data-access';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import type { AccountCardVm } from '../../account-card-vm';
import { lastImportStatus } from '../../last-import-status';
import { AccountCardComponent } from './account-card.component';

/** Fixed instant, so "today" and "40 days ago" are arithmetic rather than a frozen clock. */
const NOW = '2026-08-24T12:00:00.000Z';

const account = (overrides: Partial<Account> = {}): Account => ({
  id: 1,
  name: 'Checking',
  type: 'checking',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2026-01-01',
  color: '#7F77DD',
  icon: 'wallet',
  archived: false,
  ...overrides,
});

const baseVm = (overrides: Partial<AccountCardVm> = {}): AccountCardVm => ({
  account: account(),
  balance: 100,
  hasShare: false,
  shareDisplay: 0,
  isFirst: false,
  isLast: false,
  iconName: 'accountWallet',
  ibanTail: null,
  // Imported today by default, so the card's "last import" line is the unmarked one and the
  // existing cases below stay about what they were about (TICKET-ACC-13).
  lastImport: lastImportStatus(NOW, NOW),
  ...overrides,
});

describe('AccountCardComponent', () => {
  let fixture: ComponentFixture<AccountCardComponent>;

  const setup = async (vm: AccountCardVm, dataReady = true): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [AccountCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(AccountCardComponent);
    fixture.componentRef.setInput('vm', vm);
    fixture.componentRef.setInput('dataReady', dataReady);
    fixture.detectChanges();
  };

  it('renders the account name, type badge, and balance once data is ready', async () => {
    await setup(baseVm({ account: account({ name: 'Savings', type: 'savings' }) }));

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Savings');
    expect(text).toContain('savings');
    expect(fixture.nativeElement.querySelector('.skeleton')).toBeNull();
  });

  it('shows a skeleton placeholder instead of the balance while data is not ready', async () => {
    await setup(baseVm(), false);

    expect(fixture.nativeElement.querySelector('.skeleton')).not.toBeNull();
  });

  it('hides the "Your share" line when hasShare is false', async () => {
    await setup(baseVm({ hasShare: false }));
    expect(fixture.nativeElement.textContent).not.toContain('Your share');
  });

  it('shows the "Your share" line when hasShare is true', async () => {
    await setup(baseVm({ hasShare: true, shareDisplay: 250 }));
    expect(fixture.nativeElement.textContent).toContain('Your share');
  });

  it('hides the IBAN tail when absent', async () => {
    await setup(baseVm({ ibanTail: null }));
    expect(fixture.nativeElement.textContent).not.toContain('····');
  });

  it('shows the IBAN tail when present', async () => {
    await setup(baseVm({ ibanTail: '1234' }));
    expect(fixture.nativeElement.textContent).toContain('···· 1234');
  });

  it('disables move-up when isFirst and move-down when isLast', async () => {
    await setup(baseVm({ isFirst: true, isLast: false }));
    const [upButton, downButton] = fixture.nativeElement.querySelectorAll('button');
    expect(upButton.disabled).toBe(true);
    expect(downButton.disabled).toBe(false);
  });

  it('emits edit/archive/delete/moveUp/moveDown without taking an account argument', async () => {
    await setup(baseVm());
    const edit = vi.fn();
    const archive = vi.fn();
    const del = vi.fn();
    const moveUp = vi.fn();
    const moveDown = vi.fn();
    fixture.componentInstance.edit.subscribe(edit);
    fixture.componentInstance.archive.subscribe(archive);
    fixture.componentInstance.delete.subscribe(del);
    fixture.componentInstance.moveUp.subscribe(moveUp);
    fixture.componentInstance.moveDown.subscribe(moveDown);

    const [upButton, downButton] = fixture.nativeElement.querySelectorAll('button');
    upButton.click();
    downButton.click();

    expect(moveUp).toHaveBeenCalledTimes(1);
    expect(moveDown).toHaveBeenCalledTimes(1);
  });

  it('shows "Unarchive" for an already-archived account', async () => {
    await setup(baseVm({ account: account({ archived: true }) }));
    expect(fixture.nativeElement.textContent).toContain('Unarchive');
  });
});

/** TICKET-ACC-13 — how current the balance is, stated on the card and marked when it is not. */
describe('AccountCardComponent: last import line (TICKET-ACC-13)', () => {
  withCleanFormatSettings();

  const render = async (vm: AccountCardVm): Promise<HTMLElement> => {
    await TestBed.configureTestingModule({
      imports: [AccountCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    const fixture = TestBed.createComponent(AccountCardComponent);
    fixture.componentRef.setInput('vm', vm);
    fixture.componentRef.setInput('dataReady', true);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('states the date plainly for a recently imported account', async () => {
    const card = await render(baseVm({ lastImport: lastImportStatus(NOW, NOW) }));

    expect(card.textContent).toContain('Last import 24/08/2026');
    expect(card.querySelector('mm-badge[color="warning"]')).toBeNull();
  });

  it('marks an account that has never been imported into', async () => {
    const card = await render(baseVm({ lastImport: lastImportStatus(undefined, NOW) }));

    expect(card.textContent).toContain('Never imported');
    expect(card.querySelector('mm-badge[color="warning"]')).not.toBeNull();
  });

  it('says nothing at all while the batches are still loading', async () => {
    const card = await render(baseVm({ lastImport: null }));

    // Not "Never imported": an un-hydrated store and an account with no imports look identical
    // from here, and only one of them is a fact (TICKET-TRF-06's lesson, applied up front).
    expect(card.textContent).not.toContain('Never imported');
    expect(card.textContent).not.toContain('Last import');
    expect(card.querySelector('mm-badge[color="warning"]')).toBeNull();
  });

  it('marks a stale account, so one behind three current ones is visible', async () => {
    const staleAt = new Date(Date.parse(NOW) - 45 * 24 * 60 * 60 * 1000).toISOString();
    const card = await render(baseVm({ lastImport: lastImportStatus(staleAt, NOW) }));

    expect(card.textContent).toContain('45 days ago');
    expect(card.querySelector('mm-badge[color="warning"]')).not.toBeNull();
  });
});
