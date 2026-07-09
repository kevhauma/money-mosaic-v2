import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { FormArray, FormControl, FormGroup } from '@angular/forms';
import type { Account } from '@/core/data-access';
import { AccountFormComponent, type AccountFormValue } from './account-form.component';

type CoOwnerGroup = FormGroup<{
  name: FormControl<string>;
  ibans: FormArray<FormControl<string>>;
  sharePercent: FormControl<string>;
}>;

/** Protected surface we reach into for form/behaviour assertions. */
type Internals = {
  form: FormGroup<{
    name: FormControl<string>;
    type: FormControl<Account['type']>;
    iban: FormControl<string>;
    openingBalance: FormControl<number>;
    openingBalanceDate: FormControl<string>;
    color: FormControl<string>;
    icon: FormControl<string>;
    ownershipSharePercent: FormControl<string>;
    coOwners: FormArray<CoOwnerGroup>;
  }>;
  coOwnersArray: FormArray<CoOwnerGroup>;
  addCoOwner: () => void;
  removeCoOwner: (index: number) => void;
  addIban: (group: CoOwnerGroup) => void;
  removeIban: (group: CoOwnerGroup, index: number) => void;
  sharePlaceholder: () => string;
  submit: () => void;
};

describe('AccountFormComponent', () => {
  let component: AccountFormComponent;
  let fixture: ComponentFixture<AccountFormComponent>;

  const internals = (): Internals => component as unknown as Internals;

  const jointAccount = (overrides: Partial<Account> = {}): Account => ({
    id: 1,
    name: 'Joint',
    type: 'joint',
    currency: 'EUR',
    openingBalance: 1000,
    openingBalanceDate: '2026-01-01',
    color: '#7F77DD',
    icon: 'users',
    archived: false,
    ...overrides,
  });

  const setup = async (account: Account | null = null): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [AccountFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountFormComponent);
    component = fixture.componentInstance;
    if (account) {
      fixture.componentRef.setInput('account', account);
    }
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
  };

  it('should create', async () => {
    await setup();
    expect(component).toBeTruthy();
  });

  describe('ownership share (TICKET-ACC-02)', () => {
    it('shows the share control only when the account type is joint', async () => {
      await setup();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('My share');

      internals().form.controls.type.setValue('joint');
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain('My share');
    });

    it('maps a typed percentage to a stored fraction on save', async () => {
      await setup();
      internals().form.controls.name.setValue('Joint');
      internals().form.controls.type.setValue('joint');
      internals().form.controls.ownershipSharePercent.setValue('50');

      const emitted: AccountFormValue[] = [];
      component.saved.subscribe((value) => emitted.push(value));
      internals().submit();

      expect(emitted).toHaveLength(1);
      expect(emitted[0].ownershipShare).toBe(0.5);
    });

    it('hydrates a stored fraction back to its percentage on load', async () => {
      await setup(jointAccount({ ownershipShare: 0.33 }));

      expect(internals().form.controls.ownershipSharePercent.value).toBe('33');
    });

    it('leaves ownershipShare undefined when the field is left blank', async () => {
      await setup();
      internals().form.controls.name.setValue('Joint');
      internals().form.controls.type.setValue('joint');

      const emitted: AccountFormValue[] = [];
      component.saved.subscribe((value) => emitted.push(value));
      internals().submit();

      expect(emitted[0].ownershipShare).toBeUndefined();
    });

    it('rejects an out-of-range or non-numeric share', async () => {
      await setup();
      internals().form.controls.type.setValue('joint');
      const share = internals().form.controls.ownershipSharePercent;

      share.setValue('-1');
      expect(share.invalid).toBe(true);
      share.setValue('150');
      expect(share.invalid).toBe(true);
      share.setValue('abc');
      expect(share.invalid).toBe(true);
      share.setValue('50');
      expect(share.invalid).toBe(false);
    });

    it('clears the share (and co-owners) when switching the type away from joint', async () => {
      await setup(
        jointAccount({
          ownershipShare: 0.5,
          coOwners: [{ name: 'Partner', ibans: ['BE71096123456769'] }],
        }),
      );
      expect(internals().form.controls.ownershipSharePercent.value).toBe('50');
      expect(internals().coOwnersArray.length).toBe(1);

      internals().form.controls.type.setValue('checking');

      expect(internals().form.controls.ownershipSharePercent.value).toBe('');
      expect(internals().coOwnersArray.length).toBe(0);
    });

    it('never stores a share for a non-joint account', async () => {
      await setup();
      internals().form.controls.name.setValue('Checking');

      const emitted: AccountFormValue[] = [];
      component.saved.subscribe((value) => emitted.push(value));
      internals().submit();

      expect(emitted[0].ownershipShare).toBeUndefined();
    });

    it('recalculates the placeholder for 1/2/3 co-owners without clobbering a typed value', async () => {
      await setup();
      internals().form.controls.type.setValue('joint');

      expect(internals().sharePlaceholder()).toBe('50%');

      internals().addCoOwner();
      expect(internals().sharePlaceholder()).toBe('50%');

      internals().addCoOwner();
      expect(internals().sharePlaceholder()).toBe('33%');

      internals().addCoOwner();
      expect(internals().sharePlaceholder()).toBe('25%');

      internals().form.controls.ownershipSharePercent.setValue('60');
      internals().addCoOwner();

      expect(internals().form.controls.ownershipSharePercent.value).toBe('60');
    });
  });

  describe('co-owners (TICKET-ACC-03)', () => {
    it('adds and removes multiple co-owners, each with multiple IBANs', async () => {
      await setup();
      internals().form.controls.type.setValue('joint');

      internals().addCoOwner();
      internals().addCoOwner();
      expect(internals().coOwnersArray.length).toBe(2);

      const first = internals().coOwnersArray.at(0);
      internals().addIban(first);
      expect(first.controls.ibans.length).toBe(2);

      internals().removeIban(first, 1);
      expect(first.controls.ibans.length).toBe(1);

      internals().removeCoOwner(0);
      expect(internals().coOwnersArray.length).toBe(1);
    });

    it('validates each co-owner IBAN with the shared IBAN validator', async () => {
      await setup();
      internals().form.controls.type.setValue('joint');
      internals().addCoOwner();
      const ibanControl = internals().coOwnersArray.at(0).controls.ibans.at(0);

      ibanControl?.setValue('not-an-iban');
      expect(ibanControl?.invalid).toBe(true);

      ibanControl?.setValue('BE71096123456769');
      expect(ibanControl?.invalid).toBe(false);
    });

    it('blocks a co-owner with a blank name or zero valid IBANs', async () => {
      await setup();
      internals().form.controls.type.setValue('joint');
      internals().addCoOwner();
      const group = internals().coOwnersArray.at(0);

      expect(group.controls.name.invalid).toBe(true);
      expect(group.controls.ibans.invalid).toBe(true);

      group.controls.name.setValue('Partner');
      group.controls.ibans.at(0)?.setValue('BE71096123456769');

      expect(group.controls.name.invalid).toBe(false);
      expect(group.controls.ibans.invalid).toBe(false);
    });

    it('rejects a duplicate IBAN across co-owners', async () => {
      await setup();
      internals().form.controls.type.setValue('joint');
      internals().addCoOwner();
      internals().addCoOwner();

      internals().coOwnersArray.at(0).controls.ibans.at(0)?.setValue('BE71096123456769');
      internals().coOwnersArray.at(1).controls.ibans.at(0)?.setValue('BE71096123456769');

      expect(internals().form.hasError('duplicateIban')).toBe(true);
    });

    it("rejects a co-owner IBAN that collides with the account's own IBAN", async () => {
      await setup();
      internals().form.controls.type.setValue('joint');
      internals().form.controls.iban.setValue('BE71096123456769');
      internals().addCoOwner();
      internals().coOwnersArray.at(0).controls.ibans.at(0)?.setValue('BE71096123456769');

      expect(internals().form.hasError('duplicateIban')).toBe(true);
    });

    it('resolves distinct IBANs across co-owners without a duplicate error', async () => {
      await setup();
      internals().form.controls.type.setValue('joint');
      internals().addCoOwner();
      internals().addCoOwner();

      internals().coOwnersArray.at(0).controls.ibans.at(0)?.setValue('BE71096123456769');
      internals().coOwnersArray.at(1).controls.ibans.at(0)?.setValue('BE62510007547061');

      expect(internals().form.hasError('duplicateIban')).toBe(false);
    });

    it('clears co-owners when switching the type away from joint', async () => {
      await setup(jointAccount({ coOwners: [{ name: 'Partner', ibans: ['BE71096123456769'] }] }));
      expect(internals().coOwnersArray.length).toBe(1);

      internals().form.controls.type.setValue('savings');

      expect(internals().coOwnersArray.length).toBe(0);
    });

    it('round-trips co-owners through add -> hydrate', async () => {
      await setup(
        jointAccount({
          coOwners: [
            { name: 'Partner', ibans: ['BE71096123456769', 'BE68539007547034'], share: 0.5 },
            { name: 'Parent', ibans: ['BE62510007547061'] },
          ],
        }),
      );

      expect(internals().coOwnersArray.length).toBe(2);
      expect(internals().coOwnersArray.at(0).controls.name.value).toBe('Partner');
      expect(internals().coOwnersArray.at(0).controls.ibans.length).toBe(2);
      expect(internals().coOwnersArray.at(0).controls.sharePercent.value).toBe('50');
      expect(internals().coOwnersArray.at(1).controls.name.value).toBe('Parent');
    });

    it('emits coOwners on save, dropping blank IBAN rows', async () => {
      await setup();
      internals().form.controls.name.setValue('Joint');
      internals().form.controls.type.setValue('joint');
      internals().addCoOwner();
      const group = internals().coOwnersArray.at(0);
      group.controls.name.setValue('Partner');
      group.controls.ibans.at(0)?.setValue('BE71096123456769');
      internals().addIban(group);

      const emitted: AccountFormValue[] = [];
      component.saved.subscribe((value) => emitted.push(value));
      internals().submit();

      expect(emitted[0].coOwners).toEqual([{ name: 'Partner', ibans: ['BE71096123456769'] }]);
    });

    it('leaves coOwners undefined for a non-joint account', async () => {
      await setup();
      internals().form.controls.name.setValue('Checking');

      const emitted: AccountFormValue[] = [];
      component.saved.subscribe((value) => emitted.push(value));
      internals().submit();

      expect(emitted[0].coOwners).toBeUndefined();
    });
  });
});
