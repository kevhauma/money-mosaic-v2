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
import { CsvImportService, guessDelimiter, type ParsedRowResult } from '@/core/import';
import {
  AlertComponent,
  BadgeComponent,
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
import { ColumnMapStepperComponent } from '../column-map-stepper/column-map-stepper.component';
import { ColumnMapSimpleFieldComponent } from '../column-map-simple-field/column-map-simple-field.component';
import {
  ColumnMapAmountFieldComponent,
  type AmountMode,
} from '../column-map-amount-field/column-map-amount-field.component';
import { ColumnMapCounterpartyFieldComponent } from '../column-map-counterparty-field/column-map-counterparty-field.component';
import {
  ColumnMapSummaryStepComponent,
  type MapperSummaryRow,
} from '../column-map-summary-step/column-map-summary-step.component';
import { ImportPreviewStepComponent } from '../import-preview-step/import-preview-step.component';

export type ImportMappingResult = { mappingProfile: Omit<MappingProfile, 'id'> };

const SIGN_CONVENTION_LABELS: Record<SignConvention, string> = {
  'as-is': 'As-is',
  'debit-negative': 'Debit negative (default)',
  'credit-negative': 'Credit negative',
};

/** A column-mapping field's key — one of `MappingProfileColumns`'s own properties. */
export type ColumnFieldKey = keyof MappingProfileColumns;

export type ColumnFieldDef = { key: ColumnFieldKey; label: string; required: boolean };

/** Flat per-control definitions — `resolvedSamples`/`duplicateWarnings`/`invalidFieldLabels` still
 * operate at this 9-control granularity regardless of how the guided flow groups them into steps. */
const COLUMN_FIELD_DEFS: ColumnFieldDef[] = [
  { key: 'date', label: 'Date', required: true },
  { key: 'amount', label: 'Amount', required: false },
  { key: 'debit', label: 'Debit', required: false },
  { key: 'credit', label: 'Credit', required: false },
  { key: 'description', label: 'Description', required: true },
  { key: 'counterpartyName', label: 'Counterparty name', required: false },
  { key: 'counterpartyIban', label: 'Counterparty IBAN', required: false },
  { key: 'ownIban', label: 'Own account number/IBAN', required: false },
  { key: 'balance', label: 'Running balance', required: false },
];

export type MapperStepId =
  'date' | 'description' | 'amount' | 'counterparty' | 'ownIban' | 'balance' | 'summary';

export type MapperStepDef = { id: MapperStepId; label: string; keys: ColumnFieldKey[] };

export type MapperStepTrackerState = 'done' | 'current' | 'upcoming';
export type MapperStepTrackerItem = {
  id: MapperStepId;
  label: string;
  state: MapperStepTrackerState;
};

/**
 * The horizontal guided flow's step order (TICKET-IMP-09) — consolidates TICKET-IMP-07's flat
 * 9-field order into 7 steps: `amount` now covers `amount`/`debit`/`credit` behind a mode toggle,
 * `counterparty` covers `counterpartyName`/`counterpartyIban` together, and `summary` is a new
 * terminus (the flow no longer ends at a `null` active field).
 */
const MAPPER_STEPS: MapperStepDef[] = [
  { id: 'date', label: 'Date', keys: ['date'] },
  { id: 'description', label: 'Description', keys: ['description'] },
  { id: 'amount', label: 'Amount', keys: ['amount', 'debit', 'credit'] },
  { id: 'counterparty', label: 'Counterparty', keys: ['counterpartyName', 'counterpartyIban'] },
  { id: 'ownIban', label: 'Own IBAN', keys: ['ownIban'] },
  { id: 'balance', label: 'Balance', keys: ['balance'] },
  { id: 'summary', label: 'Summary', keys: [] },
];

@Component({
  selector: 'app-import-map-step',
  imports: [
    ReactiveFormsModule,
    AlertComponent,
    BadgeComponent,
    ColumnMapStepperComponent,
    ColumnMapSimpleFieldComponent,
    ColumnMapAmountFieldComponent,
    ColumnMapCounterpartyFieldComponent,
    ColumnMapSummaryStepComponent,
    DividerComponent,
    FieldsetComponent,
    FlexComponent,
    ImportPreviewStepComponent,
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

  // Wizard-owned parse-state display values (TICKET-IMP-09) — the actual debounced worker-parse
  // pipeline stays in ImportWizardComponent (it's wizard-lifecycle logic tied to batch auto-commit);
  // only the resulting read-only values are pushed down so the row preview can render here, beside
  // the raw file preview.
  readonly parsedRows = input<ParsedRowResult[]>([]);
  // `parseError`/`headerMismatchMessage` below are read in the template only via
  // `@else if (fn(); as alias)` — a static-analysis false positive may flag them as unused inputs;
  // both are genuinely read (see the row-preview branch in import-map-step.component.html).
  readonly parseError = input<string | null>(null);
  readonly headerMismatchMessage = input<string | null>(null);
  readonly parsing = input(false);
  readonly parseWarnings = input<string[]>([]);

  // Wizard-owned "apply to remaining files" state (TICKET-IMP-09) — gating/state stay wizard-owned
  // (tied to `runCommit()`/`batchMapping`); the checkbox itself renders in the always-visible
  // global options here, not gated behind the guided flow reaching Summary.
  readonly canOfferApplyToRemaining = input(false);
  readonly remainingFilesCount = input(0);
  readonly applyToRemaining = model(false);

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

  /** Which guided-flow step is expanded for editing right now — never `null`; the flow's terminus
   * is the `'summary'` step rather than an empty active field (TICKET-IMP-09). */
  protected readonly activeStepId = signal<MapperStepId>('date');

  /** Single-vs-split display mode for the Amount step (TICKET-IMP-09) — transient UI state, not
   * persisted; defaults from whichever of `amount`/`debit`+`credit` a preset/saved-profile prefill
   * populated. */
  protected readonly amountMode = signal<AmountMode>('single');

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  /** The active step's live resolved sample(s) — the first data row's value for whichever column is
   * currently selected, per individual form control (TICKET-IMP-07; unchanged by the step regrouping). */
  protected readonly resolvedSamples = computed<Partial<Record<ColumnFieldKey, string>>>(() => {
    const value = this.formValue();
    const headers = this.headers();
    const sampleRow = this.previewRows()[value.headerRows ?? 1] ?? [];
    const samples: Partial<Record<ColumnFieldKey, string>> = {};
    for (const field of COLUMN_FIELD_DEFS) {
      const columnName = value[field.key];
      const index = columnName ? headers.indexOf(columnName) : -1;
      if (index !== -1 && sampleRow[index] !== undefined) {
        samples[field.key] = sampleRow[index];
      }
    }
    return samples;
  });

  /** Non-blocking "also mapped to X" warning for any two fields sharing the same source column
   * (TICKET-IMP-07; unchanged by the step regrouping). */
  protected readonly duplicateWarnings = computed<Partial<Record<ColumnFieldKey, string>>>(() => {
    const value = this.formValue();
    const fieldsByColumn = new Map<string, ColumnFieldKey[]>();
    for (const field of COLUMN_FIELD_DEFS) {
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
          .map((other) => COLUMN_FIELD_DEFS.find((field) => field.key === other)!.label);
        warnings[key] = `Also mapped to ${otherLabels.join(', ')}`;
      }
    }
    return warnings;
  });

  /** Required column fields still unmapped — surfaced so the wizard's Confirm/Next button can name
   * what's blocking it (TICKET-IMP-07; unchanged by the step regrouping). */
  readonly invalidFieldLabels = computed<string[]>(() => {
    const value = this.formValue();
    return COLUMN_FIELD_DEFS.filter((field) => field.required && !value[field.key]).map(
      (field) => field.label,
    );
  });

  /** The horizontal tracker's precomputed items — done/current/upcoming; every step is freely
   * clickable, so the user can jump anywhere in the guided flow, not just backward. */
  protected readonly stepperItems = computed<MapperStepTrackerItem[]>(() => {
    const activeIndex = MAPPER_STEPS.findIndex((step) => step.id === this.activeStepId());
    return MAPPER_STEPS.map((step, index) => ({
      id: step.id,
      label: step.label,
      state: index < activeIndex ? 'done' : index === activeIndex ? 'current' : 'upcoming',
    }));
  });

  /** The Summary step's recap — every field that's actually mapped, in `COLUMN_FIELD_DEFS` order. */
  protected readonly summaryRows = computed<MapperSummaryRow[]>(() => {
    const value = this.formValue();
    const samples = this.resolvedSamples();
    const rows: MapperSummaryRow[] = [];
    for (const field of COLUMN_FIELD_DEFS) {
      const column = value[field.key];
      if (!column) continue;
      rows.push({ label: field.label, column, sample: samples[field.key] });
    }
    return rows;
  });

  /** Row-preview valid/invalid counts, shown as badges beside the "Row preview" header rather than
   * inside `ImportPreviewStepComponent` itself — computed from the same `parsedRows` input that
   * component renders, so the two never disagree. */
  protected readonly validRowCount = computed(
    () => this.parsedRows().filter((row) => row.valid).length,
  );
  protected readonly invalidRowCount = computed(
    () => this.parsedRows().length - this.validRowCount(),
  );

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

      const rawValue = this.form.getRawValue();
      this.amountMode.set(rawValue.debit || rawValue.credit ? 'split' : 'single');

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

  /** Type-safe dynamic control lookup for the template, since `form.controls['x']` doesn't narrow. */
  protected controlFor(key: ColumnFieldKey): FormControl<string> {
    return this.form.controls[key];
  }

  /** Looks up a single-select step's field definition by key — returns the same `COLUMN_FIELD_DEFS`
   * object reference every call, so passing it as a template input doesn't churn the child's
   * `OnPush` change detection with a fresh object literal each cycle. */
  protected fieldDef(key: ColumnFieldKey): ColumnFieldDef {
    return COLUMN_FIELD_DEFS.find((field) => field.key === key)!;
  }

  /** Switches the Amount step's mode, clearing the now-inactive control(s) so a stale `debit`/
   * `credit` (or `amount`) value never silently survives into a saved/reused `MappingProfile` after
   * the user switches away from it (`resolveAmount` gives `amount` priority whenever it's truthy). */
  protected setAmountMode(mode: AmountMode): void {
    if (mode === this.amountMode()) return;
    this.amountMode.set(mode);
    if (mode === 'single') {
      this.form.patchValue({ debit: '', credit: '' });
    } else {
      this.form.patchValue({ amount: '' });
    }
  }

  protected onApplyToRemainingChange(event: Event): void {
    this.applyToRemaining.set((event.target as HTMLInputElement).checked);
  }

  /** Opens any step for editing — collapsing whichever step was previously active and marking its
   * controls touched, so a skipped required field's error surfaces once the user moves away from
   * it. Every step is reachable, including jumping ahead past ones not yet visited. */
  protected openStep(id: MapperStepId): void {
    const current = this.activeStepId();
    if (id === current) return;

    this.markStepTouched(current);
    this.activeStepId.set(id);
  }

  /** Advances the guided flow past `id` once every required control in that step is valid — a
   * no-op while a required field is still empty. */
  protected advanceFrom(id: MapperStepId): void {
    this.markStepTouched(id);
    if (this.isStepBlocked(id)) return;

    const currentIndex = MAPPER_STEPS.findIndex((step) => step.id === id);
    const next = MAPPER_STEPS[currentIndex + 1];
    if (next) this.activeStepId.set(next.id);
  }

  private markStepTouched(id: MapperStepId): void {
    const step = MAPPER_STEPS.find((s) => s.id === id);
    step?.keys.forEach((key) => this.controlFor(key).markAsTouched());
  }

  private isStepBlocked(id: MapperStepId): boolean {
    const step = MAPPER_STEPS.find((s) => s.id === id);
    return (
      step?.keys.some((key) => {
        const def = COLUMN_FIELD_DEFS.find((f) => f.key === key);
        return !!def?.required && this.controlFor(key).invalid;
      }) ?? false
    );
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
