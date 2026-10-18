import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import {
  BadgeComponent,
  ButtonComponent,
  FlexComponent,
  LabelComponent,
  PaperComponent,
  TypographyComponent,
  type BadgeColor,
} from '@/shared/ui';
import type {
  ReadingControls,
  ReadingKey,
  ReadingLineVm,
  ReadingOptionVm,
  ReadingStatementVm,
} from '../../reading-statements';
import { ImportReadingLinesComponent } from '../import-reading-lines/import-reading-lines.component';

type OptionRowVm = ReadingOptionVm & { text: string };

type StatementRowVm = ReadingStatementVm & {
  expanded: boolean;
  chipLabel: string;
  chipColor: BadgeColor;
  containerClass: string;
  radioName: string;
  /** Untyped on purpose: one row's control is a number (the header line), the rest are strings. */
  control: FormControl;
  options: OptionRowVm[];
};

const ROW_CLASS = 'flex flex-col gap-2 border-t border-base-200 px-2 py-2';

/**
 * "How the file is read" (TICKET-IMP-16): the file's first lines as currently read, then one plain
 * statement per reading setting with its evidence and a sure / check-this marker. Presentational —
 * the statements are built by `reading-statements.ts` from the lines the host re-reads whenever a
 * setting changes, so the evidence always matches the lines above it. Each row's options are radios
 * bound straight to the host's own form control, so a pick is an ordinary form edit.
 *
 * Folded, it is one line saying how the file is read, with a Change action. Open, the unsure rows
 * show their options straight away; any other row shows its options once its title is clicked.
 */
@Component({
  selector: 'app-import-reading-section',
  imports: [
    ReactiveFormsModule,
    BadgeComponent,
    ButtonComponent,
    FlexComponent,
    ImportReadingLinesComponent,
    LabelComponent,
    PaperComponent,
    TypographyComponent,
  ],
  templateUrl: './import-reading-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportReadingSectionComponent {
  readonly fileName = input.required<string>();
  readonly delimiter = input.required<string>();
  readonly lines = input.required<ReadingLineVm[]>();
  readonly statements = input.required<ReadingStatementVm[]>();
  readonly controls = input.required<ReadingControls>();
  readonly summary = input.required<string>();
  /** Why the section is open (or where a folded reading came from), in one sentence. */
  readonly note = input('');
  readonly open = input.required<boolean>();

  readonly confirmed = output<void>();
  readonly changeRequested = output<void>();

  /** Rows the user opened by clicking their title, on top of the unsure ones that start open. */
  private readonly opened = signal<ReadingKey[]>([]);

  protected readonly rows = computed<StatementRowVm[]>(() =>
    this.statements().map((statement) => {
      const isSure = statement.confidence === 'sure';
      return {
        ...statement,
        expanded: !isSure || this.opened().includes(statement.key),
        chipLabel: isSure ? '✓ sure' : 'check this',
        chipColor: isSure ? 'success' : 'warning',
        containerClass: isSure ? ROW_CLASS : `${ROW_CLASS} rounded-box bg-warning/10`,
        radioName: `reading-${statement.key}`,
        control: this.controls()[statement.key] as FormControl,
        options: statement.options.map((option) => ({
          ...option,
          text: option.preview ? `${option.label} · ${option.preview}` : option.label,
        })),
      };
    }),
  );

  protected toggleRow(key: ReadingKey): void {
    this.opened.update((keys) =>
      keys.includes(key) ? keys.filter((open) => open !== key) : [...keys, key],
    );
  }
}
