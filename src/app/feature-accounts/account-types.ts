import type { Account } from '@/core/data-access';

/** Single source of truth for the account `type` picklist — shared by the full account form and the CSV import step's quick-create draft editor (TICKET-IMP-08), so they can't drift out of sync. */
export const ACCOUNT_TYPE_OPTIONS: { value: Account['type']; label: string }[] = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'joint', label: 'Joint' },
  { value: 'invest', label: 'Invest' },
];
