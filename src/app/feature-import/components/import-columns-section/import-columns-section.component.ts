import { ChangeDetectionStrategy, Component, computed, input, model, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import type { AmountMode } from '@/core/import';
import {
  ButtonComponent,
  FieldsetComponent,
  FlexComponent,
  InputComponent,
  LabelComponent,
  PaperComponent,
  TabsComponent,
  TypographyComponent,
  type TabDefinition,
} from '@/shared/ui';
import type { ColumnControls, ColumnGroupVm, ColumnRowVm } from '../../column-statements';
import { ImportColumnRowComponent } from '../import-column-row/import-column-row.component';

type RowVm = { vm: ColumnRowVm; control: FormControl<string> };

type GroupVm = Omit<ColumnGroupVm, 'rows'> & { rows: RowVm[] };

const AMOUNT_TABS: TabDefinition[] = [
  { label: 'One column', value: 'single' },
  { label: 'Money out + money in', value: 'split' },
];

/**
 * "Columns" (TICKET-IMP-17): one row per field — its select of the file's headers, what the first
 * line reads as, and a sure / check-this / not-found marker — in two groups, what an import needs
 * and what makes rules and transfers smarter. Presentational: the rows come from
 * `column-statements.ts`, and each select is bound straight to the host's own form control, so a
 * pick is an ordinary form edit. Folded, it is one line naming the needed columns, with Change.
 */
@Component({
  selector: 'app-import-columns-section',
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    FieldsetComponent,
    FlexComponent,
    ImportColumnRowComponent,
    InputComponent,
    LabelComponent,
    PaperComponent,
    TabsComponent,
    TypographyComponent,
  ],
  templateUrl: './import-columns-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportColumnsSectionComponent {
  readonly fileName = input.required<string>();
  readonly headers = input.required<string[]>();
  readonly groups = input.required<ColumnGroupVm[]>();
  readonly controls = input.required<ColumnControls>();
  readonly amountMode = input.required<AmountMode>();
  readonly open = input.required<boolean>();
  readonly summary = input.required<string>();
  /** Where a folded mapping came from, or why the section is open, in one sentence. */
  readonly note = input('');
  /** The needed fields still without a column; "Looks right" waits until this is empty. */
  readonly missing = input<string[]>([]);
  readonly nameControl = input.required<FormControl<string>>();
  readonly rememberControl = input.required<FormControl<boolean>>();

  // The wizard's "apply to remaining files" (TICKET-IMP-02), until TICKET-IMP-15 replaces it.
  readonly canOfferApplyToRemaining = input(false);
  readonly remainingFilesCount = input(0);
  readonly applyToRemaining = model(false);

  readonly amountModeChange = output<AmountMode>();
  readonly confirmed = output<void>();
  readonly changeRequested = output<void>();

  protected readonly amountTabs = AMOUNT_TABS;

  protected readonly groupsVm = computed<GroupVm[]>(() =>
    this.groups().map((group) => ({
      ...group,
      rows: group.rows.map((vm) => ({ vm, control: this.controls()[vm.key] })),
    })),
  );

  protected readonly canConfirm = computed(() => this.missing().length === 0);

  protected readonly missingText = computed(() =>
    this.missing().length > 0 ? `Pick a column for ${this.missing().join(', ')}.` : '',
  );

  protected readonly remainingText = computed(() => {
    const count = this.remainingFilesCount();
    return `Use these columns for the remaining ${count} file${count === 1 ? '' : 's'}`;
  });

  protected selectAmountMode(value: string | undefined): void {
    if (value === 'single' || value === 'split') this.amountModeChange.emit(value);
  }

  protected onApplyToRemainingChange(event: Event): void {
    this.applyToRemaining.set((event.target as HTMLInputElement).checked);
  }
}
