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
import { merge } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  SIGN_CONVENTIONS,
  type CsvEncoding,
  type DateFormat,
  type MappingProfile,
  type MappingProfileColumns,
  type SignConvention,
} from '@/core/data-access';
import {
  CsvImportService,
  guessColumns,
  guessReadingOptions,
  type AmountMode,
  type ColumnGuess,
  type DuplicateHandling,
  type ParsedRowResult,
  type ReadingOptions,
} from '@/core/import';
import { EMPTY_DUPLICATE_SCAN, type DuplicateScanVm } from '../../duplicate-scan';
import {
  AlertComponent,
  BadgeComponent,
  FieldsetComponent,
  FlexComponent,
  LabelComponent,
  SelectComponent,
  TableComponent,
  TypographyComponent,
} from '@/shared/ui';
import { MappingProfilesStore } from '../../mapping-profiles.store';
import {
  COLUMN_FIELD_DEFS,
  SIGN_CONVENTION_LABELS,
  type ImportMappingResult,
} from '../../column-mapping';
import {
  columnGroups,
  columnsSummary,
  mappingNameFor,
  missingColumns,
  type ColumnControls,
  type ColumnGroupVm,
} from '../../column-statements';
import { ImportColumnsSectionComponent } from '../import-columns-section/import-columns-section.component';
import { ImportPreviewStepComponent } from '../import-preview-step/import-preview-step.component';
import { ImportReadingSectionComponent } from '../import-reading-section/import-reading-section.component';
import {
  RECOGNISED_CONFIDENCE,
  allSure,
  readingLines,
  readingNote,
  readingSource,
  readingStatements,
  readingSummary,
  splitGuess,
  type ReadingConfidence,
  type ReadingControls,
  type ReadingLineVm,
  type ReadingStatementVm,
} from '../../reading-statements';

/** Every column cleared — patched under a profile's own columns, because this step is reused from one
 * file to the next and `patchValue` keeps any control the profile does not name (a guessed `debit`
 * from the previous file would otherwise put a KBC file in split mode). */
const EMPTY_COLUMNS = Object.fromEntries(COLUMN_FIELD_DEFS.map(({ key }) => [key, '']));

@Component({
  selector: 'app-import-map-step',
  imports: [
    ReactiveFormsModule,
    AlertComponent,
    BadgeComponent,
    FieldsetComponent,
    FlexComponent,
    ImportColumnsSectionComponent,
    ImportPreviewStepComponent,
    ImportReadingSectionComponent,
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
  // `parseError`/`headerMismatchMessage` are read in the template only via
  // `@else if (fn(); as alias)` (import-map-step.component.html:197,201), which fallow's input
  // analysis doesn't resolve — it reports both as unused inputs. Fallow 3.5.1 ignores both
  // `fallow-ignore-next-line` and `fallow-ignore-file` for this family (it parses the comment,
  // then reports it stale *and* still emits the finding), so the two live in the committed
  // baseline instead: `.fallow/baseline.json`, see TICKET-CLEANUP-06.
  readonly parseError = input<string | null>(null);
  readonly headerMismatchMessage = input<string | null>(null);
  readonly parsing = input(false);
  readonly parseWarnings = input<string[]>([]);

  // Wizard-owned "apply to remaining files" state (TICKET-IMP-09) — gating/state stay wizard-owned
  // (tied to `runCommit()`/`batchMapping`); the checkbox itself renders in the Columns section.
  readonly canOfferApplyToRemaining = input(false);
  readonly remainingFilesCount = input(0);
  readonly applyToRemaining = model(false);

  // Wizard-owned duplicate scan (TICKET-IMP-14) — the session runs the same partition the commit
  // will and joins it into one view-model (`duplicate-scan.ts`); this step renders it and relays
  // the user's choice back up.
  readonly duplicateScan = input<DuplicateScanVm>(EMPTY_DUPLICATE_SCAN);
  readonly duplicateHandling = model<DuplicateHandling>('skip');

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

  // "How the file is read" (TICKET-IMP-16). While it is open the columns and previews wait and
  // `result` stays null, so nothing is parsed with a reading the user has not confirmed yet.
  protected readonly readingOpen = signal(false);
  private readonly readingConfidence = signal<ReadingConfidence>(RECOGNISED_CONFIDENCE);
  private readonly recognisedFrom = signal<string | null>(null);
  /** The same first lines read with the other encoding — what the encoding options preview. */
  private readonly otherEncodingRows = signal<string[][]>([]);
  /** Bumped per re-read, so a slow read never overwrites the lines of a newer setting. */
  private previewToken = 0;

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
    rememberForAccount: [true],
  });

  /** The five reading controls, handed to the section so its radios bind to them directly. */
  protected readonly readingControls: ReadingControls = {
    encoding: this.form.controls.encoding,
    delimiter: this.form.controls.delimiter,
    headerRows: this.form.controls.headerRows,
    dateFormat: this.form.controls.dateFormat,
    decimalSeparator: this.form.controls.decimalSeparator,
  };

  /** The nine column controls, handed to the Columns section so its selects bind to them. */
  protected readonly columnControls = Object.fromEntries(
    COLUMN_FIELD_DEFS.map((field) => [field.key, this.form.controls[field.key]]),
  ) as ColumnControls;

  // "Columns" (TICKET-IMP-17). Opens for a file no mapping recognises, with the guess filled in;
  // while it is open `result` stays null, as it does while the reading section is open.
  protected readonly columnsOpen = signal(false);
  /** One signed column, or money out + money in — from the guess or a recognised mapping. */
  protected readonly amountMode = signal<AmountMode>('single');
  /** The header line the columns were last guessed for, so confirming an unchanged reading again
   * keeps the user's own picks instead of guessing over them. */
  private guessedHeaders: string | null = null;

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  protected readonly readingOptions = computed<ReadingOptions>(() => {
    this.formValue();
    const { encoding, delimiter, headerRows, dateFormat, decimalSeparator } =
      this.form.getRawValue();
    return { encoding, delimiter, headerRows, dateFormat, decimalSeparator };
  });

  protected readonly readingStatementsVm = computed<ReadingStatementVm[]>(() =>
    readingStatements({
      rows: this.previewRows(),
      otherEncodingRows: this.otherEncodingRows(),
      options: this.readingOptions(),
      confidence: this.readingConfidence(),
    }),
  );
  protected readonly readingLinesVm = computed<ReadingLineVm[]>(() =>
    readingLines(this.previewRows(), this.readingOptions().headerRows),
  );
  protected readonly readingSummaryText = computed(() => readingSummary(this.readingOptions()));
  protected readonly readingNoteText = computed(() =>
    readingNote(this.readingConfidence(), this.recognisedFrom(), this.readingOpen()),
  );

  private readonly dataRows = computed(() =>
    this.previewRows().slice(this.readingOptions().headerRows),
  );

  /** What the file's headers and values suggest under the reading as it stands. The section's
   * markers compare each control against it, so a recognised mapping is checked against it too. */
  private readonly columnGuess = computed<ColumnGuess>(() =>
    guessColumns(this.headers(), this.dataRows(), this.readingOptions()),
  );

  protected readonly columnGroupsVm = computed<ColumnGroupVm[]>(() =>
    columnGroups({
      headers: this.headers(),
      rows: this.dataRows(),
      value: this.formValue(),
      guess: this.columnGuess(),
      amountMode: this.amountMode(),
      reading: this.readingOptions(),
      signConvention: this.formValue().signConvention ?? 'as-is',
    }),
  );
  protected readonly missingColumnLabels = computed(() =>
    missingColumns(this.formValue(), this.amountMode()),
  );
  protected readonly columnsSummaryText = computed(() =>
    columnsSummary(this.formValue(), this.amountMode()),
  );
  protected readonly columnsNoteText = computed(() => {
    const source = this.recognisedFrom();
    if (source) return `From ${source}`;
    return this.columnsOpen() ? 'Guessed from the file' : 'Checked by you';
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

  protected setDuplicateHandling(handling: DuplicateHandling): void {
    this.duplicateHandling.set(handling);
  }

  // Tracks the file we last ran detection for, so re-detection reacts to the file reference itself
  // rather than a one-shot flag — correctness no longer depends on the wizard destroying/recreating
  // this component between files (CR-1.5).
  private detectedFile: File | null = null;

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.updateResult());
    // The section's radios write these controls directly; the three that change how the lines
    // split or decode re-read them, so the evidence always describes the file as now read.
    const { delimiter, encoding, headerRows } = this.form.controls;
    merge(delimiter.valueChanges, encoding.valueChanges, headerRows.valueChanges)
      .pipe(takeUntilDestroyed())
      .subscribe(() => void this.refreshPreview());
    effect(() => {
      const file = this.file();
      if (file === this.detectedFile) return;
      this.detectedFile = file;
      void this.detectAndPrefill(file);
    });
  }

  private async detectAndPrefill(file: File): Promise<void> {
    this.loading.set(true);
    this.columnsOpen.set(false);
    this.guessedHeaders = null;
    try {
      const { text, utf8Valid } = await this.csvImportService.readSample(file);
      const guessed = splitGuess(guessReadingOptions(text, utf8Valid));

      const preset =
        (await this.mappingProfilesStore.detectTemplateForFile((encoding) =>
          this.csvImportService.detectHeaders(file, guessed.options.delimiter, encoding),
        )) ?? null;
      const savedProfile = preset
        ? this.mappingProfilesStore.findRemembered(preset, this.accountId())
        : undefined;

      this.detectedPreset.set(preset);
      this.usedSavedProfile.set(!!savedProfile);

      // A recognised file takes its reading from its mapping; anything else from the guess, and
      // only opens the section when the guess is unsure of something.
      const recognisedFrom = readingSource(savedProfile?.name, preset?.name);
      const confidence = recognisedFrom ? RECOGNISED_CONFIDENCE : guessed.confidence;
      this.recognisedFrom.set(recognisedFrom);
      this.readingConfidence.set(confidence);
      this.readingOpen.set(!allSure(confidence));

      if (savedProfile) {
        this.form.patchValue({
          name: savedProfile.name,
          delimiter: savedProfile.delimiter,
          decimalSeparator: savedProfile.decimalSeparator,
          dateFormat: savedProfile.dateFormat,
          encoding: savedProfile.encoding,
          headerRows: savedProfile.headerRows,
          signConvention: savedProfile.signConvention,
          ...EMPTY_COLUMNS,
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
          ...EMPTY_COLUMNS,
          ...preset.columns,
        });
      } else {
        // Open before the patch, so the previous file's columns never make a result for this one
        // in the moment before the guess replaces them.
        this.columnsOpen.set(true);
        this.form.patchValue({ ...guessed.options, name: mappingNameFor(file.name) });
      }

      const rawValue = this.form.getRawValue();
      this.amountMode.set(rawValue.debit || rawValue.credit ? 'split' : 'single');

      await this.refreshPreview();
      // A recognised file brings its columns; anything else gets the guess — straight away when
      // the reading is settled, or once the user confirms it, since the header line may move.
      if (!recognisedFrom && !this.readingOpen()) this.applyColumnGuess();
      // Once more now the amount mode and the headers are this file's: the patches above ran
      // `updateResult` with the previous file's, and the saved header signature is read from them.
      this.updateResult();
    } finally {
      this.loading.set(false);
    }
  }

  private async refreshPreview(): Promise<void> {
    const token = ++this.previewToken;
    const { delimiter, encoding, headerRows } = this.form.getRawValue();
    const otherEncoding = encoding === 'utf-8' ? 'windows-1252' : 'utf-8';
    const [rows, otherRows] = await Promise.all(
      [encoding, otherEncoding].map((readAs) =>
        this.csvImportService.previewRawRows(this.file(), delimiter, readAs, headerRows + 20),
      ),
    );
    if (token !== this.previewToken) return;
    this.headers.set(rows[headerRows - 1] ?? []);
    this.previewRows.set(rows);
    this.otherEncodingRows.set(otherRows);
  }

  protected confirmReading(): void {
    this.readingOpen.set(false);
    if (!this.recognisedFrom()) this.applyColumnGuess();
    this.updateResult();
  }

  protected changeReading(): void {
    this.readingOpen.set(true);
    this.updateResult();
  }

  /** Fills the column controls from the guess and opens the section for the user to check it —
   * unless these are the headers already guessed for, whose columns the user may have changed. */
  private applyColumnGuess(): void {
    const headersKey = JSON.stringify(this.headers());
    if (headersKey === this.guessedHeaders) return;
    this.guessedHeaders = headersKey;

    const { amountMode, fields } = this.columnGuess();
    this.amountMode.set(amountMode);
    this.form.patchValue(
      Object.fromEntries(COLUMN_FIELD_DEFS.map(({ key }) => [key, fields[key].column ?? ''])),
    );
    this.columnsOpen.set(true);
  }

  protected confirmColumns(): void {
    if (this.missingColumnLabels().length > 0) return;
    this.columnsOpen.set(false);
    this.updateResult();
  }

  protected changeColumns(): void {
    this.columnsOpen.set(true);
    this.updateResult();
  }

  /** Switches the amount between one column and a money out + money in pair, clearing the side
   * left behind so a stale `debit`/`credit` (or `amount`) never survives into a saved mapping —
   * `resolveAmount` gives `amount` priority whenever it is set. The guess fills the new side. */
  protected setAmountMode(mode: AmountMode): void {
    if (mode === this.amountMode()) return;
    this.amountMode.set(mode);
    const { fields } = this.columnGuess();
    if (mode === 'single') {
      this.form.patchValue({ debit: '', credit: '', amount: fields.amount.column ?? '' });
    } else {
      this.form.patchValue({
        amount: '',
        debit: fields.debit.column ?? '',
        credit: fields.credit.column ?? '',
      });
    }
  }

  private updateResult(): void {
    const missing = missingColumns(this.form.getRawValue(), this.amountMode()).length > 0;
    const blocked = this.readingOpen() || this.columnsOpen() || missing;
    if (this.form.invalid || blocked) {
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
