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
import type { MappingProfile, MappingProfileColumns } from '@/core/data-access';
import { CsvImportService, detectBankPreset, guessDelimiter, type BankPreset } from '@/core/import';
import { MappingProfilesStore } from '../../mapping-profiles.store';

export type ImportMappingResult = { mappingProfile: Omit<MappingProfile, 'id'> };

const DATE_FORMATS = ['DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY'];
const ENCODINGS = ['utf-8', 'windows-1252'];

@Component({
  selector: 'app-import-map-step',
  imports: [ReactiveFormsModule],
  templateUrl: './import-map-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportMapStepComponent {
  readonly file = input.required<File>();
  readonly accountId = input.required<number>();
  readonly result = model<ImportMappingResult | null>(null);

  protected readonly dateFormats = DATE_FORMATS;
  protected readonly encodings = ENCODINGS;

  private readonly csvImportService = inject(CsvImportService);
  private readonly mappingProfilesStore = inject(MappingProfilesStore);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly loading = signal(true);
  protected readonly headers = signal<string[]>([]);
  protected readonly previewRows = signal<string[][]>([]);
  protected readonly detectedPreset = signal<BankPreset | null>(null);
  protected readonly usedSavedProfile = signal(false);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['Custom mapping', Validators.required],
    delimiter: [';', Validators.required],
    decimalSeparator: [',', Validators.required],
    dateFormat: ['DD/MM/YYYY', Validators.required],
    encoding: ['utf-8', Validators.required],
    headerRows: [1, [Validators.required, Validators.min(1)]],
    signConvention: ['as-is', Validators.required],
    date: ['', Validators.required],
    amount: [''],
    debit: [''],
    credit: [''],
    description: ['', Validators.required],
    counterpartyName: [''],
    counterpartyIban: [''],
    balance: [''],
    rememberForAccount: [false],
  });

  private detectionStarted = false;

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed()).subscribe(() => this.updateResult());
    effect(() => {
      const file = this.file();
      if (this.detectionStarted) return;
      this.detectionStarted = true;
      void this.detectAndPrefill(file);
    });
  }

  private async detectAndPrefill(file: File): Promise<void> {
    this.loading.set(true);
    try {
      const sampleBuffer = await file.slice(0, 8192).arrayBuffer();
      const sampleText = new TextDecoder('utf-8').decode(sampleBuffer);
      const guessedDelimiter = guessDelimiter(sampleText);

      const headers = await this.csvImportService.detectHeaders(file, guessedDelimiter, 'utf-8');
      const preset = detectBankPreset(headers);
      const savedProfile = preset
        ? this.mappingProfilesStore.findForBankAndAccount(preset.id, this.accountId())
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
          name: preset.label,
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
      balance: value.balance || undefined,
    };

    this.result.set({
      mappingProfile: {
        name: value.name,
        bankPreset: this.detectedPreset()?.id,
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
