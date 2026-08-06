import type { Account, Category, Transaction } from '@/core/data-access';
import { savingsAccountIbans } from '@/core/transfers';
import {
  CARRIED_IN_NODE_ID,
  computeMoneyFlowGraph,
  LEFT_OVER_NODE_ID,
  OTHER_SAVINGS_NODE_ID,
  UNCATEGORISED_EXPENSE_NAME,
  UNCATEGORISED_INCOME_NAME,
  type FlowLink,
  type MoneyFlowGraph,
} from './money-flow-graph';

const FROM = '2026-07-01';
const TO = '2026-07-31';

const checking: Account = {
  id: 1,
  name: 'Main account',
  type: 'checking',
  iban: 'NL01BANK0000000001',
  currency: 'EUR',
  openingBalance: 0,
  openingBalanceDate: '2020-01-01',
  color: '#111111',
  icon: 'wallet',
  archived: false,
};

const savings: Account = {
  ...checking,
  id: 2,
  name: 'Rainy day',
  type: 'savings',
  iban: 'NL02BANK0000000002',
  color: '#222222',
};

const second: Account = {
  ...checking,
  id: 3,
  name: 'Second account',
  iban: 'NL03BANK0000000003',
  color: '#333333',
};

const joint: Account = {
  ...checking,
  id: 4,
  name: 'Joint account',
  type: 'joint',
  iban: 'NL04BANK0000000004',
  color: '#444444',
  ownershipShare: 0.5,
};

const salary: Category = {
  id: 10,
  name: 'Salary',
  kind: 'income',
  color: '#00ff00',
  icon: 'cash',
  archived: false,
  isSystem: false,
};

const groceries: Category = {
  ...salary,
  id: 20,
  name: 'Groceries',
  kind: 'expense',
  color: '#ff0000',
};
const rent: Category = { ...salary, id: 21, name: 'Rent', kind: 'expense', color: '#0000ff' };

/** A category deliberately sharing an account's name — the namespacing case. */
const sameNameAsAccount: Category = { ...groceries, id: 22, name: 'Main account' };

/** TICKET-EXP-03's fixtures: two categories in one group, one with none, and one named after the group. */
const hobbies: Category = { ...groceries, id: 23, name: 'Hobbies', color: '#00ffff' };
const groupNamed: Category = { ...groceries, id: 24, name: 'Living', color: '#ff00ff' };

const groupedCategoriesById = new Map<number, Category>([
  [salary.id!, salary],
  [groceries.id!, { ...groceries, group: 'Living' }],
  [rent.id!, { ...rent, group: 'Living' }],
  // An empty-string group must read as "no group", not as a group whose name is blank.
  [hobbies.id!, { ...hobbies, group: '  ' }],
  [groupNamed.id!, groupNamed],
]);

const accountsById = new Map<number, Account>(
  [checking, savings, second, joint].map((account) => [account.id!, account]),
);
const categoriesById = new Map<number, Category>(
  [salary, groceries, rent, sameNameAsAccount].map((category) => [category.id!, category]),
);

let nextId = 1;
const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: nextId++,
  accountId: 1,
  bookingDate: '2026-07-10',
  amount: -50,
  currency: 'EUR',
  rawDescription: 'Something',
  fingerprint: `fp-${nextId}`,
  createdAt: '2026-07-10T00:00:00.000Z',
  ...overrides,
});

const graphOf = (transactions: Transaction[]): MoneyFlowGraph =>
  computeMoneyFlowGraph(
    transactions,
    categoriesById,
    accountsById,
    FROM,
    TO,
    savingsAccountIbans([...accountsById.values()]),
  );

const linkBetween = (graph: MoneyFlowGraph, source: string, target: string): FlowLink | undefined =>
  graph.links.find((link) => link.source === source && link.target === target);

const levelOf = (graph: MoneyFlowGraph, id: string): number | undefined =>
  graph.nodes.find((node) => node.id === id)?.level;

const graphNodeLevels = (graph: MoneyFlowGraph, ids: string[]): (number | undefined)[] =>
  ids.map((id) => levelOf(graph, id));

describe('computeMoneyFlowGraph (TICKET-EXP-02)', () => {
  it('draws a single-account income → account → expense flow end to end', () => {
    const graph = graphOf([
      transaction({ amount: 2000, categoryId: salary.id }),
      transaction({ amount: -500, categoryId: groceries.id }),
    ]);

    expect(linkBetween(graph, 'income:10', 'account:1')?.value).toBe(2000);
    expect(linkBetween(graph, 'account:1', 'category:20')?.value).toBe(500);
    // 2000 in, 500 out — the remaining 1500 has to go somewhere for the widths to mean anything.
    expect(linkBetween(graph, 'account:1', LEFT_OVER_NODE_ID)?.value).toBe(1500);
    expect(graph.nettedOutLinkCount).toBe(0);
  });

  it('emits every link from level n to level n+1, so the graph is acyclic by construction', () => {
    const graph = graphOf([
      transaction({ amount: 2000, categoryId: salary.id }),
      transaction({ amount: -500, categoryId: groceries.id }),
      transaction({ amount: -300, counterpartyIban: savings.iban }),
      transaction({ accountId: joint.id, amount: -200, categoryId: rent.id }),
      transaction({ accountId: second.id, amount: -100, categoryId: rent.id }),
      transaction({ amount: -80 }),
      transaction({ amount: 40 }),
    ]);

    expect(graph.links.length).toBeGreaterThan(0);
    for (const link of graph.links) {
      expect(levelOf(graph, link.target)! - levelOf(graph, link.source)!).toBe(1);
    }
  });

  it('balances an account that overspends its range income with a carried-in link', () => {
    const graph = graphOf([
      transaction({ amount: 100, categoryId: salary.id }),
      transaction({ amount: -900, categoryId: rent.id }),
    ]);

    const income = linkBetween(graph, 'income:10', 'account:1')!.value;
    const carriedIn = linkBetween(graph, CARRIED_IN_NODE_ID, 'account:1')!.value;
    const spent = linkBetween(graph, 'account:1', 'category:21')!.value;

    expect(carriedIn).toBe(800);
    expect(income + carriedIn).toBe(spent);
    expect(linkBetween(graph, 'account:1', LEFT_OVER_NODE_ID)).toBeUndefined();
  });

  it('balances an account that underspends its range income with a left-over link', () => {
    const graph = graphOf([
      transaction({ amount: 1200, categoryId: salary.id }),
      transaction({ amount: -200, categoryId: groceries.id }),
      transaction({ amount: -300, counterpartyIban: savings.iban }),
    ]);

    const income = linkBetween(graph, 'income:10', 'account:1')!.value;
    const spent = linkBetween(graph, 'account:1', 'category:20')!.value;
    const saved = linkBetween(graph, 'account:1', 'savings:2')!.value;
    const leftOver = linkBetween(graph, 'account:1', LEFT_OVER_NODE_ID)!.value;

    expect(income).toBe(spent + saved + leftOver);
    expect(leftOver).toBe(700);
    expect(linkBetween(graph, CARRIED_IN_NODE_ID, 'account:1')).toBeUndefined();
  });

  it('lands a savings deposit on that savings account, and nets a withdrawal back out of it', () => {
    const deposited = graphOf([
      transaction({ amount: 1000, categoryId: salary.id }),
      transaction({ amount: -400, counterpartyIban: savings.iban }),
    ]);
    expect(linkBetween(deposited, 'account:1', 'savings:2')?.value).toBe(400);
    expect(deposited.nodes.find((node) => node.id === 'savings:2')).toMatchObject({
      kind: 'savings',
      name: 'Rainy day',
      level: 2,
      accountId: 2,
    });

    const withdrawn = graphOf([
      transaction({ amount: 1000, categoryId: salary.id }),
      transaction({ amount: -400, counterpartyIban: savings.iban }),
      // A withdrawal is a positive amount whose counterparty is the savings IBAN — it must net the
      // savings ribbon down, never appear as income.
      transaction({ amount: 150, counterpartyIban: savings.iban }),
    ]);
    expect(linkBetween(withdrawn, 'account:1', 'savings:2')?.value).toBe(250);
    expect(linkBetween(withdrawn, 'income:2', 'account:1')).toBeUndefined();
  });

  it('falls back to a single "other" savings node when the counterparty IBAN matches no known account', () => {
    const unknownSavingsIbans = new Set(['NL99BANK0000000099']);
    const graph = computeMoneyFlowGraph(
      [
        transaction({ amount: 500, categoryId: salary.id }),
        transaction({ amount: -100, counterpartyIban: 'NL99 BANK 0000 0000 99' }),
      ],
      categoriesById,
      accountsById,
      FROM,
      TO,
      unknownSavingsIbans,
    );

    expect(linkBetween(graph, 'account:1', OTHER_SAVINGS_NODE_ID)?.value).toBe(100);
    const otherSavings = graph.nodes.find((node) => node.id === OTHER_SAVINGS_NODE_ID)!;
    expect(otherSavings).toMatchObject({ name: 'Other savings', kind: 'savings', level: 2 });
    // No account to point a drill-down at, which is what makes it a fallback rather than a node.
    expect(otherSavings.accountId).toBeUndefined();
  });

  it('nets a refund down its own link, and drops the link entirely once it reaches zero', () => {
    const partial = graphOf([
      transaction({ amount: 1000, categoryId: salary.id }),
      transaction({ amount: -300, categoryId: groceries.id }),
      transaction({ amount: 120, categoryId: groceries.id }),
    ]);
    expect(linkBetween(partial, 'account:1', 'category:20')?.value).toBe(180);
    expect(partial.nettedOutLinkCount).toBe(0);

    const fullyRefunded = graphOf([
      transaction({ amount: 1000, categoryId: salary.id }),
      transaction({ amount: -300, categoryId: groceries.id }),
      transaction({ amount: 300, categoryId: groceries.id }),
    ]);
    expect(linkBetween(fullyRefunded, 'account:1', 'category:20')).toBeUndefined();
    expect(fullyRefunded.nodes.find((node) => node.id === 'category:20')).toBeUndefined();
    expect(fullyRefunded.nettedOutLinkCount).toBe(1);
    // The dropped link must not leave a phantom balance behind: the whole 1000 is still left over.
    expect(linkBetween(fullyRefunded, 'account:1', LEFT_OVER_NODE_ID)?.value).toBe(1000);
  });

  it('produces no links at all for a linked non-savings transfer between own accounts', () => {
    const graph = graphOf([
      transaction({ accountId: 1, amount: -250, transferId: 7, counterpartyIban: second.iban }),
      transaction({ accountId: 3, amount: 250, transferId: 7, counterpartyIban: checking.iban }),
    ]);

    expect(graph.links).toEqual([]);
    expect(graph.nodes).toEqual([]);
  });

  it("carries a joint account's ownershipShare through to the link value", () => {
    const graph = graphOf([
      transaction({ accountId: joint.id, amount: 1000, categoryId: salary.id }),
      transaction({ accountId: joint.id, amount: -400, categoryId: rent.id }),
    ]);

    // This aggregate only ever adds what `classifyForStats` hands it, so the ribbons inherit the
    // contribution model exactly: an untagged inflow is `mineIn` and counts whole, while shared
    // spending is weighted by the account's 0.5 `ownershipShare` — the same asymmetry every stat
    // card shows. The balancing pass then works off those weighted figures, not the raw ones.
    expect(linkBetween(graph, 'income:10', 'account:4')?.value).toBe(1000);
    expect(linkBetween(graph, 'account:4', 'category:21')?.value).toBe(200);
    expect(linkBetween(graph, 'account:4', LEFT_OVER_NODE_ID)?.value).toBe(800);
  });

  it('gives uncategorised income and uncategorised expense their own labelled nodes', () => {
    const graph = graphOf([transaction({ amount: 900 }), transaction({ amount: -120 })]);

    expect(graph.nodes.find((node) => node.id === 'income:none')).toMatchObject({
      name: UNCATEGORISED_INCOME_NAME,
      kind: 'income-source',
      level: 0,
      categoryId: null,
    });
    expect(graph.nodes.find((node) => node.id === 'category:none')).toMatchObject({
      name: UNCATEGORISED_EXPENSE_NAME,
      kind: 'category',
      level: 2,
      categoryId: null,
    });
    expect(linkBetween(graph, 'income:none', 'account:1')?.value).toBe(900);
    expect(linkBetween(graph, 'account:1', 'category:none')?.value).toBe(120);
  });

  it('keeps a category and an account of the same name apart, because ids are namespaced by kind', () => {
    const graph = graphOf([
      transaction({ amount: 600, categoryId: salary.id }),
      transaction({ amount: -60, categoryId: sameNameAsAccount.id }),
    ]);

    const sameNamed = graph.nodes.filter((node) => node.name === 'Main account');
    expect(sameNamed.map((node) => node.id).sort()).toEqual(['account:1', 'category:22']);
    expect(sameNamed.map((node) => node.kind).sort()).toEqual(['account', 'category']);
  });

  it('returns empty nodes and links for a range holding nothing', () => {
    const graph = graphOf([
      // Both outside [FROM, TO] — classifyForStats skips them, so nothing reaches the graph.
      transaction({ bookingDate: '2026-06-30', amount: 1000, categoryId: salary.id }),
      transaction({ bookingDate: '2026-08-01', amount: -100, categoryId: groceries.id }),
    ]);

    expect(graph).toEqual({
      nodes: [],
      links: [],
      nettedOutLinkCount: 0,
      groupableCategoryCount: 0,
    });
  });

  it('balances every account independently when several are active in the same range', () => {
    const graph = graphOf([
      transaction({ accountId: 1, amount: 2000, categoryId: salary.id }),
      transaction({ accountId: 1, amount: -500, categoryId: groceries.id }),
      transaction({ accountId: 3, amount: -400, categoryId: rent.id }),
    ]);

    for (const account of graph.nodes.filter((node) => node.kind === 'account')) {
      const into = graph.links
        .filter((link) => link.target === account.id)
        .reduce((sum, link) => sum + link.value, 0);
      const outOf = graph.links
        .filter((link) => link.source === account.id)
        .reduce((sum, link) => sum + link.value, 0);
      expect(into).toBeCloseTo(outOf, 6);
    }
    // Account 3 earned nothing in range, so all 400 of its spend is carried in.
    expect(linkBetween(graph, CARRIED_IN_NODE_ID, 'account:3')?.value).toBe(400);
  });
});

describe('computeMoneyFlowGraph: category groups (TICKET-EXP-03)', () => {
  const groupedGraphOf = (transactions: Transaction[], groupCategories: boolean): MoneyFlowGraph =>
    computeMoneyFlowGraph(
      transactions,
      groupedCategoriesById,
      accountsById,
      FROM,
      TO,
      savingsAccountIbans([...accountsById.values()]),
      groupCategories,
    );

  const income = transaction({ amount: 3000, categoryId: salary.id });
  const onGroceries = transaction({ amount: -500, categoryId: groceries.id });
  const onRent = transaction({ amount: -900, categoryId: rent.id });
  const onUngrouped = transaction({ amount: -100, categoryId: hobbies.id });

  it('is off by default, so an existing caller sees exactly the three-level graph it saw before', () => {
    const defaulted = computeMoneyFlowGraph(
      [income, onGroceries],
      groupedCategoriesById,
      accountsById,
      FROM,
      TO,
      savingsAccountIbans([...accountsById.values()]),
    );

    expect(defaulted.nodes.some((node) => node.kind === 'group')).toBe(false);
    expect(linkBetween(defaulted, 'account:1', 'category:20')?.value).toBe(500);
  });

  it('splits a grouped category into two links of equal value, and leaves an ungrouped one direct', () => {
    const graph = groupedGraphOf([income, onGroceries, onUngrouped], true);

    // Grouped: account → group → category, both €500.
    expect(linkBetween(graph, 'account:1', 'group:Living')?.value).toBe(500);
    expect(linkBetween(graph, 'group:Living', 'category:20')?.value).toBe(500);
    expect(linkBetween(graph, 'account:1', 'category:20')).toBeUndefined();

    // Ungrouped: still one direct link, still terminating at the destination level — no synthetic
    // "Ungrouped" bucket, which would draw as if it were a real spending group.
    expect(linkBetween(graph, 'account:1', 'category:23')?.value).toBe(100);
    expect(graph.nodes.find((node) => node.id === 'category:23')?.level).toBe(2);
    expect(graph.nodes.find((node) => node.id === 'category:20')?.level).toBe(3);
  });

  it('merges two categories of one group into a single account → group ribbon', () => {
    const graph = groupedGraphOf([income, onGroceries, onRent], true);

    expect(graph.links.filter((link) => link.target === 'group:Living')).toHaveLength(1);
    expect(linkBetween(graph, 'account:1', 'group:Living')?.value).toBe(1400);
    expect(linkBetween(graph, 'group:Living', 'category:20')?.value).toBe(500);
    expect(linkBetween(graph, 'group:Living', 'category:21')?.value).toBe(900);
  });

  it('keeps every total identical with grouping on and off — the property the level must not break', () => {
    const transactions = [income, onGroceries, onRent, onUngrouped];
    const off = groupedGraphOf(transactions, false);
    const on = groupedGraphOf(transactions, true);

    const outOf = (graph: MoneyFlowGraph, id: string): number =>
      graph.links.filter((link) => link.source === id).reduce((sum, link) => sum + link.value, 0);
    const into = (graph: MoneyFlowGraph, id: string): number =>
      graph.links.filter((link) => link.target === id).reduce((sum, link) => sum + link.value, 0);

    // Per account: identical inflow and outflow, and still balanced in both modes.
    expect(into(on, 'account:1')).toBe(into(off, 'account:1'));
    expect(outOf(on, 'account:1')).toBe(outOf(off, 'account:1'));
    expect(into(on, 'account:1')).toBe(outOf(on, 'account:1'));

    // Per category: identical totals, whichever level they now sit at.
    for (const id of ['category:20', 'category:21', 'category:23']) {
      expect(into(on, id)).toBe(into(off, id));
    }
    expect(into(on, LEFT_OVER_NODE_ID)).toBe(into(off, LEFT_OVER_NODE_ID));

    // The group is a pass-through: what enters leaves, or it would silently distort the layout.
    expect(into(on, 'group:Living')).toBe(outOf(on, 'group:Living'));
  });

  it('still spans exactly one level per link, with grouping on', () => {
    const graph = groupedGraphOf(
      [
        income,
        onGroceries,
        onRent,
        onUngrouped,
        transaction({ amount: -300, counterpartyIban: savings.iban }),
      ],
      true,
    );

    for (const link of graph.links) {
      expect(levelOf(graph, link.target)! - levelOf(graph, link.source)!).toBe(1);
    }
  });

  it('colours a group as its highest-total member category', () => {
    const graph = groupedGraphOf([income, onGroceries, onRent], true);

    // Rent (€900, blue) outweighs Groceries (€500, red).
    expect(graph.nodes.find((node) => node.id === 'group:Living')?.color).toBe(rent.color);
  });

  it('keeps a group and a category of the same name apart', () => {
    // "Living" is both a category (id 24, ungrouped) and the group Groceries belongs to — the
    // collision only exists when both are actually drawn.
    const graph = groupedGraphOf(
      [income, onGroceries, transaction({ amount: -250, categoryId: groupNamed.id })],
      true,
    );

    const sameNamed = graph.nodes.filter((node) => node.name === 'Living');
    expect(sameNamed.map((node) => node.id).sort()).toEqual(['category:24', 'group:Living']);
    expect(sameNamed.map((node) => node.kind).sort()).toEqual(['category', 'group']);
  });

  it('leaves savings and left-over untouched by grouping', () => {
    const transactions = [
      income,
      onGroceries,
      transaction({ amount: -300, counterpartyIban: savings.iban }),
    ];
    const off = groupedGraphOf(transactions, false);
    const on = groupedGraphOf(transactions, true);

    expect(linkBetween(on, 'account:1', 'savings:2')).toEqual(
      linkBetween(off, 'account:1', 'savings:2'),
    );
    expect(linkBetween(on, 'account:1', LEFT_OVER_NODE_ID)).toEqual(
      linkBetween(off, 'account:1', LEFT_OVER_NODE_ID),
    );
    expect(graphNodeLevels(on, ['savings:2', LEFT_OVER_NODE_ID])).toEqual([2, 2]);
  });

  it('reports how many drawn category links could be grouped, whichever mode is asked for', () => {
    // Two grouped (Groceries, Rent) and one not (Hobbies) — the count drives whether the panel
    // shows a toggle at all, so it must be right in both modes.
    const transactions = [income, onGroceries, onRent, onUngrouped];
    expect(groupedGraphOf(transactions, false).groupableCategoryCount).toBe(2);
    expect(groupedGraphOf(transactions, true).groupableCategoryCount).toBe(2);

    // Nothing groupable at all: the toggle would be a control that can only ever do nothing.
    expect(groupedGraphOf([income, onUngrouped], true).groupableCategoryCount).toBe(0);
    expect(groupedGraphOf([income, onUngrouped], true).nodes.some((n) => n.kind === 'group')).toBe(
      false,
    );
  });
});
