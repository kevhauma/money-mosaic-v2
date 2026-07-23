import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  SIGN_CONVENTIONS,
  SUPPORTED_DATE_FORMATS,
  SUPPORTED_ENCODINGS,
  type CsvEncoding,
  type DateFormat,
  type MappingProfile,
  type MappingProfileColumns,
  type SignConvention,
} from '@/core/data-access';
import { CsvImportService, guessDelimiter } from '@/core/import';
import {
  AlertComponent,
  DividerComponent,
  FieldsetComponent,
  FlexComponent,
  InputComponent,
  LabelComponent,
  SelectComponent,
  TableComponent,
  TypographyComponent,
} from '@/shared/ui';
import { MappingProfilesStore } from '../../mapping-profiles.store';
import { ColumnMapFieldComponent } from '../column-map-field/column-map-field.component';

export type ImportMappingResult = { mappingProfile: Omit<MappingProfile, 'id'> };

const SIGN_CONVENTION_LABELS: Record<SignConvention, string> = {
  'as-is': 'As-is',
  'debit-negative': 'Debit negative (default)',
  'credit-negative': 'Credit negative',
};

/** A column-mapping field's key — one of `MappingProfileColumns`'s own properties. */
export type ColumnFieldKey = keyof MappingProfileColumns;

export type ColumnFieldDef = { key: ColumnFieldKey; label: string; required: boolean };

/**
 * The guided flow's field order (TICKET-IMP-07 to-be): `date` → `description` →
 * `amount`/`debit`/`credit` → `counterpartyName` → `counterpartyIban` → `ownIban` → `balance`.
 */
const COLUMN_FIELDS: ColumnFieldDef[] = [
  { key: 'date', label: 'Date', required: true },
  { key: 'description', label: 'Description', required: true },
  { key: 'amount', label: 'Amount (single column)', required: false },
  { key: 'debit', label: 'Debit (if separate)', required: false },
  { key: 'credit', label: 'Credit (if separate)', required: false },
  { key: 'counterpartyName', label: 'Counterparty name', required: false },
  { key: 'counterpartyIban', label: 'Counterparty IBAN', required: false },
  { key: 'ownIban', label: 'Own account number/IBAN', required: false },
  { key: 'balance', label: 'Running balance', required: false },
];

@Component({
  selector: 'app-import-map-step',
  imports: [
    ReactiveFormsModule,
    AlertComponent,
    ColumnMapFieldComponent,
    DividerComponent,
    FieldsetComponent,
    FlexComponent,
    InputComponent,
    LabelComponent,
    SelectComponent,
    TableComponent,
    TypographyComponent,
  ],
  templateUrl: './import-map-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportMapStepComponent {
  readonly file = input.required<File>();
  readonly accountId = input.required<number>();
  readonly result = model<ImportMappingResult | null>(null);

  protected readonly dateFormats = SUPPORTED_DATE_FORMATS;
  protected readonly encodings = SUPPORTED_ENCODINGS;
  protected readonly signConventionOptions = SIGN_CONVENTIONS.map((value) => ({
    value,
    label: SIGN_CONVENTION_LABELS[value],
  }));

  private readonly csvImportService = inject(CsvImportService);
  private readonly mappingProfilesStore = inject(MappingProfilesStore);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly headers = signal<string[]>([]);
  protected readonly previewRows = signal<string[][]>([]);
  protected readonly detectedPreset = signal<MappingProfile | null>(null);
  protected readonly usedSavedProfile = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['Custom mapping', Validators.required],
    delimiter: [';', Validators.required],
    decimalSeparator: [',', Validators.required],
    dateFormat: ['DD/MM/YYYY' as DateFormat, Validators.required],
    encoding: ['utf-8' as CsvEncoding, Validators.required],
    headerRows: [1, [Validators.required, Validators.min(1)]],
    signConvention: ['as-is' as SignConvention, Validators.required],
    date: ['', Validators.required],
    amount: [''],
    debit: [''],
    credit: [''],
    description: ['', Validators.required],
    counterpartyName: [''],
    counterpartyIban: [''],
    ownIban: [''],
    balance: [''],
    rememberForAccount: [false],
  });

  protected readonly columnFields = COLUMN_FIELDS;

  /** Which column field is expanded for editing right now; `null` once the guided flow reaches the end (TICKET-IMP-07). */
  protected readonly activeFieldKey = signal<ColumnFieldKey | null>(COLUMN_FIELDS[0].key);

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  /** The active field's live resolved sample — the first data row's value for whichever column is currently selected (TICKET-IMP-07). */
  protected readonly resolvedSamples = computed<Partial<Record<ColumnFieldKey, string>>>(() => {
    const value = this.formValue();
    const headers = this.headers();
    const sampleRow = this.previewRows()[value.headerRows ?? 1] ?? [];
    const samples: Partial<Record<ColumnFieldKey, string>> = {};
    for (const field of COLUMN_FIELDS) {
      const columnName = value[field.key];
      const index = columnName ? headers.indexOf(columnName) : -1;
      if (index !== -1 && sampleRow[index] !== undefined) {
        samples[field.key] = sampleRow[index];
      }
    }
    return samples;
  });

  /** Non-blocking "also mapped to X" warning for any two fields sharing the same source column (TICKET-IMP-07). */
  protected readonly duplicateWarnings = computed<Partial<Record<ColumnFieldKey, string>>>(() => {
    const value = this.formValue();
    const fieldsByColumn = new Map<string, ColumnFieldKey[]>();
    for (const field of COLUMN_FIELDS) {
      const columnName = value[field.key];
      if (!columnName) continue;
      const keys = fieldsByColumn.get(columnName) ?? [];
      keys.push(field.key);
      fieldsByColumn.set(columnName, keys);
    }

    const warnings: Partial<Record<ColumnFieldKey, string>> = {};
    for (const keys of fieldsByColumn.values()) {
      if (keys.length < 2) continue;
      for (const key of keys) {
        const otherLabels = keys
          .filter((other) => other !== key)
          .map((other) => COLUMN_FIELDS.find((field) => field.key === other)!.label);
        warnings[key] = `Also mapped to ${otherLabels.join(', ')}`;
      }
    }
    return warnings;
  });

  /** Required column fields still unmapped — surfaced so the wizard's Confirm/Next button can name what's blocking it (TICKET-IMP-07). */
  readonly invalidFieldLabels = computed<string[]>(() => {
    const value = this.formValue();
    return COLUMN_FIELDS.filter((field) => field.required && !value[field.key]).map(
      (field) => field.label,
    );
  });

  // Tracks the file we last ran detection for, so re-detection reacts to the file reference itself
  // rather than a one-shot flag — correctness no longer depends on the wizard destroying/recreating
  // this component between files (CR-1.5).
  private detectedFile: File | null = null;

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.updateResult());
    effect(() => {
      const file = this.file();
      if (file === this.detectedFile) return;
      this.detectedFile = file;
      void this.detectAndPrefill(file);
    });
  }

  private async detectAndPrefill(file: File): Promise<void> {
    this.loading.set(true);
    try {
      const sampleBuffer = await file.slice(0, 8192).arrayBuffer();
      const sampleText = new TextDecoder('utf-8').decode(sampleBuffer);
      const guessedDelimiter = guessDelimiter(sampleText);

      const preset =
        (await this.mappingProfilesStore.detectTemplateForFile((encoding) =>
          this.csvImportService.detectHeaders(file, guessedDelimiter, encoding),
        )) ?? null;
      const savedProfile = preset
        ? this.mappingProfilesStore.findForBankAndAccount(preset.bankPreset, this.accountId())
        : undefined;

      this.detectedPreset.set(preset);
      this.usedSavedProfile.set(!!savedProfile);

      if (savedProfile) {
        this.form.patchValue({
          name: savedProfile.name,
          delimiter: savedProfile.delimiter,
          decimalSeparator: savedProfile.decimalSeparator,
          dateFormat: savedProfile.dateFormat,
          encoding: savedProfile.encoding,
          headerRows: savedProfile.headerRows,
          signConvention: savedProfile.signConvention,
          ...savedProfile.columns,
          rememberForAccount: true,
        });
      } else if (preset) {
        this.form.patchValue({
          name: preset.name,
          delimiter: preset.delimiter,
          decimalSeparator: preset.decimalSeparator,
          dateFormat: preset.dateFormat,
          encoding: preset.encoding,
          headerRows: preset.headerRows,
          signConvention: preset.signConvention,
          ...preset.columns,
        });
      } else {
        this.form.patchValue({ delimiter: guessedDelimiter, name: 'Custom mapping' });
      }

      await this.refreshPreview();
    } finally {
      this.loading.set(false);
    }
  }

  protected async refreshPreview(): Promise<void> {
    const { delimiter, encoding, headerRows } = this.form.getRawValue();
    const rows = await this.csvImportService.previewRawRows(
      this.file(),
      delimiter,
      encoding,
      headerRows + 5,
    );
    this.headers.set(rows[headerRows - 1] ?? []);
    this.previewRows.set(rows);
  }

  /** Type-safe dynamic control lookup for the template, since `form.controls['x']` doesn't narrow (TICKET-IMP-07). */
  protected controlFor(key: ColumnFieldKey): FormControl<string> {
    return this.form.controls[key];
  }

  protected isLastColumnField(key: ColumnFieldKey): boolean {
    return COLUMN_FIELDS[COLUMN_FIELDS.length - 1].key === key;
  }

  /** Opens a field for editing — collapsing whichever field was previously active and marking it touched, so a skipped required field's error surfaces once the user moves away from it (TICKET-IMP-07). */
  protected openField(key: ColumnFieldKey): void {
    const current = this.activeFieldKey();
    if (current && current !== key) this.controlFor(current).markAsTouched();
    this.activeFieldKey.set(key);
  }

  /** Advances the guided flow past `key` once it's valid — a no-op while a required field is still empty (TICKET-IMP-07). */
  protected advanceFrom(key: ColumnFieldKey): void {
    const control = this.controlFor(key);
    control.markAsTouched();
    if (control.invalid) return;

    const nextIndex = COLUMN_FIELDS.findIndex((field) => field.key === key) + 1;
    this.activeFieldKey.set(COLUMN_FIELDS[nextIndex]?.key ?? null);
  }

  private updateResult(): void {
    if (this.form.invalid) {
      this.result.set(null);
      return;
    }

    const value = this.form.getRawValue();
    const columns: MappingProfileColumns = {
      date: value.date,
      amount: value.amount || undefined,
      debit: value.debit || undefined,
      credit: value.credit || undefined,
      description: value.description,
      counterpartyName: value.counterpartyName || undefined,
      counterpartyIban: value.counterpartyIban || undefined,
      ownIban: value.ownIban || undefined,
      balance: value.balance || undefined,
    };

    this.result.set({
      mappingProfile: {
        name: value.name,
        bankPreset: this.detectedPreset()?.bankPreset,
        headerSignature: value.rememberForAccount ? this.headers() : undefined,
        delimiter: value.delimiter,
        decimalSeparator: value.decimalSeparator,
        dateFormat: value.dateFormat,
        encoding: value.encoding,
        headerRows: value.headerRows,
        signConvention: value.signConvention,
        columns,
        defaultAccountId: value.rememberForAccount ? this.accountId() : undefined,
      },
    });
  }
}
