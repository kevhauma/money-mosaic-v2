import type { LoanType } from '@/core/data-access';

/**
 * Single source of truth for the `loanType` picklist (TICKET-LOAN-03) — a fixed, flat order with no
 * default selection and no type visually distinguished from another; `loanType` is a display label
 * only (see `Loan.loanType`'s doc comment), never a branch in the amortization/progress math.
 */
export const LOAN_TYPE_OPTIONS: { value: LoanType; label: string }[] = [
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'auto', label: 'Auto' },
  { value: 'personal', label: 'Personal' },
  { value: 'student', label: 'Student' },
  { value: 'other', label: 'Other' },
];
