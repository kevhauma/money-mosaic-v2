import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  model,
  output,
  viewChild,
} from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import type { Rule, RuleCondition } from '@/core/data-access';
import { OPERATORS_BY_FIELD } from '@/core/categorisation';
import { AccountsStore } from '@/feature-accounts';
import { CategoriesStore } from '../../categories.store';

export type RuleFormValue = Omit<Rule, 'id'>;

type ConditionGroup = FormGroup<{
  field: FormControl<RuleCondition['field']>;
  operator: FormControl<RuleCondition['operator']>;
  value: FormControl<string>;
  valueTo: FormControl<string>;
}>;

const NUMERIC_FIELDS: RuleCondition['field'][] = ['amount', 'accountId'];

@Component({
  selector: 'app-rule-form',
  imports: [ReactiveFormsModule],
  templateUrl: './rule-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RuleFormComponent {
  readonly open = model(false);
  readonly rule = input<Rule | null>(null);
  readonly defaultPriority = input(10);
  readonly saved = output<RuleFormValue>();

  protected readonly categoriesStore = inject(CategoriesStore);
  protected readonly accountsStore = inject(AccountsStore);

  protected readonly fieldOptions: { value: RuleCondition['field']; label: string }[] = [
    { value: 'description', label: 'Description' },
    { value: 'counterpartyName', label: 'Counterparty name' },
    { value: 'counterpartyIban', label: 'Counterparty IBAN' },
    { value: 'amount', label: 'Amount' },
    { value: 'accountId', label: 'Account' },
  ];

  protected readonly operatorLabels: Record<RuleCondition['operator'], string> = {
    contains: 'contains',
    equals: 'equals',
    regex: 'matches regex',
    '>': 'is greater than',
    '<': 'is less than',
    between: 'is between',
  };

  private readonly formBuilder = inject(FormBuilder);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', Validators.required],
    categoryId: ['', Validators.required],
    priority: [10, Validators.required],
    enabled: [true],
    continueOnMatch: [false],
    conditions: this.formBuilder.array<ConditionGroup>([]),
  });

  protected get conditionsArray(): FormArray<ConditionGroup> {
    return this.form.controls.conditions;
  }

  constructor() {
    effect(() => {
      const dialogElement = this.dialog().nativeElement;
      if (this.open()) {
        this.resetForm();
        dialogElement.showModal?.();
      } else {
        dialogElement.close?.();
      }
    });
  }

  protected operatorsFor(group: ConditionGroup): RuleCondition['operator'][] {
    return OPERATORS_BY_FIELD[group.controls.field.value];
  }

  protected isNumericField(group: ConditionGroup): boolean {
    return NUMERIC_FIELDS.includes(group.controls.field.value);
  }

  protected isAccountField(group: ConditionGroup): boolean {
    return group.controls.field.value === 'accountId';
  }

  protected isBetween(group: ConditionGroup): boolean {
    return group.controls.operator.value === 'between';
  }

  protected onFieldChange(group: ConditionGroup): void {
    const validOperators = this.operatorsFor(group);
    if (!validOperators.includes(group.controls.operator.value)) {
      group.controls.operator.setValue(validOperators[0]);
    }
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
      value: [value, Validators.required],
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
      categoryId: existing ? String(existing.action.setCategoryId) : '',
      priority: existing?.priority ?? this.defaultPriority(),
      enabled: existing?.enabled ?? true,
      continueOnMatch: existing?.continueOnMatch ?? false,
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
    const isNumeric = NUMERIC_FIELDS.includes(condition.field);
    if (condition.operator === 'between') {
      return [Number(condition.value), Number(condition.valueTo)];
    }
    return isNumeric ? Number(condition.value) : condition.value;
  }

  protected cancel(): void {
    this.open.set(false);
  }
}
