import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import type { RuleCondition } from '@/core/data-access';
import { OPERATORS_BY_FIELD } from '@/core/categorisation';
import { AccountsStore } from '@/core/state';
import { ButtonComponent, InputComponent, LabelComponent, SelectComponent } from '@/shared/ui';
import {
  CONDITION_FIELD_OPTIONS,
  editorKindFor,
  MAX_REGEX_PATTERN_LENGTH,
  type ConditionEditorKind,
  type ConditionGroup,
} from '../../rule-condition-editor';
import { OPERATOR_LABELS } from '../../rule-labels';

/**
 * One row of the rule form's condition `FormArray` (TICKET-CAT-08, CR4-1 §6 Option B): the
 * field/operator selects, the value editor picked by a single `@switch` on `editorKindFor`, and
 * the remove button.
 *
 * The group arrives as a typed `input()` rather than through the `ControlContainer`/`formGroupName`
 * indirection: the row needs the `ConditionGroup` itself anyway (for the discriminant, the operator
 * list, and the regex error check), so binding `[formGroup]` inside keeps it type-safe with no
 * extra wiring. `display: contents` on the host keeps the parent `mm-flex` column laying out the
 * rows themselves.
 */
@Component({
  selector: 'app-rule-condition-row',
  imports: [ReactiveFormsModule, ButtonComponent, InputComponent, LabelComponent, SelectComponent],
  templateUrl: './rule-condition-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
})
export class RuleConditionRowComponent {
  readonly group = input.required<ConditionGroup>();
  /** False for the last remaining condition — a rule always keeps at least one. */
  readonly canRemove = input(true);

  readonly removed = output<void>();

  protected readonly accountsStore = inject(AccountsStore);

  protected readonly fieldOptions = CONDITION_FIELD_OPTIONS;
  protected readonly operatorLabels = OPERATOR_LABELS;
  protected readonly maxRegexPatternLength = MAX_REGEX_PATTERN_LENGTH;

  protected editorKind(group: ConditionGroup): ConditionEditorKind {
    return editorKindFor(group.controls.field.value, group.controls.operator.value);
  }

  protected operatorsFor(group: ConditionGroup): RuleCondition['operator'][] {
    return OPERATORS_BY_FIELD[group.controls.field.value];
  }

  /** Swaps in the first valid operator when the picked field doesn't support the current one. */
  protected onFieldChange(group: ConditionGroup): void {
    const validOperators = this.operatorsFor(group);
    if (!validOperators.includes(group.controls.operator.value)) {
      group.controls.operator.setValue(validOperators[0]);
    }
    group.controls.value.updateValueAndValidity();
  }

  /** The pattern-length cap only applies for `regex`, so switching operator can flip the value control's validity. */
  protected onOperatorChange(group: ConditionGroup): void {
    group.controls.value.updateValueAndValidity();
  }
}
