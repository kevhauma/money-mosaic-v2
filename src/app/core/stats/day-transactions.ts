import type { Account, Transaction } from '@/core/data-access';

/** One transaction as a balance tooltip shows it: what it was, and what it did to the balance. */
export type DayTransactionLine = {
  /** Counterparty when the import captured one, else the raw description — the same precedence the transactions table uses. */
  label: string;
  amount: number;
};

/** One account's movement on one day. Only accounts that actually moved get one of these. */
export type AccountDayMovement = {
  accountId: number;
  accountName: string;
  lines: DayTransactionLine[];
  /** Sum of `lines`' amounts — that account's net change for the day. */
  net: number;
};

/**
 * Every day that saw movement, mapped to the accounts that moved on it (TICKET-ACC-11).
 *
 * A `Map`, built **once per series computation**, because it is read from an echarts `formatter`
 * that fires on every hover frame: scanning the whole transaction array per hover is the one thing
 * this shape exists to avoid. Look a day up with `dayMovementsFor`.
 */
export type DayTransactionIndex = ReadonlyMap<string, readonly AccountDayMovement[]>;

const lineFor = ({
  counterpartyName,
  rawDescription,
  amount,
}: Transaction): DayTransactionLine => ({
  label: counterpartyName?.trim() || rawDescription,
  amount,
});

/**
 * Groups transactions by booking date and then by account, for the balance charts' day tooltip
 * (TICKET-ACC-11).
 *
 * **`accounts` decides what is visible**, which is what keeps the tooltip honest against whichever
 * series the chart drew: the Accounts overview passes `activeAccounts()`, so an archived account is
 * absent here exactly as it is absent from the stack, while account detail passes that one account —
 * archived or not — and gets its transactions. A single account is therefore the degenerate case of
 * the same function, not a second code path.
 *
 * Accounts come back in the order they were given, so the tooltip lists them in the chart's own
 * stacking/legend order. Transactions keep their input order within an account.
 */
/** Read-or-create, so the grouping loop below reads as one statement per level instead of two `if (!x)` blocks. */
const upsert = <K, V>(map: Map<K, V>, key: K, create: () => V): V => {
  const existing = map.get(key);
  if (existing !== undefined) return existing;

  const created = create();
  map.set(key, created);
  return created;
};

/** Orders movements by where their account sat in the caller's list — i.e. the chart's own stacking/legend order. */
const byGivenOrder =
  (order: ReadonlyMap<number | undefined, number>) =>
  (a: AccountDayMovement, b: AccountDayMovement): number =>
    (order.get(a.accountId) ?? 0) - (order.get(b.accountId) ?? 0);

export const buildDayTransactionIndex = (
  transactions: readonly Transaction[],
  accounts: readonly Account[],
): DayTransactionIndex => {
  const accountNames = new Map(accounts.map((account) => [account.id, account.name]));
  const accountOrder = new Map(accounts.map((account, index) => [account.id, index]));

  const byDay = new Map<string, Map<number, AccountDayMovement>>();

  for (const transaction of transactions) {
    const { accountId, bookingDate, amount } = transaction;
    const accountName = accountNames.get(accountId);
    if (accountName === undefined) continue;

    const byAccount = upsert(byDay, bookingDate, () => new Map<number, AccountDayMovement>());
    const movement = upsert(byAccount, accountId, () => ({
      accountId,
      accountName,
      lines: [],
      net: 0,
    }));

    movement.lines.push(lineFor(transaction));
    movement.net += amount;
  }

  const inOrder = byGivenOrder(accountOrder);
  return new Map(
    [...byDay].map(([day, byAccount]) => [day, [...byAccount.values()].sort(inOrder)]),
  );
};

/** That day's movements, or an empty list for a day nothing happened on — never `undefined`, so callers don't each re-handle the quiet day. */
export const dayMovementsFor = (
  index: DayTransactionIndex,
  isoDate: string,
): readonly AccountDayMovement[] => index.get(isoDate) ?? [];
