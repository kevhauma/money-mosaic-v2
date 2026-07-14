import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { FormControl, FormGroup } from '@angular/forms';
import { vi } from 'vitest';
import {
  TransactionsRepository,
  TransfersRepository,
  type Account,
  type Transaction,
} from '@/core/data-access';
import { AttributionOverrideFieldsetComponent } from './attribution-override-fieldset.component';

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
    mode: FormControl<string>;
    jointAccountId: FormControl<string>;
    reimbursementTransferId: FormControl<string>;
  }>;
  showJointAccountPicker: () => boolean;
  showReimbursementPicker: () => boolean;
};

describe('AttributionOverrideFieldsetComponent', () => {
  let fixture: ComponentFixture<AttributionOverrideFieldsetComponent>;
  let component: AttributionOverrideFieldsetComponent;
  const internals = (): Internals => component as unknown as Internals;

  const transfersRepository = { getAll: vi.fn().mockResolvedValue([]) };

  const setup = async (jointAccounts: Account[]): Promise<void> => {
    vi.clearAllMocks();
    transfersRepository.getAll.mockResolvedValue([]);

    await TestBed.configureTestingModule({
      imports: [AttributionOverrideFieldsetComponent],
      providers: [
        { provide: TransactionsRepository, useValue: { getAll: vi.fn().mockResolvedValue([]) } },
        { provide: TransfersRepository, useValue: transfersRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AttributionOverrideFieldsetComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('transaction', transaction());
    fixture.componentRef.setInput('jointAccounts', jointAccounts);
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('shows the joint-account picker only once shared is chosen and more than one joint account exists', async () => {
    await setup([jointAccount({ id: 1 }), jointAccount({ id: 2, name: 'Parent joint' })]);
    expect(internals().showJointAccountPicker()).toBe(false);

    internals().form.controls.mode.setValue('shared');
    fixture.detectChanges();

    expect(internals().showJointAccountPicker()).toBe(true);
  });

  it('does not show the joint-account picker for shared mode when only one joint account exists (auto-inferred)', async () => {
    await setup([jointAccount()]);

    internals().form.controls.mode.setValue('shared');
    fixture.detectChanges();

    expect(internals().showJointAccountPicker()).toBe(false);
  });

  it('shows the reimbursement-transfer picker only once shared is chosen', async () => {
    await setup([jointAccount()]);
    expect(internals().showReimbursementPicker()).toBe(false);

    internals().form.controls.mode.setValue('shared');
    fixture.detectChanges();

    expect(internals().showReimbursementPicker()).toBe(true);

    internals().form.controls.mode.setValue('personal');
    fixture.detectChanges();

    expect(internals().showReimbursementPicker()).toBe(false);
  });

  it('builds a personal override and clears any prior error', async () => {
    await setup([jointAccount()]);
    internals().form.controls.mode.setValue('personal');

    const result = component.buildOverride();

    expect(result).toEqual({ value: { mode: 'personal' } });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Select which joint account');
  });

  it('rejects shared mode with more than one joint account and no jointAccountId picked, surfacing an error', async () => {
    await setup([jointAccount({ id: 1 }), jointAccount({ id: 2, name: 'Parent joint' })]);
    internals().form.controls.mode.setValue('shared');

    const result = component.buildOverride();

    expect(result).toBeUndefined();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Select which joint account');
  });
});
