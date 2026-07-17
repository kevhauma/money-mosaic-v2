import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  model,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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
  FieldsetComponent,
  InputComponent,
  LabelComponent,
  SelectComponent,
  TypographyComponent,
} from '@/shared/ui';
import { MappingProfilesStore } from '../../mapping-profiles.store';

export type ImportMappingResult = { mappingProfile: Omit<MappingProfile, 'id'> };

const SIGN_CONVENTION_LABELS: Record<SignConvention, string> = {
  'as-is': 'As-is',
  'debit-negative': 'Debit negative (default)',
  'credit-negative': 'Credit negative',
};

@Component({
  selector: 'app-import-map-step',
  imports: [
    ReactiveFormsModule,
    AlertComponent,
    FieldsetComponent,
    InputComponent,
    LabelComponent,
    SelectComponent,
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
