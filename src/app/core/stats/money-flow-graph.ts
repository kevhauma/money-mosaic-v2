import type { Account, Category, Transaction } from '@/core/data-access';
import { normalizeIban } from '@/shared/utils';
import { classifyForStats } from './classify-for-stats';

export type FlowNodeKind =
  'income-source' | 'carried-in' | 'account' | 'group' | 'category' | 'savings' | 'left-over';

export type FlowNode = {
  /**
   * Namespaced by kind — `income:<categoryId|none>`, `account:<id>`, `category:<categoryId|none>`,
   * `savings:<accountId|other>`, plus the two synthetic singletons `carried-in` and `left-over`.
   * A category and an account that happen to share a name must stay two nodes; ECharts keys a
   * Sankey's nodes by `name`, so the id *is* the name the chart is given.
   */
  id: string;
  name: string;
  /**
   * 0 = where money came from, 1 = the accounts it passed through, 2 = where it ended up — or,
   * with `groupCategories` on (TICKET-EXP-03), 2 = the category group and 3 = the category inside
   * it. Depth is deliberately mixed in that mode: a category with no group still terminates at 2,
   * because routing it through a synthetic "Ungrouped" node would draw a fat ribbon that reads as a
   * real spending group.
   */
  level: 0 | 1 | 2 | 3;
  color: string;
  kind: FlowNodeKind;
  /** Present on `income-source` and `category` nodes; `null` is the explicit uncategorised bucket. */
  categoryId?: number | null;
  /** Present on `account` nodes and on a `savings` node that resolved to a known account. */
  accountId?: number;
};

export type FlowLink = { source: string; target: string; value: number };

export type MoneyFlowGraph = {
  nodes: FlowNode[];
  links: FlowLink[];
  /**
   * How many links netted to zero-or-less and were therefore dropped (a category fully refunded, a
   * savings deposit withdrawn again inside the range). Reported rather than discarded so the panel
   * can say the diagram is showing less than the range contains, instead of quietly under-reporting.
   */
  nettedOutLinkCount: number;
  /**
   * How many of the drawn expense-category links belong to a category that actually has a `group`
   * (TICKET-EXP-03) — reported whether or not grouping is on, so the panel can hide a toggle that
   * could only ever do nothing without computing the graph a second time to find out.
   */
  groupableCategoryCount: number;
};

export const UNCATEGORISED_INCOME_NAME = 'Uncategorised income';
export const UNCATEGORISED_EXPENSE_NAME = 'Uncategorised';
export const CARRIED_IN_NODE_ID = 'carried-in';
export const LEFT_OVER_NODE_ID = 'left-over';
export const OTHER_SAVINGS_NODE_ID = 'savings:other';

/** `CHART_NO_COLOR_FALLBACK`'s value, duplicated here for the same reason `category-cycle-heatmap.ts` duplicates it: `core/` never imports from `shared/echarts`. */
const NO_COLOR_FALLBACK = '#9ca3af';

/**
 * Half a cent. Netted link totals are sums of signed currency deltas, so a link that cancels out
 * exactly lands on a float a hair either side of zero; comparing against 0 would keep a €0.0000001
 * ribbon alive and, worse, make the balancing pass invent a matching carried-in for it.
 */
const EPSILON = 0.005;

/**
 * The two nodes with no entity of their own behind them. Both take the neutral fallback colour
 * here and are restyled from the active theme's palette by the panel — `core/` never imports
 * `shared/echarts`, so an aggregate cannot resolve a theme colour (see TICKET-EXP-02's Notes).
 */
const SYNTHETIC_NODES = {
  [CARRIED_IN_NODE_ID]: {
    id: CARRIED_IN_NODE_ID,
    name: 'Carried in',
    level: 0,
    color: NO_COLOR_FALLBACK,
    kind: 'carried-in',
  },
  [LEFT_OVER_NODE_ID]: {
    id: LEFT_OVER_NODE_ID,
    name: 'Left over',
    level: 2,
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
  savings: (transaction: Transaction) => string;
  synthetic: (id: typeof CARRIED_IN_NODE_ID | typeof LEFT_OVER_NODE_ID) => string;
};

/** The user's own savings accounts, by normalized IBAN — how a savings movement finds the account it landed in. */
const savingsAccountsByIban = (
  accountsById: ReadonlyMap<number, Account>,
): Map<string, Account> => {
  const byIban = new Map<string, Account>();
  for (const account of accountsById.values()) {
    if (account.type !== 'savings') continue;
    const iban = normalizeIban(account.iban);
    if (iban) byIban.set(iban, account);
  }
  return byIban;
};

/**
 * One factory per node kind, each idempotent and each returning the node's id — so the accumulation
 * loop below reads as "link this to that" and never as bookkeeping. Extracted from the main function
 * rather than nested inside it so both stay readable (and testable) at a glance.
 */
const createNodeRegistry = (
  categoriesById: ReadonlyMap<number, Category>,
  accountsById: ReadonlyMap<number, Account>,
): NodeRegistry => {
  const nodes = new Map<string, FlowNode>();
  const savingsByIban = savingsAccountsByIban(accountsById);

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
    level: 0 | 2,
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
        level: 1,
        color: account?.color || NO_COLOR_FALLBACK,
        kind: 'account',
        accountId,
      });
    },

    incomeSource: (categoryId) =>
      categorySide(categoryId, 'income-source', 'income', 0, UNCATEGORISED_INCOME_NAME),

    category: (categoryId) =>
      categorySide(categoryId, 'category', 'category', 2, UNCATEGORISED_EXPENSE_NAME),

    /**
     * Namespaced like everything else, so a group and a category of the same name stay two nodes.
     * The colour starts neutral and is replaced by the dominant member's once the totals are known
     * — a group should read as its heaviest category, not as an arbitrary palette slot.
     */
    group: (name) =>
      put({ id: `group:${name}`, name, level: 2, color: NO_COLOR_FALLBACK, kind: 'group' }),

    /** The savings account the counterparty IBAN names, or the single "other" bucket when it names none we know. */
    savings: (transaction) => {
      const account = savingsByIban.get(normalizeIban(transaction.counterpartyIban));
      if (!account?.id) {
        return put({
          id: OTHER_SAVINGS_NODE_ID,
          name: 'Other savings',
          level: 2,
          color: NO_COLOR_FALLBACK,
          kind: 'savings',
        });
      }
      return put({
        id: `savings:${account.id}`,
        name: account.name,
        level: 2,
        color: account.color || NO_COLOR_FALLBACK,
        kind: 'savings',
        accountId: account.id,
      });
    },

    synthetic: (id) => put({ ...SYNTHETIC_NODES[id] }),
  };
};

/**
 * One running total per (source, target) pair. `classifyForStats` returns a *signed* delta, so a
 * refund or a savings withdrawal nets its own link down here rather than appearing as a flow in the
 * opposite direction.
 */
const accumulateFlows = (
  transactions: Transaction[],
  registry: NodeRegistry,
  from: string,
  to: string,
  ownSavingsIbans: ReadonlySet<string>,
  categoriesById: ReadonlyMap<number, Category>,
  accountsById: ReadonlyMap<number, Account>,
): Map<string, FlowTotal> => {
  const totals = new Map<string, FlowTotal>();

  const addFlow = (source: string, target: string, value: number): void => {
    const key = `${source} ${target}`;
    const existing = totals.get(key);
    if (existing) existing.value += value;
    else totals.set(key, { source, target, value });
  };

  for (const transaction of transactions) {
    const result = classifyForStats(
      transaction,
      from,
      to,
      ownSavingsIbans,
      categoriesById,
      accountsById,
    );

    if (result.kind === 'income') {
      addFlow(
        registry.incomeSource(result.categoryId),
        registry.account(transaction.accountId),
        result.amount,
      );
    } else if (result.kind === 'expense') {
      addFlow(
        registry.account(transaction.accountId),
        registry.category(result.categoryId),
        result.amount,
      );
    } else if (result.kind === 'savings') {
      addFlow(
        registry.account(transaction.accountId),
        registry.savings(transaction),
        result.amount,
      );
    }
  }

  return totals;
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
 * argument.** Grouping before netting would let one member category's refund net down the shared
 * `account → group` ribbon while its own `group → category` ribbon was dropped for reaching zero,
 * leaving the group node unbalanced — and ECharts would then quietly re-fit the layout. Splitting a
 * surviving flow in two cannot change any total, which is what makes "identical figures with
 * grouping on and off" provable rather than hoped for.
 *
 * A category with no group keeps its single direct link and stays at the destination level; only a
 * category that actually has one moves down to level 3.
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
    registry.nodes.get(flow.target)!.level = 3;
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
 * accumulated, so a link the netting pass dropped cannot leave a phantom carried-in behind to match
 * it. Where an account spent more than arrived, the shortfall enters as `carried-in` (a balance it
 * already held, or income from outside the range); where less, the surplus leaves as `left-over`.
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
        ? { source: registry.synthetic(CARRIED_IN_NODE_ID), target: node.id, value: -difference }
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
 * Where money entered, where it sat, and where it left — as an acyclic three-level graph over one
 * date range (FR-EXP-2, TICKET-EXP-02): income sources → accounts → expense categories, savings
 * accounts and what was left over.
 *
 * **Every per-transaction decision is `classifyForStats`'s**, unchanged and un-second-guessed: this
 * function re-checks none of `transferId`, `nullified`, savings-IBAN membership, `neutral`
 * categories or joint-leg weighting itself, so a ribbon here can never disagree with a Dashboard
 * stat card about what counted as income, expense, savings or a transfer.
 *
 * Two properties make the picture honest, and both are asserted in the spec:
 *
 * - **Netting before drawing** (`accumulateFlows`, then the `EPSILON` filter below). A link that
 *   ends at zero-or-less is dropped rather than drawn — ECharts renders a negative-value link as a
 *   graphical artefact, not as money flowing the other way — and the drop is counted in
 *   `nettedOutLinkCount` so the panel can say so.
 * - **Per-account balance** (`balanceAccounts`). A Sankey is read as a conservation diagram: what
 *   enters a node leaves it. Handing ECharts unbalanced data doesn't raise an error, it silently
 *   rebalances the layout — and then ribbon widths stop meaning anything.
 *
 * Savings are a **destination**, not an expense, matching `classifyForStats`: a savings account is a
 * terminal node because within a range, money moved into savings is where the story ends. Spending
 * *from* a savings account still appears normally as that account's own outflow, since the
 * transaction lives on the savings account itself.
 *
 * With `groupCategories` on (TICKET-EXP-03) a fourth level appears between accounts and categories,
 * populated from `Category.group` — see `insertGroupLevel` for why it runs where it does, and why
 * that placement is what keeps every total identical between the two modes.
 *
 * Pure and theme-free — no DI, no store, no Dexie, and no `shared/echarts` import.
 */
export const computeMoneyFlowGraph = (
  transactions: Transaction[],
  categoriesById: ReadonlyMap<number, Category>,
  accountsById: ReadonlyMap<number, Account>,
  from: string,
  to: string,
  ownSavingsIbans: ReadonlySet<string> = new Set(),
  groupCategories = false,
): MoneyFlowGraph => {
  const registry = createNodeRegistry(categoriesById, accountsById);
  const totals = accumulateFlows(
    transactions,
    registry,
    from,
    to,
    ownSavingsIbans,
    categoriesById,
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
  };
};
