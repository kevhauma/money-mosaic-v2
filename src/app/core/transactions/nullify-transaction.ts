import type { Transaction } from '@/core/data-access';

/**
 * Validates a proposed `nullified` change before it's persisted (TICKET-TXN-04). A linked
 * transfer leg is already excluded from income/expense (FR-TRF-1) and has no category, so
 * nullifying it would be redundant and confusing — throws a descriptive `Error` rather than
 * silently accepting it, mirroring `validateAttributionOverride`.
 */
export const validateNullified = (transaction: Transaction, nullified: boolean): void => {
  if (nullified && transaction.transferId != null) {
    throw new Error('A linked transfer leg cannot be nullified.');
  }
};
