import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormBuilder, Validators } from '@angular/forms';
import { vi } from 'vitest';
import { AccountsRepository, type RuleCondition } from '@/core/data-access';
import { AccountsStore } from '@/core/state';
import {
  MAX_REGEX_PATTERN_LENGTH,
  regexPatternMaxLength,
  type ConditionGroup,
} from '../../rule-condition-editor';
import { RuleConditionRowComponent } from './rule-condition-row.component';

const formBuilder = new FormBuilder();

/** Mirrors the group the rule form builds, so the row is exercised against the real control shape. */
const conditionGroup = (
  field: RuleCondition['field'] = 'description',
  operator: RuleCondition['operator'] = 'contains',
  value = '',
): ConditionGroup =>
  formBuilder.nonNullable.group({
    field: formBuilder.nonNullable.control<RuleCondition['field']>(field),
    operator: formBuilder.nonNullable.control<RuleCondition['operator']>(operator),
    value: [value, [Validators.required, regexPatternMaxLength]],
    valueTo: [''],
  });

type Internals = {
  onFieldChange: (group: ConditionGroup) => void;
  onOperatorChange: (group: ConditionGroup) => void;
};

describe('RuleConditionRowComponent', () => {
  let fixture: ComponentFixture<RuleConditionRowComponent>;

  const accountsRepository = {
    getAll: vi.fn().mockResolvedValue([
      {
        id: 4,
        name: 'Checking',
        type: 'checking',
        currency: 'EUR',
        openingBalance: 0,
        openingBalanceDate: '2026-01-01',
        color: '#7F77DD',
        icon: 'wallet',
        archived: false,
      },
    ]),
  };

  const setup = async (group: ConditionGroup, canRemove = true): Promise<HTMLElement> => {
    await TestBed.configureTestingModule({
      imports: [RuleConditionRowComponent],
      providers: [{ provide: AccountsRepository, useValue: accountsRepository }],
    }).compileComponents();
    fixture = TestBed.createComponent(RuleConditionRowComponent);
    fixture.componentRef.setInput('group', group);
    fixture.componentRef.setInput('canRemove', canRemove);
    await TestBed.inject(AccountsStore).hydrate();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  const internals = (): Internals => fixture.componentInstance as unknown as Internals;

  /** The value editor is the third select/input in the row (field and operator selects come first). */
  const valueEditors = (element: HTMLElement): Element[] =>
    Array.from(element.querySelectorAll('select, input')).slice(2);

  it('renders the account picker for an accountId condition', async () => {
    const element = await setup(conditionGroup('accountId', 'equals'));

    const editors = valueEditors(element);
    expect(editors).toHaveLength(1);
    expect(editors[0].tagName).toBe('SELECT');
    expect(element.textContent).toContain('Choose an account');
    expect(element.textContent).toContain('Checking');
  });

  it('renders two number inputs for a between condition', async () => {
    const element = await setup(conditionGroup('amount', 'between'));

    const editors = valueEditors(element);
    expect(editors).toHaveLength(2);
    expect(editors.map((editor) => editor.getAttribute('placeholder'))).toEqual(['Min', 'Max']);
    expect(editors.every((editor) => editor.getAttribute('type') === 'number')).toBe(true);
  });

  it('renders one number input for a numeric single-value condition', async () => {
    const element = await setup(conditionGroup('amount', 'equals'));

    const editors = valueEditors(element);
    expect(editors).toHaveLength(1);
    expect(editors[0].getAttribute('type')).toBe('number');
  });

  it('renders a text input for a text condition', async () => {
    const element = await setup(conditionGroup('description', 'contains'));

    const editors = valueEditors(element);
    expect(editors).toHaveLength(1);
    expect(editors[0].getAttribute('type')).toBe('text');
  });

  it('shows the regex-length error only on the text editor, once the cap is exceeded', async () => {
    const group = conditionGroup('description', 'regex', 'a'.repeat(MAX_REGEX_PATTERN_LENGTH + 1));
    const element = await setup(group);

    expect(element.textContent).toContain('Pattern is too long (max 200 characters).');
  });

  it('lists only the operators the picked field supports', async () => {
    const element = await setup(conditionGroup('amount', 'equals'));

    const operatorSelect = element.querySelectorAll('select')[1];
    expect(Array.from(operatorSelect.options).map((option) => option.value)).toEqual([
      'equals',
      '>',
      '<',
      'between',
    ]);
  });

  it('swaps in the first valid operator when the new field does not support the current one', async () => {
    const group = conditionGroup('description', 'contains');
    await setup(group);

    group.controls.field.setValue('amount');
    internals().onFieldChange(group);

    // `contains` is not in OPERATORS_BY_FIELD.amount, so it falls back to the first entry.
    expect(group.controls.operator.value).toBe('equals');
  });

  it('keeps an operator the new field still supports', async () => {
    const group = conditionGroup('description', 'equals');
    await setup(group);

    group.controls.field.setValue('amount');
    internals().onFieldChange(group);

    expect(group.controls.operator.value).toBe('equals');
  });

  it('re-validates the value when switching from contains to regex (TICKET-PERF-02)', async () => {
    const group = conditionGroup('description', 'contains', 'a'.repeat(201));
    await setup(group);
    expect(group.controls.value.hasError('regexPatternMaxLength')).toBe(false);

    group.controls.operator.setValue('regex');
    internals().onOperatorChange(group);

    expect(group.controls.value.hasError('regexPatternMaxLength')).toBe(true);
  });

  it('emits removed when the remove button is clicked', async () => {
    const element = await setup(conditionGroup());
    let removals = 0;
    fixture.componentInstance.removed.subscribe(() => (removals += 1));

    (element.querySelector('[aria-label="Remove condition"]') as HTMLElement).click();

    expect(removals).toBe(1);
  });

  it('disables the remove button for the last remaining condition', async () => {
    const element = await setup(conditionGroup(), false);

    const button = element.querySelector('[aria-label="Remove condition"]') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });
});
