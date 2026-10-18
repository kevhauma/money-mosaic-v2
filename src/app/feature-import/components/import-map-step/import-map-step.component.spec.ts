import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { MappingProfile } from '@/core/data-access';
import { CsvImportService, type AmountMode } from '@/core/import';
import { MappingProfilesStore } from '../../mapping-profiles.store';
import { ImportMapStepComponent } from './import-map-step.component';
import type { ColumnGroupVm, ColumnRowVm } from '../../column-statements';
import type { ReadingStatementVm } from '../../reading-statements';

/** Reads the test file's own text, the way `CsvImportService.readSample` would for a UTF-8 file. */
const readSample = vi.fn(async (file: File) => ({ text: await file.text(), utf8Valid: true }));

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

/** The protected surface the Columns assertions reach into (TICKET-IMP-17). */
type ColumnsInternals = {
  columnsOpen: () => boolean;
  amountMode: () => AmountMode;
  columnGroupsVm: () => ColumnGroupVm[];
  missingColumnLabels: () => string[];
  columnsSummaryText: () => string;
  columnsNoteText: () => string;
  confirmColumns: () => void;
  changeColumns: () => void;
  confirmReading: () => void;
  changeReading: () => void;
  setAmountMode: (mode: AmountMode) => void;
  form: {
    patchValue: (value: Record<string, unknown>) => void;
    getRawValue: () => Record<string, unknown>;
    controls: Record<'decimalSeparator', { setValue: (v: string) => void }>;
  };
};

/** One file the app has never seen: Dutch headers, comma decimals, one own IBAN on every line. */
const UNKNOWN_ROWS = [
  ['Rekening', 'Datum', 'Mededeling', 'Bedrag', 'Rekening tegenpartij', 'Naam tegenpartij'],
  [
    'BE12 3456 7890 1234',
    '30/09/2026',
    'BETALING MET KAART COLRUYT GENT',
    '-84,12',
    'BE40 0910 0002 3456',
    'COLRUYT GENT',
  ],
  [
    'BE12 3456 7890 1234',
    '01/10/2026',
    'OVERSCHRIJVING LOON SEPTEMBER',
    '3.120,00',
    'BE71 0961 2345 6769',
    'WERKGEVER NV',
  ],
];
const SPLIT_ROWS = [
  ['Date', 'Description', 'Money out', 'Money in'],
  ['30/09/2026', 'Card payment Colruyt', '84,12', ''],
  ['01/10/2026', 'Salary September', '', '3.120,00'],
];

describe('ImportMapStepComponent: columns (TICKET-IMP-17)', () => {
  let fixture: ComponentFixture<ImportMapStepComponent>;

  const detectHeaders = vi.fn().mockResolvedValue([]);
  const previewRawRows = vi.fn();
  const detectTemplateForFile = vi.fn();
  const findRemembered = vi.fn();

  const mount = async (
    rows: string[][],
    profile?: MappingProfile,
    fileName = 'argenta-export.csv',
  ): Promise<void> => {
    vi.clearAllMocks();
    previewRawRows.mockResolvedValue(rows);
    detectTemplateForFile.mockResolvedValue(profile);
    findRemembered.mockReturnValue(profile);

    await TestBed.configureTestingModule({
      imports: [ImportMapStepComponent],
      providers: [
        { provide: CsvImportService, useValue: { detectHeaders, previewRawRows, readSample } },
        { provide: MappingProfilesStore, useValue: { detectTemplateForFile, findRemembered } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportMapStepComponent);
    const text = rows.map((row) => row.join(';')).join('\n');
    fixture.componentRef.setInput('file', new File([text], fileName, { type: 'text/csv' }));
    fixture.componentRef.setInput('accountId', 1);
    await fixture.whenStable();
    await vi.waitFor(() => expect(previewRawRows).toHaveBeenCalled());
    await fixture.whenStable();
  };

  const internals = (): ColumnsInternals =>
    fixture.componentInstance as unknown as ColumnsInternals;
  const element = (): HTMLElement => {
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };
  const row = (key: string): ColumnRowVm =>
    internals()
      .columnGroupsVm()
      .flatMap((group) => group.rows)
      .find((candidate) => candidate.key === key)!;
  const looksRight = (): HTMLButtonElement =>
    [...element().querySelectorAll('button')].find((b) => b.textContent?.includes('Looks right'))!;

  it('fills an unrecognised file’s columns from the guess and opens the section to check them', async () => {
    await mount(UNKNOWN_ROWS);

    expect(internals().form.getRawValue()).toMatchObject({
      date: 'Datum',
      amount: 'Bedrag',
      description: 'Mededeling',
      counterpartyName: 'Naam tegenpartij',
      counterpartyIban: 'Rekening tegenpartij',
      ownIban: 'Rekening',
      balance: '',
    });
    expect(internals().columnsOpen()).toBe(true);
    expect(internals().columnsNoteText()).toBe('Guessed from the file');
    expect(element().querySelectorAll('[data-column]')).toHaveLength(7);
    expect(row('balance').markerLabel).toBe('not found');
    expect(fixture.componentInstance.result()).toBeNull();
  });

  it('shows what the first line reads as, under the reading as it stands now', async () => {
    await mount(UNKNOWN_ROWS);

    expect(row('date').reading).toMatch(/^30\/09\/2026 reads as 30 Sept? 2026$/);
    expect(row('amount').reading).toMatch(/^-84,12 reads as -€84[.,]12$/);
    expect(row('ownIban').reading).toBe('BE12 3456 7890 1234, the same on every line');
    const readings = [...element().querySelectorAll('[data-testid="column-reading"]')].map((node) =>
      node.textContent?.trim(),
    );
    expect(readings).toContain(row('date').reading);

    internals().form.controls.decimalSeparator.setValue('.');
    await fixture.whenStable();
    expect(row('amount').reading).toMatch(/^-84,12 reads as -€8[.,]?412[.,]00$/);
  });

  it('flags two fields reading one column', async () => {
    await mount(UNKNOWN_ROWS);

    internals().form.patchValue({ counterpartyName: 'Mededeling' });
    await fixture.whenStable();

    expect(row('description').clash).toBe('Also used for Who it was with');
    expect(element().textContent).toContain('Also used for Description');
    expect(row('counterpartyName').markerLabel).toBe('✓ set');
  });

  it('holds "Looks right" until date, amount and description all have a column', async () => {
    await mount(UNKNOWN_ROWS);
    internals().form.patchValue({ amount: '' });
    await fixture.whenStable();

    expect(internals().missingColumnLabels()).toEqual(['Amount']);
    expect(looksRight().disabled).toBe(true);
    internals().confirmColumns();
    expect(internals().columnsOpen()).toBe(true);

    internals().form.patchValue({ amount: 'Bedrag' });
    await fixture.whenStable();
    expect(looksRight().disabled).toBe(false);
  });

  it('"Looks right" folds the section and remembers the columns under the file’s name', async () => {
    await mount(UNKNOWN_ROWS);

    internals().confirmColumns();
    await fixture.whenStable();

    expect(internals().columnsOpen()).toBe(false);
    expect(internals().columnsNoteText()).toBe('Checked by you');
    expect(internals().columnsSummaryText()).toBe(
      'Date ← Datum · Amount ← Bedrag · Description ← Mededeling · 3 more',
    );
    expect(element().querySelector('[data-testid="columns-summary"]')?.textContent).toContain(
      'Date ← Datum',
    );
    expect(fixture.componentInstance.result()?.mappingProfile).toMatchObject({
      name: 'argenta-export',
      bankPreset: undefined,
      headerSignature: UNKNOWN_ROWS[0],
      defaultAccountId: 1,
      columns: { date: 'Datum', amount: 'Bedrag', description: 'Mededeling', ownIban: 'Rekening' },
    });
  });

  it('saves nothing to remember when the box is unticked', async () => {
    await mount(UNKNOWN_ROWS);
    internals().form.patchValue({ rememberForAccount: false });
    internals().confirmColumns();

    expect(fixture.componentInstance.result()?.mappingProfile).toMatchObject({
      headerSignature: undefined,
      defaultAccountId: undefined,
    });
  });

  it('maps money out and money in for a split file, and switches back to one column', async () => {
    await mount(SPLIT_ROWS);

    expect(internals().amountMode()).toBe('split');
    expect(internals().form.getRawValue()).toMatchObject({
      amount: '',
      debit: 'Money out',
      credit: 'Money in',
    });
    expect(row('debit').reading).toMatch(/^84,12 reads as -€84[.,]12$/);
    expect(row('credit').reading).toMatch(/^Line 2: 3\.120,00 reads as \+€3[.,]120[.,]00$/);

    internals().confirmColumns();
    expect(fixture.componentInstance.result()?.mappingProfile.columns).toMatchObject({
      debit: 'Money out',
      credit: 'Money in',
      amount: undefined,
    });

    internals().setAmountMode('single');
    expect(internals().form.getRawValue()).toMatchObject({ debit: '', credit: '' });
    expect(internals().missingColumnLabels()).toEqual(['Amount']);
    expect(fixture.componentInstance.result()).toBeNull();
  });

  it('folds itself for a recognised file, keeping its saved columns', async () => {
    await mount(SPLIT_ROWS, {
      ...SAVED_SPLIT_PROFILE,
      columns: { date: 'Date', description: 'Description', debit: 'Money out', credit: 'Money in' },
    });

    expect(internals().columnsOpen()).toBe(false);
    expect(internals().amountMode()).toBe('split');
    expect(internals().columnsNoteText()).toBe('From your saved mapping "Saved split mapping"');
    expect(fixture.componentInstance.result()).not.toBeNull();
  });

  it('drops the previous file’s guessed columns when the next file is a preset', async () => {
    await mount(SPLIT_ROWS);
    expect(internals().amountMode()).toBe('split');

    // The wizard reuses this step for the next file of a batch: a KBC-style preset naming no
    // money out / money in, nor any optional column.
    const presetRows = [
      ['Datum', 'Omschrijving', 'Bedrag'],
      ['30/09/2026', 'Betaling', '-84,12'],
    ];
    previewRawRows.mockResolvedValue(presetRows);
    detectTemplateForFile.mockResolvedValue({
      ...SAVED_SPLIT_PROFILE,
      name: 'Bank',
      columns: { date: 'Datum', description: 'Omschrijving', amount: 'Bedrag' },
    });
    findRemembered.mockReturnValue(undefined);
    const text = presetRows.map((cells) => cells.join(';')).join('\n');
    fixture.componentRef.setInput('file', new File([text], 'bank.csv', { type: 'text/csv' }));
    await fixture.whenStable();
    await vi.waitFor(() => expect(internals().amountMode()).toBe('single'));
    await fixture.whenStable();

    expect(internals().form.getRawValue()).toMatchObject({
      debit: '',
      credit: '',
      amount: 'Bedrag',
    });
    expect(fixture.componentInstance.result()?.mappingProfile.columns).toEqual({
      date: 'Datum',
      amount: 'Bedrag',
      description: 'Omschrijving',
    });
  });

  it('Change reopens the columns and holds the result back until "Looks right" again', async () => {
    await mount(UNKNOWN_ROWS);
    internals().confirmColumns();
    expect(fixture.componentInstance.result()).not.toBeNull();

    internals().changeColumns();
    expect(internals().columnsOpen()).toBe(true);
    expect(fixture.componentInstance.result()).toBeNull();

    internals().confirmColumns();
    expect(fixture.componentInstance.result()).not.toBeNull();
  });

  it('keeps the user’s own picks when an unchanged reading is confirmed again', async () => {
    await mount(UNKNOWN_ROWS);
    internals().form.patchValue({ description: 'Naam tegenpartij', counterpartyName: '' });

    internals().changeReading();
    internals().confirmReading();
    await fixture.whenStable();

    expect(internals().form.getRawValue()).toMatchObject({ description: 'Naam tegenpartij' });
  });
});

type ReadingInternals = {
  readingOpen: () => boolean;
  readingStatementsVm: () => ReadingStatementVm[];
  readingSummaryText: () => string;
  readingNoteText: () => string;
  confirmReading: () => void;
  changeReading: () => void;
  confirmColumns: () => void;
  form: {
    patchValue: (value: Record<string, unknown>) => void;
    controls: Record<
      'delimiter' | 'dateFormat' | 'decimalSeparator',
      { setValue: (v: string) => void }
    >;
  };
};

describe('ImportMapStepComponent: how the file is read (TICKET-IMP-16)', () => {
  let fixture: ComponentFixture<ImportMapStepComponent>;

  const detectHeaders = vi.fn().mockResolvedValue([]);
  const previewRawRows = vi.fn();
  const detectTemplateForFile = vi.fn();
  const findRemembered = vi.fn();

  /** Every date fits both day/month and month/day, so the date format is the one unsure guess. */
  const AMBIGUOUS_ROWS = [
    ['Date', 'Desc', 'Amount'],
    ['01/02/2026', 'Coffee', '-3,50'],
    ['03/04/2026', 'Tea', '-2,10'],
  ];
  const SURE_ROWS = [
    ['Date', 'Desc', 'Amount'],
    ['14/07/2026', 'Coffee', '-3,50'],
  ];

  const mount = async (rows: string[][], profile?: MappingProfile): Promise<void> => {
    vi.clearAllMocks();
    previewRawRows.mockResolvedValue(rows);
    detectTemplateForFile.mockResolvedValue(profile);
    findRemembered.mockReturnValue(profile);

    await TestBed.configureTestingModule({
      imports: [ImportMapStepComponent],
      providers: [
        { provide: CsvImportService, useValue: { detectHeaders, previewRawRows, readSample } },
        {
          provide: MappingProfilesStore,
          useValue: { detectTemplateForFile, findRemembered },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ImportMapStepComponent);
    const text = rows.map((row) => row.join(';')).join('\n');
    fixture.componentRef.setInput('file', new File([text], 'bank.csv', { type: 'text/csv' }));
    fixture.componentRef.setInput('accountId', 1);
    await fixture.whenStable();
    // Detection reads the file (a real `File.text()`), which `whenStable` does not wait for.
    await vi.waitFor(() => expect(previewRawRows).toHaveBeenCalled());
    await fixture.whenStable();
  };

  const internals = (): ReadingInternals =>
    fixture.componentInstance as unknown as ReadingInternals;
  const element = (): HTMLElement => {
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };
  const mapColumns = async (): Promise<void> => {
    internals().form.patchValue({ date: 'Date', description: 'Desc', amount: 'Amount' });
    await fixture.whenStable();
  };

  it('folds itself, with the columns showing, when every guess is sure', async () => {
    await mount(SURE_ROWS);

    expect(internals().readingOpen()).toBe(false);
    expect(internals().readingSummaryText()).toBe(
      'Read as ; separated · comma decimals · day/month/year · UTF-8',
    );
    expect(internals().readingNoteText()).toBe('Guessed from the file');
    expect(element().querySelector('app-import-columns-section')).not.toBeNull();
  });

  it('opens with the unsure setting marked, and holds the columns and the result back', async () => {
    await mount(AMBIGUOUS_ROWS);
    await mapColumns();

    expect(internals().readingOpen()).toBe(true);
    const unsure = internals()
      .readingStatementsVm()
      .filter((row) => row.confidence === 'unsure')
      .map((row) => row.key);
    expect(unsure).toEqual(['dateFormat']);
    expect(internals().readingNoteText()).toBe('Opened because one thing looked unsure.');
    expect(element().querySelector('app-import-columns-section')).toBeNull();
    expect(fixture.componentInstance.result()).toBeNull();
  });

  it('carries the confirmed settings into the result that is parsed and saved', async () => {
    await mount(AMBIGUOUS_ROWS);
    await mapColumns();

    // What picking "month/day/year" in the section does: write the form control.
    internals().form.controls.dateFormat.setValue('MM/DD/YYYY');
    internals().confirmReading();
    await fixture.whenStable();
    // The guess fills the columns once the reading is confirmed; "Looks right" lets them through.
    internals().confirmColumns();

    expect(element().querySelector('app-import-columns-section')).not.toBeNull();
    expect(fixture.componentInstance.result()?.mappingProfile).toMatchObject({
      delimiter: ';',
      headerRows: 1,
      dateFormat: 'MM/DD/YYYY',
      decimalSeparator: ',',
      encoding: 'utf-8',
    });
  });

  it('re-reads the lines, in both encodings, when the separator changes', async () => {
    await mount(AMBIGUOUS_ROWS);
    previewRawRows.mockClear();

    internals().form.controls.delimiter.setValue(',');
    await vi.waitFor(() => expect(previewRawRows).toHaveBeenCalledTimes(2));
    await fixture.whenStable();

    expect(
      previewRawRows.mock.calls.map(([, delimiter, encoding]) => [delimiter, encoding]),
    ).toEqual([
      [',', 'utf-8'],
      [',', 'windows-1252'],
    ]);
    const delimiterRow = internals()
      .readingStatementsVm()
      .find((row) => row.key === 'delimiter');
    expect(delimiterRow?.title).toBe('Columns are split by ,');
  });

  it('does not re-read the lines for a setting that only changes how values parse', async () => {
    await mount(AMBIGUOUS_ROWS);
    previewRawRows.mockClear();

    internals().form.controls.decimalSeparator.setValue('.');
    await fixture.whenStable();

    expect(previewRawRows).not.toHaveBeenCalled();
  });

  it('takes a recognised file’s reading from its saved mapping and folds', async () => {
    await mount(AMBIGUOUS_ROWS, {
      ...SAVED_SPLIT_PROFILE,
      columns: { date: 'Date', description: 'Desc', amount: 'Amount' },
    });

    expect(internals().readingOpen()).toBe(false);
    expect(internals().readingNoteText()).toBe('From your saved mapping "Saved split mapping"');
    expect(
      internals()
        .readingStatementsVm()
        .every((row) => row.confidence === 'sure'),
    ).toBe(true);
    expect(fixture.componentInstance.result()).not.toBeNull();
  });

  it('Change reopens the section and holds the result back until confirmed again', async () => {
    await mount(SURE_ROWS);
    internals().confirmColumns();
    expect(fixture.componentInstance.result()).not.toBeNull();

    internals().changeReading();
    await fixture.whenStable();

    expect(internals().readingOpen()).toBe(true);
    expect(fixture.componentInstance.result()).toBeNull();

    internals().confirmReading();
    expect(fixture.componentInstance.result()).not.toBeNull();
  });
});
