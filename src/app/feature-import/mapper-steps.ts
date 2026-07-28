import {
  COLUMN_FIELD_DEFS,
  invalidFieldLabels,
  type ColumnFieldKey,
  type ColumnMappingFormValue,
} from './column-mapping';

export type MapperStepId =
  'date' | 'description' | 'amount' | 'counterparty' | 'ownIban' | 'balance' | 'summary';

export type MapperStepDef = { id: MapperStepId; label: string; keys: ColumnFieldKey[] };

export type MapperStepTrackerState = 'done' | 'current' | 'upcoming';

/** Per-step valid/set indicator shown by the tracker (independent of `state`): `complete` means
 * every required control in the step is filled (or, for an all-optional step, at least one
 * control is); `incomplete` means a required control is still empty; `empty` means an all-optional
 * step has nothing mapped yet. */
export type MapperStepStatus = 'complete' | 'incomplete' | 'empty';

export type MapperStepTrackerItem = {
  id: MapperStepId;
  label: string;
  state: MapperStepTrackerState;
  status: MapperStepStatus;
};

/**
 * The horizontal guided flow's step order (TICKET-IMP-09) — consolidates TICKET-IMP-07's flat
 * 9-field order into 7 steps: `amount` now covers `amount`/`debit`/`credit` behind a mode toggle,
 * `counterparty` covers `counterpartyName`/`counterpartyIban` together, and `summary` is a new
 * terminus (the flow no longer ends at a `null` active field).
 */
export const MAPPER_STEPS: MapperStepDef[] = [
  { id: 'date', label: 'Date', keys: ['date'] },
  { id: 'description', label: 'Description', keys: ['description'] },
  { id: 'amount', label: 'Amount', keys: ['amount', 'debit', 'credit'] },
  { id: 'counterparty', label: 'Counterparty', keys: ['counterpartyName', 'counterpartyIban'] },
  { id: 'ownIban', label: 'Own IBAN', keys: ['ownIban'] },
  { id: 'balance', label: 'Balance', keys: ['balance'] },
  { id: 'summary', label: 'Summary', keys: [] },
];

/** A step is `complete` once its required control(s) are filled (an all-optional step counts as
 * complete once anything is mapped), `incomplete` while a required control is still empty, or
 * `empty` for an all-optional step nothing has been mapped to yet. The Summary step mirrors
 * `invalidFieldLabels` since it has no controls of its own. */
export function stepStatus(step: MapperStepDef, value: ColumnMappingFormValue): MapperStepStatus {
  if (step.id === 'summary') {
    return invalidFieldLabels(value).length === 0 ? 'complete' : 'incomplete';
  }

  const requiredKeys = step.keys.filter(
    (key) => COLUMN_FIELD_DEFS.find((field) => field.key === key)?.required,
  );
  if (requiredKeys.length > 0) {
    return requiredKeys.every((key) => !!value[key]) ? 'complete' : 'incomplete';
  }
  return step.keys.some((key) => !!value[key]) ? 'complete' : 'empty';
}
