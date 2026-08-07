import type { Account, Category, Transaction } from '@/core/data-access';
import {
  EXISTING_BALANCE_NODE_ID,
  computeMoneyFlowGraph,
  LEFT_OVER_NODE_ID,
  LEVEL_DESTINATION,
  LEVEL_GROUPED_CATEGORY,
  LEVEL_PRIMARY_ACCOUNT,
  LEVEL_SECONDARY_ACCOUNT,
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

const secondChecking: Account = {
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

/** A partner's contribution into the joint account — excluded from net worth, included here (TICKET-EXP-06). */
const contribution: Category = {
  ...salary,
  id: 30,
  name: 'Partner contribution',
  kind: 'neutral',
  color: '#888800',
};

const accountsById = new Map<number, Account>(
  [checking, savings, secondChecking, joint].map((account) => [account.id!, account]),
);
const categoriesById = new Map<number, Category>(
  [salary, groceries, rent, sameNameAsAccount, contribution].map((category) => [
    category.id!,
    category,
  ]),
);

const groupedCategoriesById = new Map<number, Category>([
  [salary.id!, salary],
  [groceries.id!, { ...groceries, group: 'Living' }],
  [rent.id!, { ...rent, group: 'Living' }],
  // An empty-string group must read as "no group", not as a group whose name is blank.
  [hobbies.id!, { ...hobbies, group: '  ' }],
  [groupNamed.id!, groupNamed],
]);

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
  computeMoneyFlowGraph(transactions, categoriesById, accountsById, FROM, TO);

const linkBetween = (graph: MoneyFlowGraph, source: string, target: string): FlowLink | undefined =>
  graph.links.find((link) => link.source === source && link.target === target);

const levelOf = (graph: MoneyFlowGraph, id: string): number | undefined =>
  graph.nodes.find((node) => node.id === id)?.level;

const into = (graph: MoneyFlowGraph, id: string): number =>
  graph.links.filter((link) => link.target === id).reduce((sum, link) => sum + link.value, 0);
const outOf = (graph: MoneyFlowGraph, id: string): number =>
  graph.links.filter((link) => link.source === id).reduce((sum, link) => sum + link.value, 0);

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

  it('emits every link strictly downhill, so the graph is acyclic by construction', () => {
    const graph = graphOf([
      transaction({ amount: 2000, categoryId: salary.id }),
      transaction({ amount: -500, categoryId: groceries.id }),
      transaction({ amount: -300, counterpartyIban: savings.iban }),
      transaction({ amount: -250, counterpartyIban: joint.iban }),
      transaction({ accountId: joint.id, amount: -200, categoryId: rent.id }),
      transaction({ accountId: savings.id, amount: -100, categoryId: rent.id }),
      transaction({ amount: -80 }),
      transaction({ amount: 40 }),
    ]);

    expect(graph.links.length).toBeGreaterThan(0);
    for (const link of graph.links) {
      // Strictly downhill, not exactly +1: an ordinary purchase from a checking account runs
      // level 1 → 3, jumping the secondary-account column entirely (TICKET-EXP-06).
      expect(levelOf(graph, link.target)!).toBeGreaterThan(levelOf(graph, link.source)!);
    }
  });

  it('balances an account that spends more than it takes in with an existing-balance link', () => {
    const graph = graphOf([
      transaction({ amount: 100, categoryId: salary.id }),
      transaction({ amount: -900, categoryId: rent.id }),
    ]);

    const income = linkBetween(graph, 'income:10', 'account:1')!.value;
    const existingBalance = linkBetween(graph, EXISTING_BALANCE_NODE_ID, 'account:1')!.value;
    const spent = linkBetween(graph, 'account:1', 'category:21')!.value;

    expect(existingBalance).toBe(800);
    expect(income + existingBalance).toBe(spent);
    expect(linkBetween(graph, 'account:1', LEFT_OVER_NODE_ID)).toBeUndefined();
  });

  it('balances an account that takes in more than it spends with a left-over link', () => {
    const graph = graphOf([
      transaction({ amount: 1200, categoryId: salary.id }),
      transaction({ amount: -200, categoryId: groceries.id }),
      transaction({ amount: -300, counterpartyIban: savings.iban }),
    ]);

    expect(into(graph, 'account:1')).toBe(outOf(graph, 'account:1'));
    expect(linkBetween(graph, 'account:1', LEFT_OVER_NODE_ID)!.value).toBe(700);
    expect(linkBetween(graph, EXISTING_BALANCE_NODE_ID, 'account:1')).toBeUndefined();
  });

  it('gives uncategorised income and uncategorised expense their own labelled nodes', () => {
    const graph = graphOf([transaction({ amount: 900 }), transaction({ amount: -120 })]);

    expect(graph.nodes.find((node) => node.id === 'income:none')).toMatchObject({
      name: UNCATEGORISED_INCOME_NAME,
      kind: 'income-source',
      categoryId: null,
    });
    expect(graph.nodes.find((node) => node.id === 'category:none')).toMatchObject({
      name: UNCATEGORISED_EXPENSE_NAME,
      kind: 'category',
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
      // Both outside [FROM, TO], so neither is a movement inside the range.
      transaction({ bookingDate: '2026-06-30', amount: 1000, categoryId: salary.id }),
      transaction({ bookingDate: '2026-08-01', amount: -100, categoryId: groceries.id }),
    ]);

    expect(graph).toEqual({
      nodes: [],
      links: [],
      nettedOutLinkCount: 0,
      groupableCategoryCount: 0,
      sameTierTransferCount: 0,
    });
  });

  it('leaves out a nullified row and a zero-amount row, which are not movements at all', () => {
    const graph = graphOf([
      transaction({ amount: 500, categoryId: salary.id }),
      transaction({ amount: -400, categoryId: groceries.id, nullified: true }),
      transaction({ amount: 0, categoryId: groceries.id }),
    ]);

    expect(linkBetween(graph, 'account:1', 'category:20')).toBeUndefined();
    expect(linkBetween(graph, 'account:1', LEFT_OVER_NODE_ID)?.value).toBe(500);
  });

  it('balances every account independently when several are active in the same range', () => {
    const graph = graphOf([
      transaction({ accountId: 1, amount: 2000, categoryId: salary.id }),
      transaction({ accountId: 1, amount: -500, categoryId: groceries.id }),
      transaction({ accountId: 4, amount: -400, categoryId: rent.id }),
    ]);

    for (const account of graph.nodes.filter((node) => node.kind === 'account')) {
      expect(into(graph, account.id)).toBeCloseTo(outOf(graph, account.id), 6);
    }
    // The joint account took nothing in during the range, so all 400 of its spend came out of the
    // balance it was already holding.
    expect(linkBetween(graph, EXISTING_BALANCE_NODE_ID, 'account:4')?.value).toBe(400);
  });
});

describe('computeMoneyFlowGraph: account balance, not net worth (TICKET-EXP-06)', () => {
  it("shows a joint account's spending at face value, not weighted by ownershipShare", () => {
    const graph = graphOf([
      transaction({ accountId: joint.id, amount: -400, categoryId: rent.id }),
    ]);

    // The account really parted with 400. A 50% owner's *net-worth* share is 200, which is what the
    // Dashboard reports — the two answer different questions and are meant to differ here.
    expect(linkBetween(graph, 'account:4', 'category:21')?.value).toBe(400);
  });

  it("includes a partner's neutral-category contribution as a real income source", () => {
    const graph = graphOf([
      transaction({ accountId: joint.id, amount: 600, categoryId: contribution.id }),
      transaction({ accountId: joint.id, amount: -400, categoryId: rent.id }),
    ]);

    // `neutral` is excluded from every net-worth aggregate; the money still arrived in the account.
    expect(linkBetween(graph, 'income:30', 'account:4')?.value).toBe(600);
    expect(linkBetween(graph, 'account:4', LEFT_OVER_NODE_ID)?.value).toBe(200);
    expect(linkBetween(graph, EXISTING_BALANCE_NODE_ID, 'account:4')).toBeUndefined();
  });

  it('shows a refund as money arriving, not as its category netting down', () => {
    const graph = graphOf([
      transaction({ amount: -300, categoryId: groceries.id }),
      transaction({ amount: 120, categoryId: groceries.id }),
    ]);

    // Balance semantics: the 300 left and the 120 came back. Netting them would report a 180 spend
    // that never happened as a single movement, and would hide the refund entirely.
    expect(linkBetween(graph, 'account:1', 'category:20')?.value).toBe(300);
    expect(linkBetween(graph, 'income:20', 'account:1')?.value).toBe(120);
    expect(graph.nettedOutLinkCount).toBe(0);
  });

  it("makes each account's imbalance exactly its balance change over the range", () => {
    const graph = graphOf([
      transaction({ amount: 2000, categoryId: salary.id }),
      transaction({ amount: -1250, categoryId: rent.id }),
    ]);

    // +2000 −1250 = +750, drawn as left-over. That equivalence is what "account balance, not net
    // worth" buys: the two synthetic ribbons are the period's balance delta, nothing fuzzier.
    expect(linkBetween(graph, 'account:1', LEFT_OVER_NODE_ID)?.value).toBe(750);
  });
});

describe('computeMoneyFlowGraph: account tiers and transfers (TICKET-EXP-06)', () => {
  it('puts everyday accounts on tier 1 and joint/savings/investment accounts on tier 2', () => {
    const graph = graphOf([
      transaction({ amount: -250, counterpartyIban: joint.iban }),
      transaction({ amount: -300, counterpartyIban: savings.iban }),
    ]);

    expect(levelOf(graph, 'account:1')).toBe(LEVEL_PRIMARY_ACCOUNT);
    expect(levelOf(graph, 'account:4')).toBe(LEVEL_SECONDARY_ACCOUNT);
    expect(levelOf(graph, 'account:2')).toBe(LEVEL_SECONDARY_ACCOUNT);
  });

  it('draws a checking → joint transfer as a ribbon between the two accounts', () => {
    const graph = graphOf([
      transaction({ amount: 2000, categoryId: salary.id }),
      transaction({ amount: -250, counterpartyIban: joint.iban }),
      transaction({ accountId: joint.id, amount: -200, categoryId: rent.id }),
    ]);

    expect(linkBetween(graph, 'account:1', 'account:4')?.value).toBe(250);
    // The joint account's spending is now funded by the visible transfer rather than by a
    // existing-balance ribbon that misattributed it to money held before the range.
    expect(linkBetween(graph, EXISTING_BALANCE_NODE_ID, 'account:4')).toBeUndefined();
    expect(linkBetween(graph, 'account:4', LEFT_OVER_NODE_ID)?.value).toBe(50);
  });

  it('draws a linked transfer once, from the shallower leg, never as two opposing ribbons', () => {
    const graph = graphOf([
      transaction({
        id: 100,
        accountId: 1,
        amount: -250,
        transferId: 7,
        counterpartyIban: joint.iban,
      }),
      transaction({
        id: 101,
        accountId: 4,
        amount: 250,
        transferId: 7,
        counterpartyIban: checking.iban,
      }),
    ]);

    expect(graph.links.filter((link) => link.source.startsWith('account:'))).toHaveLength(2);
    expect(linkBetween(graph, 'account:1', 'account:4')?.value).toBe(250);
    expect(linkBetween(graph, 'account:4', 'account:1')).toBeUndefined();
    // Neither leg is income or expense — a move between own accounts touches no category.
    expect(graph.nodes.some((node) => node.kind === 'category')).toBe(false);
    expect(graph.nodes.some((node) => node.kind === 'income-source')).toBe(false);
  });

  it('nets the ribbon down when money moves back up, instead of drawing an uphill link', () => {
    const graph = graphOf([
      transaction({ amount: 1000, categoryId: salary.id }),
      transaction({ amount: -400, counterpartyIban: savings.iban }),
      // A withdrawal: recorded on the checking side as money arriving from savings.
      transaction({ amount: 150, counterpartyIban: savings.iban }),
    ]);

    expect(linkBetween(graph, 'account:1', 'account:2')?.value).toBe(250);
    expect(linkBetween(graph, 'account:2', 'account:1')).toBeUndefined();
    // And it must never be mistaken for income arriving from outside.
    expect(
      graph.nodes.some((node) => node.kind === 'income-source' && node.name === 'Rainy day'),
    ).toBe(false);
  });

  it('drops a transfer ribbon that fully round-tripped, and counts the drop', () => {
    const graph = graphOf([
      transaction({ amount: 1000, categoryId: salary.id }),
      transaction({ amount: -400, counterpartyIban: savings.iban }),
      transaction({ amount: 400, counterpartyIban: savings.iban }),
    ]);

    expect(linkBetween(graph, 'account:1', 'account:2')).toBeUndefined();
    expect(graph.nodes.find((node) => node.id === 'account:2')).toBeUndefined();
    expect(graph.nettedOutLinkCount).toBe(1);
    // The dropped ribbon must not leave a phantom balance behind: all 1000 is still left over.
    expect(linkBetween(graph, 'account:1', LEFT_OVER_NODE_ID)?.value).toBe(1000);
  });

  it('counts, rather than silently drops, a movement between two accounts on the same tier', () => {
    const graph = graphOf([
      transaction({ amount: 500, categoryId: salary.id }),
      // Both `checking` — one Sankey column, so there is no way to draw it.
      transaction({ amount: -200, counterpartyIban: secondChecking.iban }),
    ]);

    expect(graph.sameTierTransferCount).toBe(1);
    expect(linkBetween(graph, 'account:1', 'account:3')).toBeUndefined();
  });

  it('spends from a savings account as an ordinary outflow, with one node per account', () => {
    const graph = graphOf([
      transaction({ amount: -300, counterpartyIban: savings.iban }),
      transaction({ accountId: savings.id, amount: -100, categoryId: rent.id }),
    ]);

    // One node for the savings account, not a terminal "savings:" node beside an "account:" one.
    expect(graph.nodes.filter((node) => node.name === 'Rainy day')).toHaveLength(1);
    expect(linkBetween(graph, 'account:2', 'category:21')?.value).toBe(100);
    expect(into(graph, 'account:2')).toBe(outOf(graph, 'account:2'));
  });

  it('treats a counterparty IBAN that is not an own account as an ordinary category flow', () => {
    const graph = graphOf([
      transaction({
        amount: -75,
        categoryId: groceries.id,
        counterpartyIban: 'NL99BANK0000000099',
      }),
    ]);

    expect(linkBetween(graph, 'account:1', 'category:20')?.value).toBe(75);
    expect(graph.sameTierTransferCount).toBe(0);
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
      groupCategories,
    );

  const income = transaction({ amount: 3000, categoryId: salary.id });
  const onGroceries = transaction({ amount: -500, categoryId: groceries.id });
  const onRent = transaction({ amount: -900, categoryId: rent.id });
  const onUngrouped = transaction({ amount: -100, categoryId: hobbies.id });

  it('is off by default, so an existing caller sees exactly the graph it saw before', () => {
    const defaulted = computeMoneyFlowGraph(
      [income, onGroceries],
      groupedCategoriesById,
      accountsById,
      FROM,
      TO,
    );

    expect(defaulted.nodes.some((node) => node.kind === 'group')).toBe(false);
    expect(linkBetween(defaulted, 'account:1', 'category:20')?.value).toBe(500);
  });

  it('splits a grouped category into two links of equal value, and leaves an ungrouped one direct', () => {
    const graph = groupedGraphOf([income, onGroceries, onUngrouped], true);

    expect(linkBetween(graph, 'account:1', 'group:Living')?.value).toBe(500);
    expect(linkBetween(graph, 'group:Living', 'category:20')?.value).toBe(500);
    expect(linkBetween(graph, 'account:1', 'category:20')).toBeUndefined();

    // Ungrouped: still one direct link, still terminating at the destination level — no synthetic
    // "Ungrouped" bucket, which would draw as if it were a real spending group.
    expect(linkBetween(graph, 'account:1', 'category:23')?.value).toBe(100);
    expect(levelOf(graph, 'category:23')).toBe(LEVEL_DESTINATION);
    expect(levelOf(graph, 'category:20')).toBe(LEVEL_GROUPED_CATEGORY);
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

    expect(into(on, 'account:1')).toBe(into(off, 'account:1'));
    expect(outOf(on, 'account:1')).toBe(outOf(off, 'account:1'));
    expect(into(on, 'account:1')).toBe(outOf(on, 'account:1'));

    for (const id of ['category:20', 'category:21', 'category:23']) {
      expect(into(on, id)).toBe(into(off, id));
    }
    expect(into(on, LEFT_OVER_NODE_ID)).toBe(into(off, LEFT_OVER_NODE_ID));

    // The group is a pass-through: what enters leaves, or it would silently distort the layout.
    expect(into(on, 'group:Living')).toBe(outOf(on, 'group:Living'));
  });

  it('still runs strictly downhill with grouping on, alongside an account-to-account transfer', () => {
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
      expect(levelOf(graph, link.target)!).toBeGreaterThan(levelOf(graph, link.source)!);
    }
  });

  it('colours a group as its highest-total member category', () => {
    const graph = groupedGraphOf([income, onGroceries, onRent], true);

    expect(graph.nodes.find((node) => node.id === 'group:Living')?.color).toBe(rent.color);
  });

  it('keeps a group and a category of the same name apart', () => {
    const graph = groupedGraphOf(
      [income, onGroceries, transaction({ amount: -250, categoryId: groupNamed.id })],
      true,
    );

    const sameNamed = graph.nodes.filter((node) => node.name === 'Living');
    expect(sameNamed.map((node) => node.id).sort()).toEqual(['category:24', 'group:Living']);
    expect(sameNamed.map((node) => node.kind).sort()).toEqual(['category', 'group']);
  });

  it('leaves transfers and left-over untouched by grouping', () => {
    const transactions = [
      income,
      onGroceries,
      transaction({ amount: -300, counterpartyIban: savings.iban }),
    ];
    const off = groupedGraphOf(transactions, false);
    const on = groupedGraphOf(transactions, true);

    expect(linkBetween(on, 'account:1', 'account:2')).toEqual(
      linkBetween(off, 'account:1', 'account:2'),
    );
    expect(linkBetween(on, 'account:1', LEFT_OVER_NODE_ID)).toEqual(
      linkBetween(off, 'account:1', LEFT_OVER_NODE_ID),
    );
    expect(levelOf(on, 'account:2')).toBe(LEVEL_SECONDARY_ACCOUNT);
  });

  it('reports how many drawn category links could be grouped, whichever mode is asked for', () => {
    const transactions = [income, onGroceries, onRent, onUngrouped];
    expect(groupedGraphOf(transactions, false).groupableCategoryCount).toBe(2);
    expect(groupedGraphOf(transactions, true).groupableCategoryCount).toBe(2);

    expect(groupedGraphOf([income, onUngrouped], true).groupableCategoryCount).toBe(0);
    expect(groupedGraphOf([income, onUngrouped], true).nodes.some((n) => n.kind === 'group')).toBe(
      false,
    );
  });
});
