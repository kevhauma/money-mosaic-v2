import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  model,
  output,
} from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import type { Rule, RuleCondition } from '@/core/data-access';
import { withEndedSuffix } from '@/core/categorisation';
import { CategoriesStore } from '@/core/state';
import {
  AlertComponent,
  ButtonComponent,
  DividerComponent,
  FieldsetComponent,
  FlexComponent,
  InputComponent,
  LabelComponent,
  MmModalComponent,
  SelectComponent,
  TypographyComponent,
} from '@/shared/ui';
import {
  NUMERIC_CONDITION_FIELDS,
  regexPatternMaxLength,
  type ConditionGroup,
} from '../../rule-condition-editor';
import { RuleConditionRowComponent } from '../rule-condition-row/rule-condition-row.component';

export type RuleFormValue = Omit<Rule, 'id'>;

@Component({
  selector: 'app-rule-form',
  imports: [
    ReactiveFormsModule,
    AlertComponent,
    ButtonComponent,
    DividerComponent,
    FieldsetComponent,
    FlexComponent,
    InputComponent,
    LabelComponent,
    RuleConditionRowComponent,
    SelectComponent,
    MmModalComponent,
    TypographyComponent,
  ],
  templateUrl: './rule-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuleFormComponent {
  readonly open = model(false);
  readonly rule = input<Rule | null>(null);
  readonly defaultPriority = input(10);
  /** Shown as an inline note when opened pre-filled from a source that couldn't convert every axis (TICKET-CAT-07). */
  readonly excludedFiltersNote = input<string | null>(null);
  readonly saved = output<RuleFormValue>();

  /** True once `rule()` is a persisted rule (has an `id`) — false for a fresh add, including a pre-filled draft with no `id` yet (TICKET-CAT-07). */
  protected readonly isEditingExisting = computed(() => this.rule()?.id != null);

  private readonly categoriesStore = inject(CategoriesStore);

  /**
   * Every active category, ended ones marked rather than hidden (TICKET-CAT-11).
   *
   * **Deliberately unfiltered**, unlike the transaction pickers: a rule runs over whatever dates the
   * next import happens to contain, so there is no single date to test a window against, and hiding
   * an ended category would break a rule that is still perfectly valid for backfilled history. The
   * suffix is a nudge, not a rule — assigning an ended category to new rows is the user's call.
   */
  protected readonly categoryOptions = computed(() => {
    const today = new Date().toISOString().slice(0, 10);

    return this.categoriesStore.activeCategories().map((category) => ({
      value: String(category.id),
      label: withEndedSuffix(category.name, category, today),
    }));
  });

  private readonly formBuilder = inject(FormBuilder);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    categoryId: ['', Validators.required],
    priority: [10, Validators.required],
    enabled: [true],
    continueOnMatch: [false],
    conditionMatch: this.formBuilder.nonNullable.control<'all' | 'any'>('all'),
    conditions: this.formBuilder.array<ConditionGroup>([]),
  });

  protected get conditionsArray(): FormArray<ConditionGroup> {
    return this.form.controls.conditions;
  }

  constructor() {
    effect(() => {
      if (this.open()) {
        this.resetForm();
      }
    });
  }

  protected addCondition(): void {
    this.conditionsArray.push(this.newConditionGroup());
  }

  protected removeCondition(index: number): void {
    this.conditionsArray.removeAt(index);
  }

  private newConditionGroup(condition?: RuleCondition): ConditionGroup {
    const [value, valueTo] = this.splitConditionValue(condition);
    return this.formBuilder.nonNullable.group({
      field: this.formBuilder.nonNullable.control<RuleCondition['field']>(
        condition?.field ?? 'description',
      ),
      operator: this.formBuilder.nonNullable.control<RuleCondition['operator']>(
        condition?.operator ?? 'contains',
      ),
      value: [value, [Validators.required, regexPatternMaxLength]],
      valueTo: [valueTo],
    });
  }

  private splitConditionValue(condition?: RuleCondition): [string, string] {
    if (!condition) {
      return ['', ''];
    }
    if (condition.operator === 'between') {
      const [min, max] = condition.value as [number, number];
      return [String(min), String(max)];
    }
    return [String(condition.value), ''];
  }

  private resetForm(): void {
    const existing = this.rule();

    this.conditionsArray.clear();
    const conditions = existing?.conditions.length ? existing.conditions : [undefined];
    for (const condition of conditions) {
      this.conditionsArray.push(this.newConditionGroup(condition));
    }

    this.form.patchValue({
      name: existing?.name ?? '',
      // A pre-filled draft (TICKET-CAT-07) carries a `0` sentinel setCategoryId — Dexie
      // autoIncrement ids never assign 0, so this leaves the category genuinely unselected.
      categoryId: existing?.action.setCategoryId ? String(existing.action.setCategoryId) : '',
      priority: existing?.priority ?? this.defaultPriority(),
      enabled: existing?.enabled ?? true,
      continueOnMatch: existing?.continueOnMatch ?? false,
      conditionMatch: existing?.conditionMatch ?? 'all',
    });
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const conditions: RuleCondition[] = raw.conditions.map((condition) => ({
      field: condition.field,
      operator: condition.operator,
      value: this.parseConditionValue(condition),
    }));

    this.saved.emit({
      name: raw.name,
      priority: raw.priority,
      enabled: raw.enabled,
      continueOnMatch: raw.continueOnMatch,
      conditionMatch: raw.conditionMatch,
      conditions,
      action: { setCategoryId: Number(raw.categoryId) },
    });
    this.open.set(false);
  }

  private parseConditionValue(condition: {
    field: RuleCondition['field'];
    operator: RuleCondition['operator'];
    value: string;
    valueTo: string;
  }): RuleCondition['value'] {
    const isNumeric = NUMERIC_CONDITION_FIELDS.includes(condition.field);
    if (condition.operator === 'between') {
      return [Number(condition.value), Number(condition.valueTo)];
    }
    return isNumeric ? Number(condition.value) : condition.value;
  }

  protected cancel(): void {
    this.open.set(false);
  }
}
