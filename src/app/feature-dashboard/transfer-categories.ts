import type { Account, Category, Transaction } from '@/core/data-access';
import { counterpartAccountId, type CounterpartContext } from '@/core/transfers';
import { UNCATEGORISED_SENTINEL, type TransactionDrilldownParams } from '@/shared/utils';

/**
 * Account detail's transfer slices: under `'cashflow'` a move between my own accounts counts as
 * money in or out (TICKET-ACC-14), and without these it lands in whatever category the row carries
 * — for a linked leg, which linking strips of its category (TICKET-TRF-01), that is
 * "Uncategorised", the one bucket the user is trained to go and fix. Instead each account at the
 * other end becomes a category of its own, named the way the transactions list names a linked row
 * (`Transfer · Savings`, TICKET-TRF-06) and drawn in that account's colour.
 *
 * They are ordinary `Category` rows with synthetic ids, rather than a second key threaded through
 * every `core/stats` aggregate, so every panel that groups or joins by category — the breakdown
 * donut, the trend stacks, the period comparison, biggest transactions — picks them up unchanged.
 * Real category ids are all positive, so a slice's id is the negated id of the account it names.
 * They exist only inside the scoped `StatsStore`; nothing ever persists one.
 */
const transferCategoryId = (accountId: number): number => -accountId;

const isTransferCategoryId = (categoryId: number): boolean => categoryId < 0;

/** One slice per account, so a move to an archived account still has a name and a colour. */
export const transferCategories = (accounts: readonly Account[]): Category[] =>
  accounts
    .filter((account): account is Account & { id: number } => account.id != null)
    .map((account) => ({
      id: transferCategoryId(account.id),
      name: `Transfer · ${account.name}`,
      kind: 'neutral',
      color: account.color,
      icon: account.icon,
      archived: false,
      isSystem: true,
    }));

/**
 * `transactions` with every move between my accounts re-categorised to the slice of the account at
 * its other end. A row `counterpartAccountId` can't place — any other row, or a half-deleted pair —
 * comes back as the very same object.
 */
export const withTransferCategories = (
  transactions: Transaction[],
  context: CounterpartContext,
): Transaction[] =>
  transactions.map((transaction) => {
    const accountId = counterpartAccountId(transaction, context);
    return accountId == null
      ? transaction
      : { ...transaction, categoryId: transferCategoryId(accountId) };
  });

/**
 * What a category drill-down narrows `/transactions` to: the category itself, "uncategorised" for
 * none — and nothing for a transfer slice, whose synthetic id the transactions filter has never
 * heard of. That link keeps only the page's account and range.
 */
export const drilldownCategoryId = (
  categoryId: number | null | undefined,
): TransactionDrilldownParams['categoryId'] => {
  if (categoryId == null) return UNCATEGORISED_SENTINEL;
  return isTransferCategoryId(categoryId) ? undefined : categoryId;
};
