import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
  type AbstractControl,
  type ValidationErrors,
} from '@angular/forms';
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
import { READING_DELIMITERS } from '@/core/import';
import { AccountsStore } from '@/core/state';
import {
  COLUMN_FIELD_DEFS,
  DATE_FORMAT_LABELS,
  DECIMAL_SEPARATOR_LABELS,
  DELIMITER_LABELS,
  ENCODING_LABELS,
  SIGN_CONVENTION_LABELS,
  type ColumnFieldKey,
} from '@/feature-import';
import {
  AlertComponent,
  ButtonComponent,
  FieldsetComponent,
  InputComponent,
  LabelComponent,
  MmModalComponent,
  SelectComponent,
} from '@/shared/ui';

const optionsOf = <T extends string>(values: readonly T[], labels: Record<T, string>) =>
  values.map((value) => ({ value, label: labels[value] }));

/** `Validators.required` alone accepts a value of only spaces. */
const nonBlankValidator = (control: AbstractControl): ValidationErrors | null =>
  String(control.value ?? '').trim() ? null : { blank: true };

const wholeNumberValidator = (control: AbstractControl): ValidationErrors | null =>
  Number.isInteger(control.value) && control.value >= 0 ? null : { wholeNumber: true };

/** FR-IMP-3, the wizard's rule too: one signed amount column, or money out and/or money in. */
const amountColumnValidator = (group: AbstractControl): ValidationErrors | null => {
  const { amount, debit, credit } = group.value as Record<ColumnFieldKey, string>;
  return [amount, debit, credit].some((column) => column?.trim()) ? null : { amountColumn: true };
};

const emptyColumns = (): Record<ColumnFieldKey, string> =>
  Object.fromEntries(COLUMN_FIELD_DEFS.map(({ key }) => [key, ''])) as Record<
    ColumnFieldKey,
    string
  >;

/**
 * Edit dialog for one saved import mapping (TICKET-SET-11), covering every `MappingProfile` field.
 * There is no "new" mode: a mapping is made by duplicating one, since a blank form would mean
 * typing header names with no CSV to check them against.
 */
@Component({
  selector: 'app-mapping-profile-form',
  imports: [
    ReactiveFormsModule,
    AlertComponent,
    ButtonComponent,
    FieldsetComponent,
    InputComponent,
    LabelComponent,
    MmModalComponent,
    SelectComponent,
  ],
  templateUrl: './mapping-profile-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MappingProfileFormComponent {
  readonly open = model(false);
  readonly profile = input<MappingProfile | null>(null);
  readonly saved = output<Partial<MappingProfile>>();

  protected readonly accounts = inject(AccountsStore).accounts;
  protected readonly columnFields = COLUMN_FIELD_DEFS.map(({ key, label }) => ({
    key,
    legend: `${label} column`,
  }));
  protected readonly delimiterOptions = optionsOf(READING_DELIMITERS, DELIMITER_LABELS);
  protected readonly decimalSeparatorOptions = optionsOf(
    Object.keys(DECIMAL_SEPARATOR_LABELS),
    DECIMAL_SEPARATOR_LABELS,
  );
  protected readonly dateFormatOptions = optionsOf(SUPPORTED_DATE_FORMATS, DATE_FORMAT_LABELS);
  protected readonly encodingOptions = optionsOf(SUPPORTED_ENCODINGS, ENCODING_LABELS);
  protected readonly signConventionOptions = optionsOf(SIGN_CONVENTIONS, SIGN_CONVENTION_LABELS);

  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, nonBlankValidator]],
    bankPreset: [''],
    delimiter: [';'],
    decimalSeparator: [','],
    dateFormat: ['DD/MM/YYYY' as DateFormat],
    encoding: ['utf-8' as CsvEncoding],
    headerRows: [1 as number | null, wholeNumberValidator],
    signConvention: ['as-is' as SignConvention],
    columns: this.formBuilder.nonNullable.group(
      {
        ...emptyColumns(),
        date: ['', [Validators.required, nonBlankValidator]],
        description: ['', [Validators.required, nonBlankValidator]],
      },
      { validators: amountColumnValidator },
    ),
    defaultAccountId: [''],
    headerSignature: [''],
  });

  /** Getters, not `computed()`: a reactive-forms control's validity is not a signal. */
  protected get nameError(): string {
    const control = this.form.controls.name;
    return control.touched && control.invalid ? 'Give the mapping a name.' : '';
  }

  protected get headerRowsError(): string {
    const control = this.form.controls.headerRows;
    return control.touched && control.invalid ? 'Enter a whole number, 0 or more.' : '';
  }

  protected get columnErrors(): Partial<Record<ColumnFieldKey, string>> {
    const group = this.form.controls.columns;
    const { date, description, amount } = group.controls;
    return {
      date: date.touched && date.invalid ? 'Name the column this comes from.' : '',
      description:
        description.touched && description.invalid ? 'Name the column this comes from.' : '',
      amount:
        amount.touched && group.hasError('amountColumn')
          ? 'Name an amount column, or a money out and/or money in column.'
          : '',
    };
  }

  constructor() {
    effect(() => {
      const profile = this.profile();
      if (this.open() && profile) this.resetForm(profile);
    });
  }

  private resetForm(profile: MappingProfile): void {
    this.form.reset({
      name: profile.name,
      bankPreset: profile.bankPreset ?? '',
      delimiter: profile.delimiter,
      decimalSeparator: profile.decimalSeparator,
      dateFormat: profile.dateFormat,
      encoding: profile.encoding,
      headerRows: profile.headerRows,
      signConvention: profile.signConvention,
      columns: { ...emptyColumns(), ...profile.columns },
      defaultAccountId: profile.defaultAccountId == null ? '' : String(profile.defaultAccountId),
      headerSignature: (profile.headerSignature ?? []).join('\n'),
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    // Blank optional columns are omitted, as the wizard saves them. The other optional fields go
    // out as `undefined`, which `ApiClient` sends as the `null` that clears them on the server.
    const columns = Object.fromEntries(
      Object.entries(value.columns)
        .map(([key, column]) => [key, column.trim()])
        .filter(([, column]) => column),
    ) as MappingProfileColumns;
    const headerSignature = value.headerSignature
      .split('\n')
      .map((header) => header.trim())
      .filter(Boolean);
    this.saved.emit({
      name: value.name.trim(),
      bankPreset: value.bankPreset.trim() || undefined,
      delimiter: value.delimiter,
      decimalSeparator: value.decimalSeparator,
      dateFormat: value.dateFormat,
      encoding: value.encoding,
      headerRows: value.headerRows!,
      signConvention: value.signConvention,
      columns,
      defaultAccountId: value.defaultAccountId ? Number(value.defaultAccountId) : undefined,
      headerSignature: headerSignature.length ? headerSignature : undefined,
    });
    this.open.set(false);
  }

  protected cancel(): void {
    this.open.set(false);
  }
}
