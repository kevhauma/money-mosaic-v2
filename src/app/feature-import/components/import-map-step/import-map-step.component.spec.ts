import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { CsvImportService } from '@/core/import';
import { MappingProfilesStore } from '../../mapping-profiles.store';
import { ImportMapStepComponent, type ColumnFieldKey } from './import-map-step.component';

/** Protected surface we reach into for guided-flow assertions (TICKET-IMP-07). */
type Internals = {
  activeFieldKey: () => ColumnFieldKey | null;
  resolvedSamples: () => Partial<Record<ColumnFieldKey, string>>;
  duplicateWarnings: () => Partial<Record<ColumnFieldKey, string>>;
  invalidFieldLabels: () => string[];
  controlFor: (key: ColumnFieldKey) => { value: string; invalid: boolean; touched: boolean };
  openField: (key: ColumnFieldKey) => void;
  advanceFrom: (key: ColumnFieldKey) => void;
  form: {
    patchValue: (value: Record<string, unknown>) => void;
  };
};

const csvFile = (): File =>
  new File(['Date;Desc;Amount\n14/07/2026;Coffee;-3.50'], 'a.csv', { type: 'text/csv' });

describe('ImportMapStepComponent: guided mapper feedback (TICKET-IMP-07)', () => {
  let fixture: ComponentFixture<ImportMapStepComponent>;

  const detectHeaders = vi.fn().mockResolvedValue([]);
  const previewRawRows = vi.fn().mockResolvedValue([
    ['Date', 'Desc', 'Amount'],
    ['14/07/2026', 'Coffee', '-3.50'],
  ]);
  const detectTemplateForFile = vi.fn().mockResolvedValue(undefined);
  const findForBankAndAccount = vi.fn().mockReturnValue(undefined);

  const setup = async (): Promise<void> => {
    vi.clearAllMocks();
    detectHeaders.mockResolvedValue([]);
    previewRawRows.mockResolvedValue([
      ['Date', 'Desc', 'Amount'],
      ['14/07/2026', 'Coffee', '-3.50'],
    ]);
    detectTemplateForFile.mockResolvedValue(undefined);
    findForBankAndAccount.mockReturnValue(undefined);

    await TestBed.configureTestingModule({
      imports: [ImportMapStepComponent],
      providers: [
        { provide: CsvImportService, useValue: { detectHeaders, previewRawRows } },
        {
          provide: MappingProfilesStore,
          useValue: { detectTemplateForFile, findForBankAndAccount },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportMapStepComponent);
    fixture.componentRef.setInput('file', csvFile());
    fixture.componentRef.setInput('accountId', 1);
    await fixture.whenStable();
  };

  const internals = (): Internals => fixture.componentInstance as unknown as Internals;

  it('starts the guided flow with the date field active', async () => {
    await setup();
    expect(internals().activeFieldKey()).toBe('date');
  });

  it('advanceFrom moves to the next field once the current one is valid', async () => {
    await setup();
    internals().form.patchValue({ date: 'Date' });
    await fixture.whenStable();

    internals().advanceFrom('date');

    expect(internals().activeFieldKey()).toBe('description');
  });

  it('advanceFrom is a no-op on a required field left empty', async () => {
    await setup();

    internals().advanceFrom('date');

    expect(internals().activeFieldKey()).toBe('date');
  });

  it('advanceFrom lets an empty optional field through ("Skip")', async () => {
    await setup();
    internals().form.patchValue({ date: 'Date', description: 'Desc' });
    await fixture.whenStable();
    internals().advanceFrom('date');
    internals().advanceFrom('description');
    expect(internals().activeFieldKey()).toBe('amount');

    internals().advanceFrom('amount'); // optional, left empty

    expect(internals().activeFieldKey()).toBe('debit');
  });

  it('the last field advances the flow to its end (nothing left active)', async () => {
    await setup();
    internals().form.patchValue({ date: 'Date', description: 'Desc' });
    await fixture.whenStable();

    internals().advanceFrom('balance');

    expect(internals().activeFieldKey()).toBe(null);
  });

  describe('resolvedSamples', () => {
    it('is empty for an unmapped field', async () => {
      await setup();
      expect(internals().resolvedSamples().date).toBeUndefined();
    });

    it('reflects the first data row for the currently-selected column', async () => {
      await setup();
      internals().form.patchValue({ date: 'Date' });
      await fixture.whenStable();

      expect(internals().resolvedSamples().date).toBe('14/07/2026');
    });

    it('updates when the selection changes', async () => {
      await setup();
      internals().form.patchValue({ date: 'Date' });
      await fixture.whenStable();
      expect(internals().resolvedSamples().date).toBe('14/07/2026');

      internals().form.patchValue({ date: 'Desc' });
      await fixture.whenStable();

      expect(internals().resolvedSamples().date).toBe('Coffee');
    });
  });

  describe('required-field error state', () => {
    it('is not shown before the field has been touched', async () => {
      await setup();
      expect(internals().controlFor('date').touched).toBe(false);
    });

    it('appears once the field is left empty-and-touched', async () => {
      await setup();

      internals().openField('description'); // leaving 'date' marks it touched

      expect(internals().controlFor('date').touched).toBe(true);
      expect(internals().controlFor('date').invalid).toBe(true);
    });

    it('clears once the field is filled', async () => {
      await setup();
      internals().openField('description');
      expect(internals().controlFor('date').invalid).toBe(true);

      internals().form.patchValue({ date: 'Date' });
      await fixture.whenStable();

      expect(internals().controlFor('date').invalid).toBe(false);
    });
  });

  describe('duplicate-column warning', () => {
    it('flags both fields once they share a source column', async () => {
      await setup();
      internals().form.patchValue({ date: 'Date', balance: 'Date' });
      await fixture.whenStable();

      expect(internals().duplicateWarnings().date).toContain('Running balance');
      expect(internals().duplicateWarnings().balance).toContain('Date');
    });

    it('clears once the fields no longer share a column', async () => {
      await setup();
      internals().form.patchValue({ date: 'Date', balance: 'Date' });
      await fixture.whenStable();

      internals().form.patchValue({ balance: 'Amount' });
      await fixture.whenStable();

      expect(internals().duplicateWarnings().date).toBeUndefined();
      expect(internals().duplicateWarnings().balance).toBeUndefined();
    });
  });

  it('opening a collapsed field for edit preserves the values already chosen for other fields', async () => {
    await setup();
    internals().form.patchValue({ date: 'Date', description: 'Desc' });
    await fixture.whenStable();

    internals().openField('balance');
    await fixture.whenStable();
    expect(internals().activeFieldKey()).toBe('balance');
    expect(internals().controlFor('date').value).toBe('Date');
    expect(internals().controlFor('description').value).toBe('Desc');

    internals().openField('date');
    await fixture.whenStable();

    expect(internals().activeFieldKey()).toBe('date');
    expect(internals().controlFor('date').value).toBe('Date');
    expect(internals().controlFor('description').value).toBe('Desc');
  });

  describe('invalidFieldLabels', () => {
    it('lists every unmapped required field', async () => {
      await setup();
      expect(internals().invalidFieldLabels()).toEqual(['Date', 'Description']);
    });

    it('drops a field once it is mapped', async () => {
      await setup();
      internals().form.patchValue({ date: 'Date' });
      await fixture.whenStable();

      expect(internals().invalidFieldLabels()).toEqual(['Description']);
    });

    it('is empty once every required field is mapped', async () => {
      await setup();
      internals().form.patchValue({ date: 'Date', description: 'Desc' });
      await fixture.whenStable();

      expect(internals().invalidFieldLabels()).toEqual([]);
    });
  });
});
