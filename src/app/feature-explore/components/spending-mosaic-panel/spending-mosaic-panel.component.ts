import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import type { EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import type { Account, Transaction } from '@/core/data-access';
import {
  computeCategoryBreakdown,
  computeCategoryExpenseTransactions,
  computeSpendingMosaic,
  type MosaicNode,
  type StatsJointMode,
} from '@/core/stats';
import {
  AccountsStore,
  AppSettingsStore,
  CategoriesStore,
  chartJointMode,
  RangeStore,
  TransactionsStore,
} from '@/core/state';
import { savingsAccountIbans } from '@/core/transfers';
import { resolveChartAnimation } from '@/shared/echarts';
import {
  FlexComponent,
  LabelComponent,
  PaperComponent,
  PrivacyBlurComponent,
  TypographyComponent,
} from '@/shared/ui';
import { formatCurrency, formatDate, formatPercent, HIDDEN_AMOUNT_TEXT } from '@/shared/utils';

/**
 * Tall enough for a group's categories to still be readable once they are subdivided, and fixed
 * rather than scaled by tile count: a treemap fills whatever box it is given, so more tiles make each
 * one smaller instead of making the chart taller. Past this the section stops fitting a laptop
 * screen, and drill-down is the answer to a crowded mosaic anyway.
 */
const SPENDING_MOSAIC_HEIGHT_PX = 520;

/** The figure table's "inside" column for a top-level tile, which sits inside nothing — a stated fact rather than an empty cell. */
const UNGROUPED_LABEL = 'Ungrouped';

/** One row of the visually-hidden figure table — one per *tile*, at every level (TICKET-STAT-20). */
export type SpendingMosaicRow = {
  /**
   * The tile's namespaced id, `:total` for a parent's own row. Tracked on rather than on the display
   * text for the same reason the aggregate namespaces its ids: two categories may share a name (the
   * `categories` table indexes `name` without a uniqueness constraint), and two payments to the same
   * shop certainly do — a duplicate `@for` key is an NG0955 at runtime.
   */
  id: string;
  /** What this tile sits inside: its group, its category, or `Ungrouped` for a top-level tile. */
  inside: string;
  /** The tile's own name; a parent tile's total is named `All <parent>` so the two rows can't be confused. */
  tile: string;
  /**
   * Already `HIDDEN_AMOUNT_TEXT` under privacy mode — an `sr-only` table is read aloud, so a figure
   * has to be *withheld* rather than blurred, and the substitution belongs here rather than in a
   * template branch (templates state facts, they don't derive them).
   */
  amount: string;
  /**
   * The tile's share of all spending. A parent's own row says so in the cell itself (TICKET-EXP-09)
   * rather than relying on a visual cue: this table is read aloud, where indentation and italics
   * carry nothing, and a parent's share **already contains its children's** (see `MosaicNode.share`).
   * Listed flat and unqualified, the column added up past 100% — a UX review measured 110.6%.
   */
  share: string;
  /** True on a parent's own total row, whose share repeats what the rows inside it add up to. */
  isSubtotal: boolean;
};

/** What a subtotal row's share cell says after the percentage, so adding the column up stays possible by ear. */
const SUBTOTAL_NOTE = ' — subtotal of the rows inside it';

const rowFor = (
  node: MosaicNode,
  id: string,
  inside: string,
  tile: string,
  privacyMode: boolean,
  isSubtotal = false,
): SpendingMosaicRow => ({
  id,
  inside,
  tile,
  amount: privacyMode ? HIDDEN_AMOUNT_TEXT : formatCurrency(node.value),
  share: `${formatPercent(node.share)}${isSubtotal ? SUBTOTAL_NOTE : ''}`,
  isSubtotal,
});

/**
 * Every tile's parent, name, amount and share as DOM text, off the same nodes the chart renders so
 * the two can't diverge — and at every level, so the payments a drilled-in category shows on canvas
 * (TICKET-EXP-08) are readable here without drilling. A parent is listed with its own total ahead of
 * its children, which is the one figure the drill-down makes visible on screen and would otherwise
 * be invisible to a reader of the table.
 *
 * Those parent rows are flagged `isSubtotal` and say so in their share cell (TICKET-EXP-09). The
 * arithmetic in `spending-mosaic.ts` is right and untouched — a group tile visually *contains* its
 * children, so its share being their sum is what makes the treemap area-true. The defect was only
 * that this table flattens the hierarchy, so the same money appeared twice with nothing saying so.
 * Leaves partition the whole (every parent's share is exactly its children's sum, at any depth), so
 * the unqualified rows still add up to 100% however deep the tree goes.
 */
export const spendingMosaicRows = (
  nodes: readonly MosaicNode[],
  privacyMode: boolean,
  inside: string = UNGROUPED_LABEL,
): SpendingMosaicRow[] =>
  nodes.flatMap((node) =>
    node.children
      ? [
          rowFor(node, `${node.id}:total`, inside, `All ${node.name}`, privacyMode, true),
          ...spendingMosaicRows(node.children, privacyMode, node.name),
        ]
      : [rowFor(node, node.id, inside, node.name, privacyMode)],
  );

/** Every tile at every depth, keyed by id — what a label/tooltip formatter is handed a data item and has to resolve. */
const mosaicNodesById = (nodes: readonly MosaicNode[]): Map<string, MosaicNode> =>
  new Map(
    nodes.flatMap((node) => [
      [node.id, node] as const,
      ...mosaicNodesById(node.children ?? []).entries(),
    ]),
  );

/**
 * One tile's tooltip: its name, what it cost, and what share of the range's expenses that is. Pure,
 * so it is unit-tested without a chart instance (the `tooltip-formatter.ts` precedent). Under privacy
 * mode the absolute amount is dropped and the proportion kept — a proportion is not a figure, the
 * same line the Dashboard and the Sankey already draw (TICKET-PRIV-01, TICKET-EXP-04).
 */
export const formatSpendingMosaicTooltip = (node: MosaicNode, privacyMode: boolean): string =>
  [
    // A payment tile is named after its counterparty, and a category holds the same counterparty
    // over and over — the date is what tells this week's shop from last week's (TICKET-EXP-08).
    node.date ? `${node.name} · ${formatDate(node.date)}` : node.name,
    privacyMode ? null : formatCurrency(node.value),
    `${formatPercent(node.share)} of all spending`,
  ]
    .filter((part): part is string => part !== null)
    .join('<br/>');

/**
 * The strip a parent tile keeps for itself above its children. Deliberately thin, and it carries the
 * parent's **share and nothing else**: the name is the widest thing a tile can say and it was eating
 * the room its children are drawn in. What the box is stays available where it costs no space — the
 * tooltip, and the figure table.
 */
const PARENT_HEADER_HEIGHT_PX = 14;

/**
 * How big a tile has to be, in square pixels, before echarts draws what is inside it. Below this a
 * category renders as one solid rectangle rather than as a scatter of sub-pixel payment slivers —
 * a subdivision is only worth drawing where it can be read. Roughly a 40×40 box.
 */
const CHILDREN_VISIBLE_MIN_PX2 = 1600;

/**
 * How far a payment tile's colour may drift from its category's, as echarts' own saturation range —
 * the treatment the Obama-budget treemap uses for its third level. One flat block of colour reads as
 * a single tile at a glance; a little variation makes "seven payments" legible as seven without
 * giving a payment a colour that means something else. Only saturation moves, so the hue stays the
 * category's own.
 */
const PAYMENT_COLOR_SATURATION: [number, number] = [0.32, 0.55];

/**
 * Pure echarts-option builder, kept outside the component so the tile mapping is testable without a
 * chart instance or `TestBed` — the `buildMoneyFlowChartOption` precedent.
 *
 * **The whole hierarchy is drawn at once** — groups holding categories holding payments — after the
 * shape of echarts' own Obama-budget treemap. There is no drill-down and no breadcrumb: with every
 * level already on screen, a click had nothing left to reveal, and `zoomToNode` is a viewport
 * transform rather than a re-layout, so it left the mosaic half outside its own box (seen live,
 * twice, with `roam` both off and on). A tile too small to subdivide legibly simply draws solid.
 *
 * Every category tile carries its own colour from the aggregate, so no categorical palette is
 * passed: a category's tile is the colour of its dot everywhere else in the app, and a group's is
 * its heaviest member's. Payments inherit their category's hue with echarts varying the saturation.
 */
export const buildSpendingMosaicOption = (
  nodes: readonly MosaicNode[],
  privacyMode: boolean,
): EChartsCoreOption => {
  const nodesById = mosaicNodesById(nodes);
  const nodeOf = (params: { data?: unknown }): MosaicNode | undefined =>
    nodesById.get((params.data as { id?: string } | undefined)?.id ?? '');

  // Name + share, never an amount: a label is painted onto a canvas, where `mm-privacy-blur` cannot
  // reach it, so the figure is simply not put there in the first place.
  const label = (params: { data?: unknown; name?: string }): string => {
    const node = nodeOf(params);
    return node ? `${node.name} · ${formatPercent(node.share)}` : (params.name ?? '');
  };

  /** A parent's own strip: its share alone, because its name would cost more room than the strip is worth. */
  const headerLabel = (params: { data?: unknown }): string => {
    const node = nodeOf(params);
    return node ? formatPercent(node.share) : '';
  };

  /**
   * A payment tile deliberately carries **no** explicit colour: left to echarts it inherits its
   * category's, varied within `colorSaturation`, which is what makes seven payments read as seven
   * rather than as one flat block. Everything above it states its colour outright.
   */
  const toDataItem = (node: MosaicNode): Record<string, unknown> => ({
    id: node.id,
    name: node.name,
    value: node.value,
    ...(node.date ? {} : { itemStyle: { color: node.color } }),
    ...(node.children ? { children: node.children.map(toDataItem) } : {}),
  });

  return {
    ...resolveChartAnimation(),
    tooltip: {
      trigger: 'item',
      formatter: (params: { data?: unknown }) => {
        const node = nodeOf(params);
        return node ? formatSpendingMosaicTooltip(node, privacyMode) : '';
      },
    },
    series: [
      {
        type: 'treemap',
        // Nothing to click into — every level is already drawn — so the click is turned off rather
        // than left to zoom the viewport, and the breadcrumb goes with it: a chart with one state
        // needs no way back to it.
        roam: false,
        nodeClick: false,
        breadcrumb: { show: false },
        // Area is the whole encoding, so no tile is ever resized for legibility's sake — a tile too
        // small to draw is simply not drawn, and its area stays inside its parent rather than being
        // inflated to a visible minimum. `childrenVisibleMin` is the same rule one level up: a
        // category too small to hold readable payments shows as one solid tile instead of mush.
        visibleMin: 0,
        childrenVisibleMin: CHILDREN_VISIBLE_MIN_PX2,
        label: { formatter: label },
        // The thin strip a parent keeps above its children, carrying its share and not its name
        // (`headerLabel`) — the name is the widest thing a tile can say, and this strip is space
        // taken from the children it sits over.
        upperLabel: { show: true, height: PARENT_HEADER_HEIGHT_PX, formatter: headerLabel },
        levels: [
          // `levels[0]` is the *root* — the invisible container holding the top-level tiles, not a
          // tile of its own. Its header strip is turned off explicitly: inherited from the series it
          // paints an empty band across the top of the chart, which reads as a rendering fault
          // (seen in the live check).
          { upperLabel: { show: false }, itemStyle: { borderWidth: 0, gapWidth: 4 } },
          { itemStyle: { gapWidth: 2 } },
          // The payment level (TICKET-EXP-08), after the Obama-budget treemap's third level: one
          // thin gap and a saturation range, so a category's payments read as several tiles of that
          // category rather than as one flat block.
          {
            colorSaturation: PAYMENT_COLOR_SATURATION,
            itemStyle: { gapWidth: 1, borderColorSaturation: 0.6 },
          },
        ],
        data: nodes.map(toDataItem),
      },
    ],
  };
};

/** Booking date inside the panel's own range — the `classifyForStats` window test, asked here only to decide whether to *offer* the switch. */
const inRange = (transaction: Transaction, from: string, to: string): boolean =>
  transaction.bookingDate >= from && transaction.bookingDate <= to;

/**
 * Whether a transaction's attribution is a question at all: it sits on a joint account, or the user
 * weighted it by hand. Exactly the pair `classifyForStats` routes through `resolveContribution`, and
 * the only inputs on which its two joint modes can disagree.
 */
const isAttributable = (
  transaction: Transaction,
  accountsById: ReadonlyMap<number, Account>,
): boolean =>
  transaction.attributionOverride != null ||
  accountsById.get(transaction.accountId)?.type === 'joint';

/**
 * The Explore page's mosaic (FR-EXP-4, TICKET-EXP-07/08): the range's expenses as one area-true
 * picture, three levels deep — group tiles subdivided into their categories, and each category into
 * the individual payments behind it. The only *hierarchical* composition view the app has, where the
 * Dashboard's pie is flat and the Sankey's ribbons are read by width rather than area, and the only
 * one that answers "was that a few big payments or a lot of small ones".
 *
 * Every figure comes from `computeCategoryBreakdown` and `computeCategoryExpenseTransactions`, both
 * routed through `classifyForStats` on identical inputs, so no level can disagree with the one above
 * it or with the Dashboard's pie.
 *
 * **The one switch on the panel** is which of those figures it asks for: your own share of a joint
 * account's spending (the default, and the only thing the rest of the app draws), or every euro that
 * actually left the accounts — `classifyForStats`'s existing `'share'`/`'raw'` dial rather than a
 * second classifier, so the two modes differ in attribution and in nothing else. It is offered only
 * where it could change something (`canSplitAttribution`), and while it is on `'raw'` the panel says
 * so in its caption and its `aria-label`: an area picture that silently disagrees with the Dashboard
 * would read as a bug rather than as a different question.
 *
 * Renders nothing when the range holds no expenses — the page's own empty state (TICKET-EXP-01)
 * covers the no-data-anywhere case, and an empty treemap frame says less than no frame.
 */
@Component({
  selector: 'app-spending-mosaic-panel',
  imports: [
    FlexComponent,
    LabelComponent,
    NgxEchartsDirective,
    PaperComponent,
    PrivacyBlurComponent,
    TypographyComponent,
  ],
  templateUrl: './spending-mosaic-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpendingMosaicPanelComponent {
  private readonly transactionsStore = inject(TransactionsStore);
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly accountsStore = inject(AccountsStore);
  private readonly rangeStore = inject(RangeStore);
  private readonly appSettingsStore = inject(AppSettingsStore);

  protected readonly privacyMode = this.appSettingsStore.privacyModeEnabled;
  protected readonly chartHeightPx = SPENDING_MOSAIC_HEIGHT_PX;

  private readonly range = computed(() => ({
    from: this.rangeStore.from('explore'),
    to: this.rangeStore.to('explore'),
  }));

  private readonly ownSavingsIbans = computed(() =>
    savingsAccountIbans(this.accountsStore.accounts()),
  );

  /**
   * Which question the mosaic is drawing an answer to — my share of the spending, or every euro that
   * left the accounts (`'share'` / `'raw'`, `classifyForStats`'s own dial). Session-scoped like every
   * other per-chart choice, and seeded to `'share'` so the mosaic opens agreeing with the Dashboard's
   * pie; flipping it is an explicit act, and the panel says so in its caption while it lasts.
   */
  private readonly jointModeControl = chartJointMode(
    'explore-spending-mosaic',
    (): StatsJointMode => 'share',
  );
  protected readonly jointMode = this.jointModeControl.value;
  protected readonly setJointMode = this.jointModeControl.set;
  protected readonly showMyShareOnly = computed(() => this.jointMode() === 'share');

  protected readonly toggleMyShareOnly = (myShareOnly: boolean): void =>
    this.setJointMode(myShareOnly ? 'share' : 'raw');

  /**
   * Whether the switch has anything to switch — the `canGroup` precedent on the panel above. Without
   * a joint account or a hand-set attribution override the two modes classify identically, and a
   * control that provably cannot change the picture is worse than no control: it invites the reader
   * to hunt for a difference that isn't there.
   *
   * Structural rather than a second aggregation run: it asks whether an attributable *input* exists
   * at all, which is cheap, instead of computing both mosaics to compare their totals.
   */
  protected readonly canSplitAttribution = computed(() => {
    const accountsById = this.accountsStore.accountsById();
    const { from, to } = this.range();

    return this.transactionsStore
      .transactions()
      .some(
        (transaction) =>
          inRange(transaction, from, to) && isAttributable(transaction, accountsById),
      );
  });

  /**
   * The seven arguments every `classifyForStats`-backed aggregate in `core/stats` takes, in their
   * shared order — **argument-for-argument what `StatsStore.categoryBreakdown` passes**, on this
   * page's range instead of the Dashboard's and in this panel's joint mode instead of the default.
   * Held once rather than spelled out per call site: the ticket's "the mosaic, its payments and the
   * Dashboard's pie can never disagree" promise is exactly the claim that all of them see the same
   * inputs, and one tuple makes that structural instead of a thing to keep in step by hand — the
   * mode included, so the category tiles and the payments inside them can never be classified two
   * different ways.
   */
  private readonly statsInput = computed(
    () =>
      [
        this.transactionsStore.transactions(),
        this.categoriesStore.categoriesById(),
        this.range().from,
        this.range().to,
        this.ownSavingsIbans(),
        this.accountsStore.accountsById(),
        this.jointMode(),
      ] as const,
  );

  private readonly breakdown = computed(() => computeCategoryBreakdown(...this.statsInput()));

  /**
   * The payments behind each category (TICKET-EXP-08) — the mosaic's third level. Routed through
   * `classifyForStats` like the breakdown above it, so a payment tile and the category tile it sits
   * in can't disagree about what a transaction contributed.
   */
  private readonly transactionsByCategory = computed(() =>
    computeCategoryExpenseTransactions(...this.statsInput()),
  );

  protected readonly nodes = computed(() =>
    computeSpendingMosaic(
      this.breakdown().expenseByCategory,
      this.categoriesStore.categoriesById(),
      this.transactionsByCategory(),
    ),
  );

  /**
   * Said only when refunds actually netted something down inside a category the mosaic **draws**. A
   * refund has no honest area on a treemap, so it is not a tile — but a category whose payments add
   * up to more than the tile they sit in deserves the sentence that explains why, rather than leaving
   * the reader to find the discrepancy themselves. A category refunded away entirely has no tile at
   * all, and its refund belongs to no drawn total, so it is not counted here either.
   *
   * The amount is always the real figure: this is ordinary visible DOM, so privacy mode *blurs* it in
   * the template rather than withholding it (the `sr-only` table is the surface that has to withhold).
   */
  protected readonly refundNote = computed<{ amount: string; text: string } | null>(() => {
    const drawnCategoryIds = new Set(
      this.nodes()
        .flatMap((node) => node.children ?? [node])
        .map((node) => node.categoryId)
        .filter((categoryId): categoryId is number | null => categoryId !== undefined),
    );

    let refunded = 0;
    for (const [categoryId, entry] of this.transactionsByCategory()) {
      if (drawnCategoryIds.has(categoryId)) refunded += entry.refunded;
    }

    return refunded > 0
      ? {
          amount: formatCurrency(refunded),
          text: 'in refunds is already netted out of these totals, and is not drawn as a tile.',
        }
      : null;
  });

  protected readonly hasExpenses = computed(() => this.nodes().length > 0);

  protected readonly chartOption = computed<EChartsCoreOption>(() =>
    buildSpendingMosaicOption(this.nodes(), this.privacyMode()),
  );

  protected readonly rows = computed(() => spendingMosaicRows(this.nodes(), this.privacyMode()));

  /**
   * What the tiles are measuring, in words — said in the caption, in the `sr-only` table's own
   * caption and again in the chart's `aria-label`, because the switch changes every figure on the
   * panel and a reader who arrives at the table would otherwise have no way to know which of the two
   * totals they are reading.
   *
   * **Empty where the switch isn't offered**, which is what lets all three call sites state it the
   * same way — "joint accounts count at your own share" is a sentence about nothing on an account
   * set with nothing to attribute, and one signal deciding that beats three template conditions
   * agreeing about it.
   */
  protected readonly modeNote = computed(() => {
    if (!this.canSplitAttribution()) return '';
    return this.showMyShareOnly()
      ? 'Joint accounts count at your own share of them.'
      : 'Joint accounts count in full, including the part a co-owner pays.';
  });

  protected readonly chartAriaLabel = computed(() =>
    [
      `Spending mosaic: expenses by category group, category and individual payment, sized by amount, ${this.range().from}–${this.range().to}.`,
      this.modeNote(),
      'Table with values follows',
    ]
      .filter(Boolean)
      .join(' '),
  );
}
