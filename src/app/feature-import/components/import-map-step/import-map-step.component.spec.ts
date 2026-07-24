import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { MappingProfile } from '@/core/data-access';
import { CsvImportService } from '@/core/import';
import { MappingProfilesStore } from '../../mapping-profiles.store';
import {
  ImportMapStepComponent,
  type ColumnFieldKey,
  type MapperStepId,
  type MapperStepTrackerItem,
} from './import-map-step.component';
import type { AmountMode } from '../column-map-amount-field/column-map-amount-field.component';
import type { MapperSummaryRow } from '../column-map-summary-step/column-map-summary-step.component';

/** Protected surface we reach into for guided-flow assertions (TICKET-IMP-09). */
type Internals = {
  activeStepId: () => MapperStepId;
  amountMode: () => AmountMode;
  stepperItems: () => MapperStepTrackerItem[];
  summaryRows: () => MapperSummaryRow[];
  resolvedSamples: () => Partial<Record<ColumnFieldKey, string>>;
  duplicateWarnings: () => Partial<Record<ColumnFieldKey, string>>;
  invalidFieldLabels: () => string[];
  controlFor: (key: ColumnFieldKey) => { value: string; invalid: boolean; touched: boolean };
  openStep: (id: MapperStepId) => void;
  advanceFrom: (id: MapperStepId) => void;
  setAmountMode: (mode: AmountMode) => void;
  form: {
    patchValue: (value: Record<string, unknown>) => void;
  };
};

const csvFile = (): File =>
  new File(['Date;Desc;Amount\n14/07/2026;Coffee;-3.50'], 'a.csv', { type: 'text/csv' });

const SAVED_SPLIT_PROFILE: MappingProfile = {
  id: 1,
  name: 'Saved split mapping',
  bankPreset: 'test-bank',
  delimiter: ';',
  decimalSeparator: ',',
  dateFormat: 'DD/MM/YYYY',
  encoding: 'utf-8',
  headerRows: 1,
  signConvention: 'as-is',
  columns: { date: 'Date', description: 'Desc', debit: 'Debit', credit: 'Credit' },
};

describe('ImportMapStepComponent: horizontal mapper stepper (TICKET-IMP-09)', () => {
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

  it('starts the guided flow with the date step active', async () => {
    await setup();
    expect(internals().activeStepId()).toBe('date');
  });

  it('advanceFrom moves to the next step once the current one is valid', async () => {
    await setup();
    internals().form.patchValue({ date: 'Date' });
    await fixture.whenStable();

    internals().advanceFrom('date');

    expect(internals().activeStepId()).toBe('description');
  });

  it('advanceFrom is a no-op on a required field left empty', async () => {
    await setup();

    internals().advanceFrom('date');

    expect(internals().activeStepId()).toBe('date');
  });

  it('walks the full 7-step order, skipping every optional step left empty, ending at summary', async () => {
    await setup();
    internals().form.patchValue({ date: 'Date', description: 'Desc' });
    await fixture.whenStable();

    internals().advanceFrom('date');
    expect(internals().activeStepId()).toBe('description');

    internals().advanceFrom('description');
    expect(internals().activeStepId()).toBe('amount'); // merges amount/debit/credit into one step

    internals().advanceFrom('amount'); // optional, left empty
    expect(internals().activeStepId()).toBe('counterparty'); // merges name+IBAN into one step

    internals().advanceFrom('counterparty');
    expect(internals().activeStepId()).toBe('ownIban');

    internals().advanceFrom('ownIban');
    expect(internals().activeStepId()).toBe('balance');

    internals().advanceFrom('balance');
    expect(internals().activeStepId()).toBe('summary'); // new terminus, never null
  });

  describe('step tracker click-to-jump', () => {
    it('jumps back to a done step and preserves other steps’ values', async () => {
      await setup();
      internals().form.patchValue({ date: 'Date', description: 'Desc' });
      await fixture.whenStable();
      internals().advanceFrom('date');
      internals().advanceFrom('description'); // now on 'amount', 'date'/'description' are done

      internals().openStep('date');
      await fixture.whenStable();

      expect(internals().activeStepId()).toBe('date');
      expect(internals().controlFor('date').value).toBe('Date');
      expect(internals().controlFor('description').value).toBe('Desc');
    });

    it('jumps ahead to an upcoming step', async () => {
      await setup();

      internals().openStep('balance'); // still on 'date', nothing mapped yet

      expect(internals().activeStepId()).toBe('balance');
    });

    it('marks the field left behind touched when jumping ahead past it', async () => {
      await setup();

      internals().openStep('balance'); // 'date' (required) left empty

      expect(internals().controlFor('date').touched).toBe(true);
      expect(internals().controlFor('date').invalid).toBe(true);
    });

    it('marks the step the user leaves invalid-and-touched when jumping back', async () => {
      await setup();
      internals().form.patchValue({ date: 'Date' });
      await fixture.whenStable();
      internals().advanceFrom('date'); // now on 'description' (required), left empty

      internals().openStep('date'); // jump back to the earlier, done step

      expect(internals().controlFor('description').touched).toBe(true);
      expect(internals().controlFor('description').invalid).toBe(true);
    });
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
  });

  describe('duplicate-column warning', () => {
    it('flags both fields once they share a source column', async () => {
      await setup();
      internals().form.patchValue({ date: 'Date', balance: 'Date' });
      await fixture.whenStable();

      expect(internals().duplicateWarnings().date).toContain('Running balance');
      expect(internals().duplicateWarnings().balance).toContain('Date');
    });
  });

  describe('invalidFieldLabels', () => {
    it('lists every unmapped required field', async () => {
      await setup();
      expect(internals().invalidFieldLabels()).toEqual(['Date', 'Description']);
    });

    it('is empty once every required field is mapped', async () => {
      await setup();
      internals().form.patchValue({ date: 'Date', description: 'Desc' });
      await fixture.whenStable();

      expect(internals().invalidFieldLabels()).toEqual([]);
    });
  });

  describe('amount-mode toggle', () => {
    it('defaults to single-column mode when no debit/credit was prefilled', async () => {
      await setup();
      expect(internals().amountMode()).toBe('single');
    });

    it('defaults to split mode when a saved profile prefilled debit/credit', async () => {
      vi.clearAllMocks();
      detectHeaders.mockResolvedValue(['Date', 'Desc', 'Debit', 'Credit']);
      previewRawRows.mockResolvedValue([
        ['Date', 'Desc', 'Debit', 'Credit'],
        ['14/07/2026', 'Coffee', '3.50', ''],
      ]);
      detectTemplateForFile.mockResolvedValue(SAVED_SPLIT_PROFILE);
      findForBankAndAccount.mockReturnValue(SAVED_SPLIT_PROFILE);

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

      expect(internals().amountMode()).toBe('split');
      expect(internals().controlFor('debit').value).toBe('Debit');
      expect(internals().controlFor('credit').value).toBe('Credit');
    });

    it('clears the debit/credit controls when switching back to single-column mode', async () => {
      await setup();
      internals().form.patchValue({ debit: 'Debit', credit: 'Credit' });
      internals().setAmountMode('split');
      await fixture.whenStable();

      internals().setAmountMode('single');
      await fixture.whenStable();

      expect(internals().controlFor('debit').value).toBe('');
      expect(internals().controlFor('credit').value).toBe('');
    });

    it('clears the amount control when switching to split mode', async () => {
      await setup();
      internals().form.patchValue({ amount: 'Amount' });
      await fixture.whenStable();

      internals().setAmountMode('split');
      await fixture.whenStable();

      expect(internals().controlFor('amount').value).toBe('');
    });

    it('is a no-op when set to the mode that is already active', async () => {
      await setup();
      internals().form.patchValue({ amount: 'Amount' });
      await fixture.whenStable();

      internals().setAmountMode('single'); // already single — must not clear `amount`
      await fixture.whenStable();

      expect(internals().controlFor('amount').value).toBe('Amount');
    });
  });

  describe('summaryRows', () => {
    it('lists exactly the mapped fields, in COLUMN_FIELD_DEFS order, with column and sample', async () => {
      await setup();
      internals().form.patchValue({ date: 'Date', balance: 'Amount' });
      await fixture.whenStable();

      expect(internals().summaryRows()).toEqual([
        { label: 'Date', column: 'Date', sample: '14/07/2026' },
        { label: 'Running balance', column: 'Amount', sample: '-3.50' },
      ]);
    });

    it('is empty when nothing is mapped', async () => {
      await setup();
      expect(internals().summaryRows()).toEqual([]);
    });
  });
});
