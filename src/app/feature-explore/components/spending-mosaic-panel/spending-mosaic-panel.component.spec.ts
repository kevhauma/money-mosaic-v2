import { ComponentFixture, TestBed } from '@angular/core/testing';
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
import type { MosaicNode } from '@/core/stats';
import { echarts } from '@/shared/echarts';
import { stubEchartsBrowserApis } from '@/shared/echarts/echarts-jsdom.testing';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import {
  buildSpendingMosaicOption,
  formatSpendingMosaicTooltip,
  SpendingMosaicPanelComponent,
  spendingMosaicRows,
} from './spending-mosaic-panel.component';

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

const groceries: Category = {
  id: 20,
  name: 'Groceries',
  kind: 'expense',
  group: 'Living',
  color: '#ff0000',
  icon: 'cart',
  archived: false,
  isSystem: false,
};

const rent: Category = { ...groceries, id: 21, name: 'Rent', color: '#00ff00' };
const cinema: Category = {
  ...groceries,
  id: 22,
  name: 'Cinema',
  group: undefined,
  color: '#0000ff',
};
const salary: Category = { ...cinema, id: 10, name: 'Salary', kind: 'income', color: '#ffff00' };

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

const mosaic: MosaicNode[] = [
  {
    id: 'group:Living',
    name: 'Living',
    value: 750,
    share: 0.75,
    color: '#00ff00',
    children: [
      { id: 'category:21', name: 'Rent', value: 500, share: 0.5, color: '#00ff00', categoryId: 21 },
      {
        id: 'category:20',
        name: 'Groceries',
        value: 250,
        share: 0.25,
        color: '#ff0000',
        categoryId: 20,
      },
    ],
  },
  { id: 'category:22', name: 'Cinema', value: 250, share: 0.25, color: '#0000ff', categoryId: 22 },
];

type TreemapItem = {
  id: string;
  name: string;
  value: number;
  /** Absent on a payment tile, which inherits its category's colour from echarts instead. */
  itemStyle?: { color: string };
  children?: TreemapItem[];
};
type TreemapSeries = {
  type: string;
  nodeClick: false;
  roam: false;
  leafDepth?: number;
  breadcrumb: { show: boolean };
  data: TreemapItem[];
  label: { formatter: (params: { data?: unknown; name?: string }) => string };
  upperLabel: { show: boolean; formatter: (params: { data?: unknown; name?: string }) => string };
  levels: { upperLabel?: { show: boolean } }[];
};

const seriesOf = (option: ReturnType<typeof buildSpendingMosaicOption>): TreemapSeries =>
  (option as { series: TreemapSeries[] }).series[0];

const tooltipOf = (
  option: ReturnType<typeof buildSpendingMosaicOption>,
): ((params: { data?: unknown }) => string) =>
  (option as { tooltip: { formatter: (params: { data?: unknown }) => string } }).tooltip.formatter;

describe('buildSpendingMosaicOption (TICKET-EXP-07)', () => {
  withCleanFormatSettings();

  it('draws a treemap whose tiles keep their namespaced id, their name and their own colour', () => {
    const series = seriesOf(buildSpendingMosaicOption(mosaic, false));

    expect(series.type).toBe('treemap');
    expect(series.data.map((tile) => [tile.id, tile.name, tile.value])).toEqual([
      ['group:Living', 'Living', 750],
      ['category:22', 'Cinema', 250],
    ]);
    // A group's children nest inside it — the hierarchy is what makes the picture area-true at two
    // levels rather than one.
    expect(series.data[0].children?.map((tile) => [tile.id, tile.itemStyle?.color])).toEqual([
      ['category:21', '#00ff00'],
      ['category:20', '#ff0000'],
    ]);
    expect(series.data[1].itemStyle?.color).toBe('#0000ff');
  });

  it('draws every level at once, with nothing to click into', () => {
    const series = seriesOf(buildSpendingMosaicOption(mosaic, false));

    // `leafDepth` must stay unset — setting it draws one level at a time, and seeing a category's
    // payments *beside* its neighbour's is the whole point of the picture (TICKET-EXP-08).
    expect(series.leafDepth).toBeUndefined();
    // With every level on screen a click has nothing to reveal, and `zoomToNode` is a viewport
    // transform that leaves the mosaic half outside its own box (seen live). So: no click, no
    // breadcrumb, no roam.
    expect(series.nodeClick).toBe(false);
    expect(series.breadcrumb.show).toBe(false);
    expect(series.roam).toBe(false);
  });

  it('labels every tile with its name and share, groups included, and never with an amount', () => {
    const { label, upperLabel } = seriesOf(buildSpendingMosaicOption(mosaic, false));

    expect(label.formatter({ data: { id: 'category:20' } })).toBe('Groceries · 25%');
    // A parent's own strip carries its share and *not* its name: the name is the widest thing a
    // tile can say, and the strip is room taken from the children under it.
    expect(upperLabel.show).toBe(true);
    expect(upperLabel.formatter({ data: { id: 'group:Living' } })).toBe('75%');
    // A tile the mosaic doesn't carry degrades to its own name rather than to an empty label.
    expect(label.formatter({ data: { id: 'category:99' }, name: 'Gone' })).toBe('Gone');
    expect(label.formatter({ data: { id: 'category:20' } })).not.toContain('€');
    // …but the root is not a tile: inheriting the header bar paints an empty strip across the top.
    expect(seriesOf(buildSpendingMosaicOption(mosaic, false)).levels[0].upperLabel?.show).toBe(
      false,
    );
  });

  it('states the amount and the share in a tooltip, and drops only the amount under privacy mode', () => {
    expect(
      tooltipOf(buildSpendingMosaicOption(mosaic, false))({ data: { id: 'group:Living' } }),
    ).toBe('Living<br/>€750.00<br/>75% of all spending');
    expect(
      tooltipOf(buildSpendingMosaicOption(mosaic, true))({ data: { id: 'group:Living' } }),
    ).toBe('Living<br/>75% of all spending');
    expect(formatSpendingMosaicTooltip(mosaic[1], true)).toBe('Cinema<br/>25% of all spending');
    // A payment tile adds its date, because a category's tiles all carry the same shop's name.
    expect(
      formatSpendingMosaicTooltip(
        {
          id: 'txn:9',
          name: 'FreshMarket',
          value: 58.4,
          share: 0.05,
          color: '#f00',
          date: '2026-07-15',
        },
        false,
      ),
    ).toBe('FreshMarket · 07/15/2026<br/>€58.40<br/>5% of all spending');
    // An empty click on the canvas carries no tile, and gets no tooltip rather than an empty box.
    expect(tooltipOf(buildSpendingMosaicOption(mosaic, false))({ data: undefined })).toBe('');
  });
});

describe('spendingMosaicRows (TICKET-STAT-20)', () => {
  withCleanFormatSettings();

  it('mirrors every tile — group totals, their members, and the ungrouped ones', () => {
    expect(spendingMosaicRows(mosaic, false)).toEqual([
      {
        id: 'group:Living:total',
        inside: 'Ungrouped',
        tile: 'All Living',
        amount: '€750.00',
        share: '75%',
      },
      { id: 'category:21', inside: 'Living', tile: 'Rent', amount: '€500.00', share: '50%' },
      { id: 'category:20', inside: 'Living', tile: 'Groceries', amount: '€250.00', share: '25%' },
      { id: 'category:22', inside: 'Ungrouped', tile: 'Cinema', amount: '€250.00', share: '25%' },
    ]);
    // Every row keys on the namespaced id, never on display text: two categories may share a name,
    // and a duplicate `@for` track key is an NG0955 at runtime.
    expect(new Set(spendingMosaicRows(mosaic, false).map((row) => row.id)).size).toBe(4);
  });

  it('withholds the amounts under privacy mode, and keeps the shares', () => {
    const rows = spendingMosaicRows(mosaic, true);

    // Withheld, not blurred, and substituted here rather than in a template branch.
    expect(rows.every((row) => row.amount === 'hidden')).toBe(true);
    expect(rows.map((row) => row.share)).toEqual(['75%', '50%', '25%', '25%']);
  });

  it('descends into a category payments, naming what each one sits inside (TICKET-EXP-08)', () => {
    const withPayments: MosaicNode[] = [
      {
        ...mosaic[1],
        children: [
          {
            id: 'txn:7',
            name: 'Corner shop',
            value: 150,
            share: 0.15,
            color: '#0000ff',
          },
          { id: 'txn:8', name: 'Corner shop', value: 100, share: 0.1, color: '#0000ff' },
        ],
      },
    ];

    expect(spendingMosaicRows(withPayments, false)).toEqual([
      {
        id: 'category:22:total',
        inside: 'Ungrouped',
        tile: 'All Cinema',
        amount: '€250.00',
        share: '25%',
      },
      { id: 'txn:7', inside: 'Cinema', tile: 'Corner shop', amount: '€150.00', share: '15%' },
      { id: 'txn:8', inside: 'Cinema', tile: 'Corner shop', amount: '€100.00', share: '10%' },
    ]);
    // Two payments to the same shop share a name and must not share a track key.
    expect(new Set(spendingMosaicRows(withPayments, false).map((row) => row.id)).size).toBe(3);
  });
});

describe('SpendingMosaicPanelComponent (TICKET-EXP-07)', () => {
  withCleanFormatSettings();

  // The privacy-mode tests below write the real `appSettings` singleton row through the real store.
  // Vitest runs with `isolate: false`, so an uncleared row survives into the next spec file in this
  // worker and breaks whoever expects an empty table (app-settings.repository.spec.ts).
  afterEach(async () => {
    await appDb.appSettings.clear();
  });

  const createFixture = async (
    transactions: Transaction[],
    categories: Category[] = [salary, groceries, rent, cinema],
  ): Promise<ComponentFixture<SpendingMosaicPanelComponent>> => {
    await TestBed.configureTestingModule({
      imports: [SpendingMosaicPanelComponent],
      providers: [
        provideEchartsCore({ echarts }),
        {
          provide: TransactionsRepository,
          useValue: { getAll: vi.fn().mockResolvedValue(transactions) },
        },
        {
          provide: AccountsRepository,
          useValue: { getAll: vi.fn().mockResolvedValue([checking]) },
        },
        {
          provide: CategoriesRepository,
          useValue: { getAll: vi.fn().mockResolvedValue(categories) },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(SpendingMosaicPanelComponent);
    await TestBed.inject(TransactionsStore).hydrate();
    await TestBed.inject(AccountsStore).hydrate();
    await TestBed.inject(CategoriesStore).hydrate();
    TestBed.inject(RangeStore).setCustomRange('explore', '2026-07-01', '2026-07-31');
    fixture.detectChanges();
    return fixture;
  };

  const spend = [
    transaction({ id: 1, amount: -500, categoryId: rent.id }),
    transaction({ id: 2, amount: -250, categoryId: groceries.id }),
    transaction({ id: 3, amount: -250, categoryId: cinema.id }),
    transaction({ id: 4, amount: 2000, categoryId: salary.id }),
  ];

  const rowsOf = (
    fixture: ComponentFixture<SpendingMosaicPanelComponent>,
  ): (string | undefined)[][] =>
    [...(fixture.nativeElement as HTMLElement).querySelectorAll('table.sr-only tbody tr')].map(
      (row) => [...row.children].map((cell) => cell.textContent?.trim()),
    );

  it('renders the mosaic and its sr-only figure table when the range holds expenses', async () => {
    const fixture = await createFixture(spend);
    const host = fixture.nativeElement as HTMLElement;

    const chart = host.querySelector('[echarts]')!;
    expect(chart.getAttribute('role')).toBe('img');
    expect(chart.getAttribute('aria-label')).toContain('2026-07-01–2026-07-31');

    // Income is deliberately absent: a mixed-sign treemap has no honest area semantics.
    expect(rowsOf(fixture)).toEqual([
      // The first column is what a tile sits *inside*, so a top-level group sits inside nothing
      // (TICKET-EXP-08 generalised it from "Group" once payments made it three levels deep).
      ['Ungrouped', 'All Living', '€750.00', '75%'],
      ['Living', 'Rent', '€500.00', '50%'],
      ['Living', 'Groceries', '€250.00', '25%'],
      ['Ungrouped', 'Cinema', '€250.00', '25%'],
    ]);
    expect(host.textContent).not.toContain('Salary');
  });

  it('renders nothing at all when the range holds no expenses', async () => {
    const fixture = await createFixture([
      transaction({ id: 1, amount: 2000, categoryId: salary.id }),
    ]);

    expect((fixture.nativeElement as HTMLElement).querySelector('mm-paper')).toBeNull();
  });

  it('reacts to the Explore range, not the Dashboard one', async () => {
    const fixture = await createFixture(spend);
    const host = fixture.nativeElement as HTMLElement;
    expect(host.querySelector('table.sr-only')).not.toBeNull();

    TestBed.inject(RangeStore).setCustomRange('dashboard', '2020-01-01', '2020-01-31');
    fixture.detectChanges();
    expect(host.querySelector('table.sr-only')).not.toBeNull();

    TestBed.inject(RangeStore).setCustomRange('explore', '2020-01-01', '2020-01-31');
    fixture.detectChanges();
    expect(host.querySelector('mm-paper')).toBeNull();
  });

  it('subdivides a category into its own payments, off real transactions (TICKET-EXP-08)', async () => {
    const fixture = await createFixture([
      ...spend,
      transaction({ id: 5, amount: -30, categoryId: cinema.id, counterpartyName: 'Cinema City' }),
      transaction({ id: 6, amount: -20, categoryId: cinema.id, counterpartyName: 'Popcorn stand' }),
    ]);

    // Cinema is €250 + €30 + €20 = €300 across three payments, and every one of them is a tile.
    const cinemaTile = fixture.componentInstance['nodes']().find((node) => node.name === 'Cinema');
    expect(cinemaTile?.children?.map((child) => [child.name, child.value])).toEqual([
      ['Something', 250],
      ['Cinema City', 30],
      ['Popcorn stand', 20],
    ]);
    // …and each one is readable in the figure table without drilling into the chart.
    expect(rowsOf(fixture)).toContainEqual(['Cinema', 'Cinema City', '€30.00', '2.9%']);
    // Rent and Groceries have one payment each, so they stay leaves rather than gaining a row that
    // repeats them.
    expect(rowsOf(fixture)).toContainEqual(['Living', 'Rent', '€500.00', '47.6%']);
  });

  it('says what refunds took out, rather than showing tiles that outweigh their category', async () => {
    const fixture = await createFixture([
      ...spend,
      transaction({ id: 5, amount: 40, categoryId: groceries.id }),
    ]);

    const note = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(note).toContain('€40.00');
    expect(note).toContain('in refunds is already netted out');
  });

  it('blurs the refund figure under privacy mode rather than withholding it', async () => {
    const fixture = await createFixture([
      ...spend,
      transaction({ id: 5, amount: 40, categoryId: groceries.id }),
    ]);

    await TestBed.inject(AppSettingsStore).setPrivacyMode(true);
    fixture.detectChanges();

    // Visible DOM, so it blurs — the `sr-only` table is the surface that has to *withhold* instead.
    const blur = (fixture.nativeElement as HTMLElement).querySelector('mm-privacy-blur');
    expect(blur?.textContent).toContain('€40.00');
    expect(fixture.componentInstance['privacyMode']()).toBe(true);
  });

  it('withholds every amount with privacy mode on, keeping the shares and the tiles', async () => {
    const fixture = await createFixture(spend);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('€750.00');

    await TestBed.inject(AppSettingsStore).setPrivacyMode(true);
    fixture.detectChanges();

    const tableText =
      (fixture.nativeElement as HTMLElement).querySelector('table.sr-only')?.textContent ?? '';
    expect(tableText).not.toContain('€');
    expect(tableText).toContain('hidden');
    expect(tableText).toContain('75%');

    const option = fixture.componentInstance['chartOption']();
    expect(tooltipOf(option)({ data: { id: 'group:Living' } })).not.toContain('€');
    expect(seriesOf(option).data).toHaveLength(2);
  });
});
