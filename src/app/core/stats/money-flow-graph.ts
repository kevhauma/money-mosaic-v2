import type { Account, Category, Transaction } from '@/core/data-access';
import { normalizeIban } from '@/shared/utils';

export type FlowNodeKind =
  'income-source' | 'existing-balance' | 'account' | 'group' | 'category' | 'left-over';

/**
 * Where each kind of node sits. Two account tiers exist so a movement *between* the user's own
 * accounts has somewhere to go: a Sankey link must run strictly downhill or the layout is a cycle,
 * and a checking → joint transfer is invisible if both sit in the same column.
 *
 * Primary is where outside money lands; secondary is an account funded from a primary one. Ordinary
 * spending from either tier reaches the destination column directly, so a link may span more than
 * one level — what matters for acyclicity is that it never runs uphill.
 */
export const LEVEL_SOURCE = 0;
export const LEVEL_PRIMARY_ACCOUNT = 1;
export const LEVEL_SECONDARY_ACCOUNT = 2;
export const LEVEL_DESTINATION = 3;
/** Only used with `groupCategories` on: the category sitting inside its group (TICKET-EXP-03). */
export const LEVEL_GROUPED_CATEGORY = 4;

export type FlowLevel = 0 | 1 | 2 | 3 | 4;

/** Account types treated as *secondary* — funded from a primary account rather than directly from outside. */
const SECONDARY_ACCOUNT_TYPES: readonly Account['type'][] = ['joint', 'savings', 'invest'];

export const accountFlowLevel = (account: Account | undefined): FlowLevel =>
  account && SECONDARY_ACCOUNT_TYPES.includes(account.type)
    ? LEVEL_SECONDARY_ACCOUNT
    : LEVEL_PRIMARY_ACCOUNT;

export type FlowNode = {
  /**
   * Namespaced by kind — `income:<categoryId|none>`, `account:<id>`, `category:<categoryId|none>`,
   * `group:<name>`, plus the two synthetic singletons `existing-balance` and `left-over`. A category and
   * an account that happen to share a name must stay two nodes; ECharts keys a Sankey's nodes by
   * `name`, so the id *is* the name the chart is given.
   */
  id: string;
  name: string;
  level: FlowLevel;
  color: string;
  kind: FlowNodeKind;
  /** Present on `income-source` and `category` nodes; `null` is the explicit uncategorised bucket. */
  categoryId?: number | null;
  /** Present on `account` nodes. */
  accountId?: number;
};

export type FlowLink = { source: string; target: string; value: number };

export type MoneyFlowGraph = {
  nodes: FlowNode[];
  links: FlowLink[];
  /**
   * Links that netted to zero-or-less and were dropped. With balance semantics this only happens to
   * an account-to-account ribbon whose money came back within the range — an expense and an income
   * ribbon can never cancel each other, because each only ever accumulates one sign.
   */
  nettedOutLinkCount: number;
  /**
   * How many of the drawn expense-category links belong to a category that actually has a `group`
   * (TICKET-EXP-03) — reported whether or not grouping is on, so the panel can hide a toggle that
   * could only ever do nothing without computing the graph a second time to find out.
   */
  groupableCategoryCount: number;
  /**
   * Movements between two own accounts on the *same* tier (checking → checking, or savings → joint).
   * A Sankey has no way to draw them: both ends occupy one column, and a same-column link is a cycle.
   * Counted rather than dropped in silence, so the panel can say the diagram is showing less than
   * the range contains.
   */
  sameTierTransferCount: number;
};

export const UNCATEGORISED_INCOME_NAME = 'Uncategorised income';
export const UNCATEGORISED_EXPENSE_NAME = 'Uncategorised';
export const EXISTING_BALANCE_NODE_ID = 'existing-balance';
export const LEFT_OVER_NODE_ID = 'left-over';

/** `CHART_NO_COLOR_FALLBACK`'s value, duplicated here for the same reason `category-cycle-heatmap.ts` duplicates it: `core/` never imports from `shared/echarts`. */
const NO_COLOR_FALLBACK = '#9ca3af';

/**
 * Half a cent. Netted link totals are sums of signed currency deltas, so a link that cancels out
 * exactly lands on a float a hair either side of zero; comparing against 0 would keep a €0.0000001
 * ribbon alive and, worse, make the balancing pass invent a matching existing-balance ribbon for it.
 */
const EPSILON = 0.005;

/**
 * The two nodes with no entity of their own behind them. Both take the neutral fallback colour
 * here and are restyled from the active theme's palette by the panel — `core/` never imports
 * `shared/echarts`, so an aggregate cannot resolve a theme colour (see TICKET-EXP-02's Notes).
 */
const SYNTHETIC_NODES = {
  [EXISTING_BALANCE_NODE_ID]: {
    id: EXISTING_BALANCE_NODE_ID,
    name: 'Existing balance',
    level: LEVEL_SOURCE,
    color: NO_COLOR_FALLBACK,
    kind: 'existing-balance',
  },
  [LEFT_OVER_NODE_ID]: {
    id: LEFT_OVER_NODE_ID,
    name: 'Left over',
    level: LEVEL_DESTINATION,
    color: NO_COLOR_FALLBACK,
    kind: 'left-over',
  },
} as const satisfies Record<string, FlowNode>;

type FlowTotal = { source: string; target: string; value: number };

type NodeRegistry = {
  /** Insertion-ordered; a node is only ever registered as the side effect of a flow reaching it. */
  readonly nodes: Map<string, FlowNode>;
  account: (accountId: number) => string;
  incomeSource: (categoryId: number | null) => string;
  category: (categoryId: number | null) => string;
  group: (name: string) => string;
  synthetic: (id: typeof EXISTING_BALANCE_NODE_ID | typeof LEFT_OVER_NODE_ID) => string;
};

/** Every own account by normalized IBAN — how a movement finds the account on its other end. */
const accountsByIban = (accountsById: ReadonlyMap<number, Account>): Map<string, Account> => {
  const byIban = new Map<string, Account>();
  for (const account of accountsById.values()) {
    const iban = normalizeIban(account.iban);
    if (iban) byIban.set(iban, account);
  }
  return byIban;
};

/**
 * One factory per node kind, each idempotent and each returning the node's id — so the accumulation
 * loop below reads as "link this to that" and never as bookkeeping.
 */
const createNodeRegistry = (
  categoriesById: ReadonlyMap<number, Category>,
  accountsById: ReadonlyMap<number, Account>,
): NodeRegistry => {
  const nodes = new Map<string, FlowNode>();

  const put = (node: FlowNode): string => {
    if (!nodes.has(node.id)) nodes.set(node.id, node);
    return node.id;
  };

  // Uncategorised money is its own labelled node either side, never folded into a real category —
  // an unnamed slice of a diagram is where trust in the whole diagram goes.
  const categorySide = (
    categoryId: number | null,
    kind: 'income-source' | 'category',
    prefix: string,
    level: FlowLevel,
    uncategorisedName: string,
  ): string => {
    const category = categoryId == null ? undefined : categoriesById.get(categoryId);
    return put({
      id: `${prefix}:${categoryId ?? 'none'}`,
      name: category?.name ?? uncategorisedName,
      level,
      color: category?.color || NO_COLOR_FALLBACK,
      kind,
      categoryId: categoryId ?? null,
    });
  };

  return {
    nodes,

    account: (accountId) => {
      const account = accountsById.get(accountId);
      return put({
        id: `account:${accountId}`,
        name: account?.name ?? `Account ${accountId}`,
        level: accountFlowLevel(account),
        color: account?.color || NO_COLOR_FALLBACK,
        kind: 'account',
        accountId,
      });
    },

    incomeSource: (categoryId) =>
      categorySide(categoryId, 'income-source', 'income', LEVEL_SOURCE, UNCATEGORISED_INCOME_NAME),

    category: (categoryId) =>
      categorySide(
        categoryId,
        'category',
        'category',
        LEVEL_DESTINATION,
        UNCATEGORISED_EXPENSE_NAME,
      ),

    /**
     * Namespaced like everything else, so a group and a category of the same name stay two nodes.
     * The colour starts neutral and is replaced by the dominant member's once the totals are known
     * — a group should read as its heaviest category, not as an arbitrary palette slot.
     */
    group: (name) =>
      put({
        id: `group:${name}`,
        name,
        level: LEVEL_DESTINATION,
        color: NO_COLOR_FALLBACK,
        kind: 'group',
      }),

    synthetic: (id) => put({ ...SYNTHETIC_NODES[id] }),
  };
};

type Accumulated = { totals: Map<string, FlowTotal>; sameTierTransferCount: number };

/**
 * What one transaction means for the diagram. Every `value` is already oriented along the ribbon,
 * so a negative one nets its ribbon down rather than reversing it.
 */
type Movement =
  | { kind: 'skip' }
  /** Between two own accounts in the same column — real, but undrawable in a Sankey. */
  | { kind: 'same-tier' }
  | { kind: 'transfer'; toAccountId: number; value: number }
  | { kind: 'income' | 'expense'; categoryId: number | null; value: number };

const SKIP: Movement = { kind: 'skip' };

/**
 * The whole per-transaction rule, in one place: the sign decides the direction, and the only
 * exclusions are the things that aren't movements at all. Split out of the accumulation loop so
 * each half stays legible — this answers *what happened*, the loop answers *where to draw it*.
 */
const classifyMovement = (
  transaction: Transaction,
  from: string,
  to: string,
  accountsById: ReadonlyMap<number, Account>,
  ownAccounts: ReadonlyMap<string, Account>,
): Movement => {
  if (transaction.bookingDate < from || transaction.bookingDate > to) return SKIP;
  if (transaction.nullified) return SKIP;
  if (transaction.amount === 0) return SKIP;

  const counterparty = ownAccounts.get(normalizeIban(transaction.counterpartyIban));
  if (counterparty?.id != null && counterparty.id !== transaction.accountId) {
    const ownLevel = accountFlowLevel(accountsById.get(transaction.accountId));
    const otherLevel = accountFlowLevel(counterparty);

    if (ownLevel === otherLevel) return { kind: 'same-tier' };
    // Only the *shallower* leg of a pair is drawn, so a linked transfer's two legs produce one
    // ribbon rather than two opposing ones. Skipping the deeper leg is also what makes money
    // flowing back up net this same ribbon down instead of drawing an uphill link.
    if (ownLevel > otherLevel) return SKIP;

    // A negative amount is money leaving this account, which is a positive flow along the ribbon.
    return { kind: 'transfer', toAccountId: counterparty.id, value: -transaction.amount };
  }

  const categoryId = transaction.categoryId ?? null;
  return transaction.amount > 0
    ? { kind: 'income', categoryId, value: transaction.amount }
    : { kind: 'expense', categoryId, value: -transaction.amount };
};

/**
 * One running total per (source, target) pair, over **raw account movements**.
 *
 * This is deliberately *not* `classifyForStats` (TICKET-EXP-06 reversed TICKET-EXP-02's decision to
 * route through it). That pipeline answers "what did this contribute to *my* income, expense and
 * savings" — it weights a joint account's spending by `ownershipShare`, drops a co-owner's
 * contribution, drops `neutral` categories and nets a refund back against its category. Every one
 * of those is right for a net-worth figure and wrong for this diagram, which shows what moved
 * through the accounts themselves: a partner's contribution really did arrive, the full amount
 * really did leave, and a refund really is money coming back in.
 *
 * So the rule here is just the sign, and the only exclusions are the ones that aren't movements at
 * all: out of range, `nullified`, and a zero amount.
 */
const accumulateFlows = (
  transactions: Transaction[],
  registry: NodeRegistry,
  from: string,
  to: string,
  accountsById: ReadonlyMap<number, Account>,
): Accumulated => {
  const totals = new Map<string, FlowTotal>();
  const ownAccounts = accountsByIban(accountsById);
  let sameTierTransferCount = 0;

  const addFlow = (source: string, target: string, value: number): void => {
    const key = `${source} ${target}`;
    const existing = totals.get(key);
    if (existing) existing.value += value;
    else totals.set(key, { source, target, value });
  };

  for (const transaction of transactions) {
    const movement = classifyMovement(transaction, from, to, accountsById, ownAccounts);
    const account = (): string => registry.account(transaction.accountId);

    if (movement.kind === 'same-tier') sameTierTransferCount++;
    else if (movement.kind === 'transfer')
      addFlow(account(), registry.account(movement.toAccountId), movement.value);
    else if (movement.kind === 'income')
      addFlow(registry.incomeSource(movement.categoryId), account(), movement.value);
    else if (movement.kind === 'expense')
      addFlow(account(), registry.category(movement.categoryId), movement.value);
  }

  return { totals, sameTierTransferCount };
};

/** Re-merges flows that ended up sharing a (source, target) pair — two categories of one group give an account two identical `account → group` ribbons otherwise. */
const mergeFlows = (flows: FlowTotal[]): FlowTotal[] => {
  const merged = new Map<string, FlowTotal>();
  for (const { source, target, value } of flows) {
    const key = `${source} ${target}`;
    const existing = merged.get(key);
    if (existing) existing.value += value;
    else merged.set(key, { source, target, value });
  }
  return [...merged.values()];
};

/**
 * Slides a group level in between accounts and categories (FR-EXP-2, TICKET-EXP-03), splitting each
 * `account → category` flow into `account → group` + `group → category` of the same value.
 *
 * **It runs on the already-netted, already-drawn flows, and that ordering is the whole correctness
 * argument.** Grouping before netting would let one member category's return net down the shared
 * `account → group` ribbon while its own `group → category` ribbon was dropped for reaching zero,
 * leaving the group node unbalanced — and ECharts would then quietly re-fit the layout. Splitting a
 * surviving flow in two cannot change any total, which is what makes "identical figures with
 * grouping on and off" provable rather than hoped for.
 *
 * A category with no group keeps its single direct link and stays at the destination level; only a
 * category that actually has one moves down a level.
 */
const insertGroupLevel = (
  drawn: FlowTotal[],
  registry: NodeRegistry,
  categoriesById: ReadonlyMap<number, Category>,
  groupCategories: boolean,
): { flows: FlowTotal[]; groupableCategoryCount: number } => {
  const groupNameFor = (targetId: string): string | undefined => {
    const node = registry.nodes.get(targetId);
    if (node?.kind !== 'category' || node.categoryId == null) return undefined;
    const group = categoriesById.get(node.categoryId)?.group?.trim();
    return group || undefined;
  };

  const flows: FlowTotal[] = [];
  /** groupNodeId → categoryNodeId → total, so the dominant member is decided on the category's whole spend, not on one account's share of it. */
  const memberTotals = new Map<string, Map<string, number>>();
  let groupableCategoryCount = 0;

  for (const flow of drawn) {
    const group = groupNameFor(flow.target);
    if (!group) {
      flows.push(flow);
      continue;
    }

    groupableCategoryCount++;
    if (!groupCategories) {
      flows.push(flow);
      continue;
    }

    const groupId = registry.group(group);
    registry.nodes.get(flow.target)!.level = LEVEL_GROUPED_CATEGORY;
    flows.push({ source: flow.source, target: groupId, value: flow.value });
    flows.push({ source: groupId, target: flow.target, value: flow.value });

    const members = memberTotals.get(groupId) ?? new Map<string, number>();
    members.set(flow.target, (members.get(flow.target) ?? 0) + flow.value);
    memberTotals.set(groupId, members);
  }

  for (const [groupId, members] of memberTotals) {
    const [dominant] = [...members.entries()].sort((a, b) => b[1] - a[1]);
    const color = registry.nodes.get(dominant[0])?.color;
    if (color) registry.nodes.get(groupId)!.color = color;
  }

  return { flows: mergeFlows(flows), groupableCategoryCount };
};

/**
 * Closes each account's books against what it actually drew — deliberately not against what it
 * accumulated, so a link the netting pass dropped cannot leave a phantom existing-balance ribbon behind to match
 * it.
 *
 * Under balance semantics the two synthetic ribbons have an exact meaning: `left-over` is how much
 * the account's balance *grew* over the range, and `existing-balance` how much it *shrank* — money it was
 * already holding when the range opened.
 */
const balanceAccounts = (drawn: FlowTotal[], registry: NodeRegistry): FlowLink[] => {
  const inflow = new Map<string, number>();
  const outflow = new Map<string, number>();
  for (const { source, target, value } of drawn) {
    outflow.set(source, (outflow.get(source) ?? 0) + value);
    inflow.set(target, (inflow.get(target) ?? 0) + value);
  }

  const links: FlowLink[] = drawn.map(({ source, target, value }) => ({ source, target, value }));

  for (const node of [...registry.nodes.values()]) {
    if (node.kind !== 'account') continue;
    const difference = (inflow.get(node.id) ?? 0) - (outflow.get(node.id) ?? 0);
    if (Math.abs(difference) <= EPSILON) continue;

    links.push(
      difference < 0
        ? {
            source: registry.synthetic(EXISTING_BALANCE_NODE_ID),
            target: node.id,
            value: -difference,
          }
        : { source: node.id, target: registry.synthetic(LEFT_OVER_NODE_ID), value: difference },
    );
  }

  return links;
};

/**
 * Level first, then heaviest first within a level — a stable, readable order for the screen-reader
 * table. Nodes that ended up on no drawn link at all (every one of their links netted out) are
 * dropped; they would otherwise render as labelled dots hanging off the diagram.
 */
const orderNodes = (nodes: ReadonlyMap<string, FlowNode>, links: FlowLink[]): FlowNode[] => {
  const totalByNode = new Map<string, number>();
  for (const { source, target, value } of links) {
    totalByNode.set(source, (totalByNode.get(source) ?? 0) + value);
    totalByNode.set(target, (totalByNode.get(target) ?? 0) + value);
  }

  return [...nodes.values()]
    .filter((node) => totalByNode.has(node.id))
    .sort(
      (a, b) => a.level - b.level || (totalByNode.get(b.id) ?? 0) - (totalByNode.get(a.id) ?? 0),
    );
};

/**
 * Where money entered, which accounts it moved through, and where it left — as an acyclic flow
 * graph over one date range (FR-EXP-2; TICKET-EXP-02, extended by EXP-03 and reframed by EXP-06).
 *
 * **This is an account-balance diagram, not a net-worth one**, which is the decision every other
 * property here follows from. Amounts are shown at face value: a joint account's spending is not
 * weighted by `ownershipShare`, a co-owner's contribution appears as a real income source rather
 * than being dropped, `neutral` categories are included, and a refund arrives as money in rather
 * than netting its category down. The Dashboard's stat cards deliberately answer the other question
 * and will not match this diagram on a joint account — that difference is the point, not a bug.
 *
 * Two structural properties make the picture honest, and both are asserted in the spec:
 *
 * - **Every link runs strictly downhill.** Sources (0) → primary accounts (1) → secondary accounts
 *   (2) → destinations (3, or 4 for a category inside its group). A link may span more than one
 *   level — an ordinary purchase from a checking account goes 1 → 3 — but never uphill and never
 *   sideways, which is what makes the graph acyclic. Money moving *back* from a secondary account
 *   to a primary one nets its existing ribbon down instead of drawing an uphill link.
 * - **Per-account balance** (`balanceAccounts`). A Sankey is read as a conservation diagram: what
 *   enters a node leaves it. Handing ECharts unbalanced data doesn't raise an error, it silently
 *   rebalances the layout — and then ribbon widths stop meaning anything.
 *
 * Pure and theme-free — no DI, no store, no Dexie, and no `shared/echarts` import.
 */
export const computeMoneyFlowGraph = (
  transactions: Transaction[],
  categoriesById: ReadonlyMap<number, Category>,
  accountsById: ReadonlyMap<number, Account>,
  from: string,
  to: string,
  groupCategories = false,
): MoneyFlowGraph => {
  const registry = createNodeRegistry(categoriesById, accountsById);
  const { totals, sameTierTransferCount } = accumulateFlows(
    transactions,
    registry,
    from,
    to,
    accountsById,
  );

  const drawn = [...totals.values()].filter((link) => link.value > EPSILON);
  const { flows, groupableCategoryCount } = insertGroupLevel(
    drawn,
    registry,
    categoriesById,
    groupCategories,
  );
  const links = balanceAccounts(flows, registry).sort((a, b) => b.value - a.value);

  return {
    nodes: orderNodes(registry.nodes, links),
    links,
    nettedOutLinkCount: totals.size - drawn.length,
    groupableCategoryCount,
    sameTierTransferCount,
  };
};
