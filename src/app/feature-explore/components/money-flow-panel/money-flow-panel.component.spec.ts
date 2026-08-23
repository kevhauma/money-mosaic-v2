import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { ECElementEvent } from 'echarts/core';
import { provideEchartsCore } from 'ngx-echarts';
import { vi } from 'vitest';
import {
  AccountsRepository,
  appDb,
  CategoriesRepository,
  TransactionsRepository,
  type Account,
  type Category,
  type Transaction,
} from '@/core/data-access';
import {
  AccountsStore,
  AppSettingsStore,
  CategoriesStore,
  RangeStore,
  TransactionsStore,
} from '@/core/state';
import type { MoneyFlowGraph } from '@/core/stats';
import { echarts } from '@/shared/echarts';
import { stubEchartsBrowserApis } from '@/shared/echarts/echarts-jsdom.testing';
import { UNCATEGORISED_SENTINEL } from '@/shared/utils';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import {
  buildMoneyFlowChartOption,
  formatMoneyFlowLinkTooltip,
  formatMoneyFlowNodeTooltip,
  moneyFlowClickTarget,
  moneyFlowDrilldownParams,
  MoneyFlowPanelComponent,
  summariseMoneyFlow,
  type MoneyFlowClickTarget,
} from './money-flow-panel.component';

stubEchartsBrowserApis();

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

/** Same `checking` type as the main account, so a move between them has nowhere to go in a Sankey. */
const secondChecking: Account = {
  ...checking,
  id: 3,
  name: 'Second account',
  iban: 'NL03BANK0000000003',
  color: '#333333',
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

const transaction = (overrides: Partial<Transaction> = {}): Transaction => ({
  id: 1,
  accountId: 1,
  bookingDate: '2026-07-10',
  amount: -50,
  currency: 'EUR',
  rawDescription: 'Something',
  fingerprint: 'fp-1',
  createdAt: '2026-07-10T00:00:00.000Z',
  ...overrides,
});

const graph: MoneyFlowGraph = {
  nodes: [
    {
      id: 'income:10',
      name: 'Salary',
      level: 0,
      color: '#00ff00',
      kind: 'income-source',
      categoryId: 10,
    },
    {
      id: 'existing-balance',
      name: 'Existing balance',
      level: 0,
      color: '#9ca3af',
      kind: 'existing-balance',
    },
    {
      id: 'account:1',
      name: 'Main account',
      level: 1,
      color: '#111111',
      kind: 'account',
      accountId: 1,
    },
    {
      id: 'category:20',
      name: 'Groceries',
      level: 3,
      color: '#ff0000',
      kind: 'category',
      categoryId: 20,
    },
    // Deliberately shares its display name with the account above — the namespacing case.
    {
      id: 'category:21',
      name: 'Main account',
      level: 3,
      color: '#0000ff',
      kind: 'category',
      categoryId: 21,
    },
    { id: 'left-over', name: 'Left over', level: 3, color: '#9ca3af', kind: 'left-over' },
  ],
  links: [
    { source: 'income:10', target: 'account:1', value: 2000 },
    { source: 'existing-balance', target: 'account:1', value: 100 },
    { source: 'account:1', target: 'category:20', value: 500 },
    { source: 'account:1', target: 'category:21', value: 100 },
    { source: 'account:1', target: 'left-over', value: 1500 },
  ],
  nettedOutLinkCount: 0,
  groupableCategoryCount: 0,
  sameTierTransferCount: 0,
};

type SankeyNode = { name: string; depth: number; itemStyle: { color: string }; cursor: string };
type SankeyLink = { source: string; target: string; value: number; cursor: string };
type SankeySeries = {
  type: string;
  data: SankeyNode[];
  links: SankeyLink[];
  label: { formatter: (params: { name: string }) => string };
};

const seriesOf = (option: ReturnType<typeof buildMoneyFlowChartOption>): SankeySeries =>
  (option as { series: SankeySeries[] }).series[0];

const labelFormatterOf = (
  option: ReturnType<typeof buildMoneyFlowChartOption>,
): ((params: { name: string }) => string) => seriesOf(option).label.formatter;

const palette = ['#a00000', '#b00000', '#c00000', '#d00000'];
const synthetic = { existingBalance: '#c00000', leftOver: '#a00000' };
const totals = summariseMoneyFlow(graph);

const optionFor = (privacyMode = false) =>
  buildMoneyFlowChartOption(graph, palette, synthetic, totals, privacyMode);

describe('buildMoneyFlowChartOption (TICKET-EXP-02)', () => {
  it('keys nodes by their namespaced id, not their display name', () => {
    const series = seriesOf(optionFor());

    // Two nodes are both named "Main account"; keying by name would silently merge them into one.
    expect(series.data.map((node) => node.name)).toEqual([
      'income:10',
      'existing-balance',
      'account:1',
      'category:20',
      'category:21',
      'left-over',
    ]);
    expect(new Set(series.data.map((node) => node.name)).size).toBe(6);
  });

  it("gives every node its own entity colour, and the two synthetic nodes the theme's", () => {
    const series = seriesOf(optionFor());
    const colorOf = (id: string) => series.data.find((node) => node.name === id)!.itemStyle.color;

    expect(colorOf('account:1')).toBe('#111111');
    expect(colorOf('category:20')).toBe('#ff0000');
    expect(colorOf('existing-balance')).toBe(synthetic.existingBalance);
    expect(colorOf('left-over')).toBe(synthetic.leftOver);
  });

  it('carries every link through unchanged, and states each node depth from its level', () => {
    const series = seriesOf(optionFor());

    expect(series.type).toBe('sankey');
    expect(series.links.map(({ source, target, value }) => ({ source, target, value }))).toEqual(
      graph.links,
    );
    expect(series.data.find((node) => node.name === 'account:1')!.depth).toBe(1);
    expect(series.data.find((node) => node.name === 'left-over')!.depth).toBe(3);
  });

  it('renders the display name as the label, so ids never reach the canvas', () => {
    const label = labelFormatterOf(optionFor());

    expect(label({ name: 'category:20' })).toBe('Groceries · €500,00');
    expect(label({ name: 'existing-balance' })).toBe('Existing balance · €100,00');
    // A node the graph doesn't carry degrades to its own key rather than to an empty label.
    expect(label({ name: 'account:99' })).toBe('account:99');
  });
});

describe('money flow tooltips (TICKET-EXP-04)', () => {
  withCleanFormatSettings();

  it('names both ends of a ribbon, its amount, and the denominator of its share', () => {
    const link = { source: 'account:1', target: 'category:20', value: 500 };

    // Main account's whole outflow is 500 + 100 + 1500 = 2100; 500 of that is ~23.8%.
    expect(formatMoneyFlowLinkTooltip(link, totals, false)).toBe(
      "Main account → Groceries<br/>€500,00<br/>23,8% of Main account's outflow",
    );
  });

  it('states an account node as both directions, and a source node as its outflow', () => {
    expect(formatMoneyFlowNodeTooltip('account:1', totals, false)).toBe(
      'Main account<br/>In: €2.100,00<br/>Out: €2.100,00<br/>100% of all money in',
    );
    expect(formatMoneyFlowNodeTooltip('income:10', totals, false)).toBe(
      'Salary<br/>Out: €2.000,00<br/>95,2% of all money in',
    );
    expect(formatMoneyFlowNodeTooltip('category:20', totals, false)).toBe(
      'Groceries<br/>In: €500,00<br/>23,8% of all money in',
    );
  });

  it('drops every absolute amount under privacy mode, and keeps the proportions', () => {
    const link = { source: 'account:1', target: 'category:20', value: 500 };

    expect(formatMoneyFlowLinkTooltip(link, totals, true)).toBe(
      "Main account → Groceries<br/>23,8% of Main account's outflow",
    );
    expect(formatMoneyFlowNodeTooltip('account:1', totals, true)).toBe(
      'Main account<br/>100% of all money in',
    );
    for (const text of [
      formatMoneyFlowLinkTooltip(link, totals, true),
      formatMoneyFlowNodeTooltip('account:1', totals, true),
      formatMoneyFlowNodeTooltip('income:10', totals, true),
    ]) {
      // Not a blanket "no digits" check — the percentages are meant to survive; what must not
      // survive is a currency figure, and `withCleanFormatSettings` pins the symbol to €.
      expect(text).not.toContain('€');
    }
  });

  it('omits the share line entirely when there is no denominator to be a share of', () => {
    const empty = summariseMoneyFlow({
      nodes: [{ id: 'category:20', name: 'Groceries', level: 3, color: '#f00', kind: 'category' }],
      links: [],
      nettedOutLinkCount: 0,
      groupableCategoryCount: 0,
      sameTierTransferCount: 0,
    });

    expect(formatMoneyFlowNodeTooltip('category:20', empty, false)).toBe('Groceries');
  });

  it('drops the amount suffix from node labels under privacy mode', () => {
    expect(labelFormatterOf(optionFor(false))({ name: 'category:20' })).toBe('Groceries · €500,00');
    expect(labelFormatterOf(optionFor(true))({ name: 'category:20' })).toBe('Groceries');
  });
});

describe('money flow drill-down (TICKET-EXP-04)', () => {
  const nodesById = totals.nodesById;
  const range = { from: '2026-07-01', to: '2026-07-31' };
  const paramsFor = (target: MoneyFlowClickTarget) =>
    moneyFlowDrilldownParams(target, nodesById, range);

  it('reads a click on a node and on a ribbon, and nothing from empty canvas', () => {
    expect(moneyFlowClickTarget({ dataType: 'node', name: 'account:1', data: undefined })).toEqual({
      kind: 'node',
      id: 'account:1',
    });
    expect(
      moneyFlowClickTarget({
        dataType: 'edge',
        name: '',
        data: { source: 'account:1', target: 'category:20' },
      }),
    ).toEqual({ kind: 'link', source: 'account:1', target: 'category:20' });
    expect(
      moneyFlowClickTarget({ dataType: undefined, name: '', data: undefined }),
    ).toBeUndefined();
  });

  it('filters by category for a category node and for the ribbon that lands on it', () => {
    expect(paramsFor({ kind: 'node', id: 'category:20' })).toEqual({ ...range, categoryId: 20 });
    expect(paramsFor({ kind: 'link', source: 'account:1', target: 'category:20' })).toEqual({
      ...range,
      categoryId: 20,
      accountId: 1,
    });
  });

  it('filters by account for an account node, and by both for an income ribbon', () => {
    expect(paramsFor({ kind: 'node', id: 'account:1' })).toEqual({ ...range, accountId: 1 });
    expect(paramsFor({ kind: 'link', source: 'income:10', target: 'account:1' })).toEqual({
      ...range,
      categoryId: 10,
      accountId: 1,
    });
  });

  it('drills an uncategorised node down with the shared sentinel, like the trend chart', () => {
    const uncategorised = summariseMoneyFlow({
      nodes: [
        {
          id: 'category:none',
          name: 'Uncategorised',
          level: 3,
          color: '#9ca3af',
          kind: 'category',
          categoryId: null,
        },
      ],
      links: [],
      nettedOutLinkCount: 0,
      groupableCategoryCount: 0,
      sameTierTransferCount: 0,
    });

    expect(
      moneyFlowDrilldownParams(
        { kind: 'node', id: 'category:none' },
        uncategorised.nodesById,
        range,
      ),
    ).toEqual({ ...range, categoryId: UNCATEGORISED_SENTINEL });
  });

  it('still reaches the category once a group level sits in between (TICKET-EXP-03)', () => {
    const withGroup = summariseMoneyFlow({
      nodes: [
        {
          id: 'account:1',
          name: 'Main account',
          level: 1,
          color: '#111',
          kind: 'account',
          accountId: 1,
        },
        { id: 'group:Living', name: 'Living', level: 3, color: '#f00', kind: 'group' },
        {
          id: 'category:20',
          name: 'Groceries',
          level: 4,
          color: '#f00',
          kind: 'category',
          categoryId: 20,
        },
      ],
      links: [
        { source: 'account:1', target: 'group:Living', value: 500 },
        { source: 'group:Living', target: 'category:20', value: 500 },
      ],
      nettedOutLinkCount: 0,
      groupableCategoryCount: 1,
      sameTierTransferCount: 0,
    });

    // The group hop drops the account half — a group can hold several accounts' spending — but the
    // category is still what the ribbon identifies.
    expect(
      moneyFlowDrilldownParams(
        { kind: 'link', source: 'group:Living', target: 'category:20' },
        withGroup.nodesById,
        range,
      ),
    ).toEqual({ ...range, categoryId: 20, accountId: undefined });
    // The group itself expresses no single filter, so it navigates nowhere.
    expect(
      moneyFlowDrilldownParams({ kind: 'node', id: 'group:Living' }, withGroup.nodesById, range),
    ).toBeUndefined();
    expect(
      moneyFlowDrilldownParams(
        { kind: 'link', source: 'account:1', target: 'group:Living' },
        withGroup.nodesById,
        range,
      ),
    ).toBeUndefined();
  });

  it('makes savings, existing-balance and left-over non-interactive, in params and in cursor', () => {
    for (const id of ['existing-balance', 'left-over']) {
      expect(paramsFor({ kind: 'node', id })).toBeUndefined();
    }
    expect(paramsFor({ kind: 'link', source: 'account:1', target: 'left-over' })).toBeUndefined();
    expect(
      paramsFor({ kind: 'link', source: 'existing-balance', target: 'account:1' }),
    ).toBeUndefined();

    const series = seriesOf(optionFor());
    const cursorOfNode = (id: string) => series.data.find((node) => node.name === id)!.cursor;
    expect(cursorOfNode('account:1')).toBe('pointer');
    expect(cursorOfNode('category:20')).toBe('pointer');
    expect(cursorOfNode('left-over')).toBe('default');
    expect(cursorOfNode('existing-balance')).toBe('default');

    const cursorOfLink = (source: string, target: string) =>
      series.links.find((link) => link.source === source && link.target === target)!.cursor;
    expect(cursorOfLink('account:1', 'category:20')).toBe('pointer');
    expect(cursorOfLink('account:1', 'left-over')).toBe('default');
  });
});

describe('MoneyFlowPanelComponent (TICKET-EXP-02)', () => {
  withCleanFormatSettings();

  // The privacy-mode test below writes the real `appSettings` singleton row through the real store.
  // Vitest runs with `isolate: false`, so an uncleared row survives into the next spec file in this
  // worker and breaks whoever expects an empty table (app-settings.repository.spec.ts).
  afterEach(async () => {
    await appDb.appSettings.clear();
  });

  const createFixture = async (
    transactions: Transaction[],
    categories: Category[] = [salary, groceries],
    accounts: Account[] = [checking],
  ): Promise<ComponentFixture<MoneyFlowPanelComponent>> => {
    await TestBed.configureTestingModule({
      imports: [MoneyFlowPanelComponent],
      providers: [
        provideRouter([]),
        provideEchartsCore({ echarts }),
        {
          provide: TransactionsRepository,
          useValue: { getAll: vi.fn().mockResolvedValue(transactions) },
        },
        {
          provide: AccountsRepository,
          useValue: { getAll: vi.fn().mockResolvedValue(accounts) },
        },
        {
          provide: CategoriesRepository,
          useValue: { getAll: vi.fn().mockResolvedValue(categories) },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(MoneyFlowPanelComponent);
    await TestBed.inject(TransactionsStore).hydrate();
    await TestBed.inject(AccountsStore).hydrate();
    await TestBed.inject(CategoriesStore).hydrate();
    TestBed.inject(RangeStore).setCustomRange('explore', '2026-07-01', '2026-07-31');
    fixture.detectChanges();
    return fixture;
  };

  it('renders the diagram and its sr-only figure table when the range holds flow', async () => {
    const fixture = await createFixture([
      transaction({ id: 1, amount: 2000, categoryId: salary.id }),
      transaction({ id: 2, amount: -500, categoryId: groceries.id }),
    ]);
    const host = fixture.nativeElement as HTMLElement;

    const chart = host.querySelector('[echarts]')!;
    expect(chart.getAttribute('role')).toBe('img');
    expect(chart.getAttribute('aria-label')).toContain('2026-07-01–2026-07-31');

    const rows = [...host.querySelectorAll('table.sr-only tbody tr')].map((row) =>
      [...row.children].map((cell) => cell.textContent?.trim()),
    );
    expect(rows).toEqual([
      ['Salary', 'Main account', '€2.000,00'],
      ['Main account', 'Left over', '€1.500,00'],
      ['Main account', 'Groceries', '€500,00'],
    ]);
  });

  it('renders nothing at all when the range holds no flow', async () => {
    const fixture = await createFixture([
      transaction({ id: 1, bookingDate: '2026-06-01', amount: 2000, categoryId: salary.id }),
    ]);

    expect((fixture.nativeElement as HTMLElement).querySelector('mm-paper')).toBeNull();
  });

  it('reacts to the Explore range, not the Dashboard one', async () => {
    const fixture = await createFixture([
      transaction({ id: 1, amount: 2000, categoryId: salary.id }),
      transaction({ id: 2, amount: -500, categoryId: groceries.id }),
    ]);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('table.sr-only')).not.toBeNull();

    TestBed.inject(RangeStore).setCustomRange('dashboard', '2020-01-01', '2020-01-31');
    fixture.detectChanges();
    expect(host.querySelector('table.sr-only')).not.toBeNull();

    TestBed.inject(RangeStore).setCustomRange('explore', '2020-01-01', '2020-01-31');
    fixture.detectChanges();
    expect(host.querySelector('mm-paper')).toBeNull();
  });

  it('says so when a flow was netted out, rather than under-reporting silently', async () => {
    // Under balance semantics only an account-to-account ribbon can net out: an expense and an
    // income ribbon each accumulate one sign, so they can never cancel each other (TICKET-EXP-06).
    const fixture = await createFixture(
      [
        transaction({ id: 1, amount: 2000, categoryId: salary.id }),
        transaction({ id: 2, amount: -500, counterpartyIban: savings.iban }),
        transaction({ id: 3, amount: 500, counterpartyIban: savings.iban }),
      ],
      [salary, groceries],
      [checking, savings],
    );

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('1 flow is not shown');
  });

  // An unexplained node standing for money from outside the range reads as a mystery income source,
  // especially once every real source is categorised — which is the feedback that prompted both the
  // rename and this note (TICKET-EXP-06). It explains only what is actually drawn.
  it('explains the left-over ribbon, and stays quiet about the one it did not draw', async () => {
    const fixture = await createFixture([
      transaction({ id: 1, amount: 2000, categoryId: salary.id }),
      transaction({ id: 2, amount: -500, categoryId: groceries.id }),
    ]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('“Left over” is money that arrived');
    expect(text).not.toContain('“Existing balance”');
  });

  it('explains the existing-balance ribbon when an account spends without taking anything in', async () => {
    const fixture = await createFixture([
      transaction({ id: 1, amount: -500, categoryId: groceries.id }),
    ]);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('“Existing balance” is money an account was already holding');
    expect(text).not.toContain('“Left over”');
  });

  it('says so when a transfer runs between two accounts of the same kind, which it cannot draw', async () => {
    const fixture = await createFixture(
      [
        transaction({ id: 1, amount: 2000, categoryId: salary.id }),
        transaction({ id: 2, amount: -400, counterpartyIban: secondChecking.iban }),
      ],
      [salary, groceries],
      [checking, secondChecking],
    );

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('1 transfer between two accounts of the same kind is not shown');
  });

  describe('drill-down and privacy (TICKET-EXP-04)', () => {
    const flow = [
      transaction({ id: 1, amount: 2000, categoryId: salary.id }),
      transaction({ id: 2, amount: -500, categoryId: groceries.id }),
    ];

    const tableOf = (fixture: ComponentFixture<MoneyFlowPanelComponent>): HTMLElement =>
      (fixture.nativeElement as HTMLElement).querySelector('table.sr-only')!;

    it('links each interactive sr-only row to the same filtered list its ribbon navigates to', async () => {
      const fixture = await createFixture(flow);
      const links = [...tableOf(fixture).querySelectorAll('a')].map((anchor) =>
        anchor.getAttribute('href'),
      );

      // Salary → Main account carries both ends; Main account → Groceries carries category + account.
      expect(links).toEqual([
        '/transactions?from=2026-07-01&to=2026-07-31&categoryId=10&accountId=1',
        '/transactions?from=2026-07-01&to=2026-07-31&categoryId=20&accountId=1',
      ]);
      // The left-over row is one of three, and is deliberately not a link.
      expect(tableOf(fixture).querySelectorAll('tbody tr')).toHaveLength(3);
    });

    it('navigates on a canvas click, with the Explore range and the clicked identity', async () => {
      const fixture = await createFixture(flow);
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      fixture.componentInstance['onChartClick']({
        dataType: 'edge',
        name: '',
        data: { source: 'account:1', target: 'category:20' },
      } as unknown as ECElementEvent);

      expect(navigate).toHaveBeenCalledExactlyOnceWith(['/transactions'], {
        queryParams: {
          from: '2026-07-01',
          to: '2026-07-31',
          categoryId: '20',
          accountId: '1',
        },
      });
    });

    it('does not navigate for a non-interactive element', async () => {
      const fixture = await createFixture(flow);
      const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

      fixture.componentInstance['onChartClick']({
        dataType: 'node',
        name: 'left-over',
        data: undefined,
      } as unknown as ECElementEvent);

      expect(navigate).not.toHaveBeenCalled();
    });

    it('withholds every amount with privacy mode on, keeping the ribbons and the links', async () => {
      const fixture = await createFixture(flow);
      expect(tableOf(fixture).textContent).toContain('€2.000,00');

      await TestBed.inject(AppSettingsStore).setPrivacyMode(true);
      fixture.detectChanges();

      const tableText = tableOf(fixture).textContent as string;
      expect(tableText).not.toContain('€');
      expect(tableText).toContain('hidden');
      // The drill-down survives: privacy hides figures, it doesn't disable the interface.
      expect(tableOf(fixture).querySelectorAll('a')).toHaveLength(2);

      const option = fixture.componentInstance['chartOption']() as {
        tooltip: { formatter: (params: unknown) => string };
        series: [{ links: unknown[]; label: { formatter: (p: { name: string }) => string } }];
      };
      // Ribbons still render at full fidelity — a proportion is not a figure.
      expect(option.series[0].links).toHaveLength(3);
      expect(option.series[0].label.formatter({ name: 'account:1' })).not.toContain('€');
      expect(
        option.tooltip.formatter({
          dataType: 'edge',
          data: { source: 'account:1', target: 'category:20' },
        }),
      ).not.toContain('€');
    });
  });

  describe('category grouping (TICKET-EXP-03)', () => {
    const grouped: Category = { ...groceries, group: 'Living' };
    const flow = [
      transaction({ id: 1, amount: 2000, categoryId: salary.id }),
      transaction({ id: 2, amount: -500, categoryId: groceries.id }),
    ];

    const toggleOf = (
      fixture: ComponentFixture<MoneyFlowPanelComponent>,
    ): HTMLInputElement | null =>
      (fixture.nativeElement as HTMLElement).querySelector('input[type="checkbox"]');

    it('hides the toggle entirely when no category in range has a group', async () => {
      const fixture = await createFixture(flow, [salary, groceries]);

      expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Group categories');
      expect(toggleOf(fixture)).toBeNull();
    });

    it('shows the toggle, defaulted on, once a category in range has one', async () => {
      const fixture = await createFixture(flow, [salary, grouped]);

      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Group categories');
      expect(toggleOf(fixture)!.checked).toBe(true);
    });

    it('rewrites the sr-only table to whichever level structure is drawn', async () => {
      const fixture = await createFixture(flow, [salary, grouped]);
      const rowsNow = (): (string | undefined)[][] =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll('table.sr-only tbody tr')].map(
          (row) => [...row.children].map((cell) => cell.textContent?.trim()),
        );

      // Grouping on: the €500 reaches Groceries via Living, as two ribbons of the same value.
      expect(rowsNow()).toEqual([
        ['Salary', 'Main account', '€2.000,00'],
        ['Main account', 'Left over', '€1.500,00'],
        ['Main account', 'Living', '€500,00'],
        ['Living', 'Groceries', '€500,00'],
      ]);

      toggleOf(fixture)!.click();
      fixture.detectChanges();

      // Off: one direct ribbon again, and every figure unchanged.
      expect(rowsNow()).toEqual([
        ['Salary', 'Main account', '€2.000,00'],
        ['Main account', 'Left over', '€1.500,00'],
        ['Main account', 'Groceries', '€500,00'],
      ]);
    });

    it('keeps the choice in ChartOptionsStore, so it survives a remount within the session', async () => {
      const fixture = await createFixture(flow, [salary, grouped]);
      toggleOf(fixture)!.click();
      fixture.detectChanges();
      expect(toggleOf(fixture)!.checked).toBe(false);

      const remounted = TestBed.createComponent(MoneyFlowPanelComponent);
      remounted.detectChanges();

      expect(
        (remounted.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
          'input[type="checkbox"]',
        )!.checked,
      ).toBe(false);
    });
  });
});
