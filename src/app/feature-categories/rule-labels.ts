import type { RuleCondition } from '@/core/data-access';

/** Single source for rule field/operator display text — used by the rule form dropdowns and the rule summary line (TICKET-CAT-05). Exhaustively typed (no `Partial`) so a new union member fails compilation until labelled here. */
export const FIELD_LABELS: Record<RuleCondition['field'], string> = {
  description: 'Description',
  counterpartyName: 'Counterparty name',
  counterpartyIban: 'Counterparty IBAN',
  amount: 'Amount',
  accountId: 'Account',
};

export const OPERATOR_LABELS: Record<RuleCondition['operator'], string> = {
  contains: 'contains',
  equals: 'equals',
  regex: 'matches regex',
  '>': 'is greater than',
  '<': 'is less than',
  between: 'is between',
};
