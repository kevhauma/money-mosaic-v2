import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import type { ECElementEvent, EChartsCoreOption } from 'echarts/core';
import { NgxEchartsDirective } from 'ngx-echarts';
import {
  computeMoneyFlowGraph,
  type FlowLink,
  type FlowNode,
  type MoneyFlowGraph,
} from '@/core/stats';
import { savingsAccountIbans } from '@/core/transfers';
import {
  AccountsStore,
  AppSettingsStore,
  CategoriesStore,
  chartGroupCategories,
  RangeStore,
  TransactionsStore,
} from '@/core/state';
import { resolveChartAnimation, resolveChartCategoricalColors } from '@/shared/echarts';
import { FlexComponent, LabelComponent, PaperComponent, TypographyComponent } from '@/shared/ui';
import {
  buildTransactionDrilldownParams,
  formatCurrency,
  formatPercent,
  UNCATEGORISED_SENTINEL,
  type TransactionDrilldownParams,
} from '@/shared/utils';

export type MoneyFlowAccessibleRow = {
  source: string;
  target: string;
  /** `null` under privacy mode — an `sr-only` table is read aloud, so a figure has to be *withheld* rather than blurred. */
  amount: string | null;
  /** The same filtered `/transactions` list the ribbon navigates to, or `null` when the ribbon isn't interactive either. */
  queryParams: Record<string, string> | null;
};

/**
 * Which palette slot each synthetic node takes. `carried-in` and `left-over` are the only nodes with
 * no entity of their own to be coloured by, and the aggregate is theme-free by the `core/` never
 * imports `shared/echarts` rule — so their colour is resolved here, where the palette already is.
 * Two ends of the palette, because the two never mean the same thing: one is money arriving from
 * before the range, the other money that never left.
 */
const CARRIED_IN_COLOR_SLOT = 2;
const LEFT_OVER_COLOR_SLOT = 0;

/** What the screen-reader table says in place of an amount while privacy mode is on. */
const HIDDEN_AMOUNT = 'hidden';

/**
 * The per-node totals every tooltip needs, derived once from the graph. Kept as data rather than
 * recomputed per hover: ECharts calls a tooltip formatter on every pointer move.
 */
export type MoneyFlowTotals = {
  nodesById: ReadonlyMap<string, FlowNode>;
  inflow: ReadonlyMap<string, number>;
  outflow: ReadonlyMap<string, number>;
  /**
   * Everything that entered an account in this range — the *stated* denominator for a node's share.
   * "18%" on its own invites the wrong reading, so every percentage names what it is a share of.
   */
  totalInflow: number;
};

export const summariseMoneyFlow = (graph: MoneyFlowGraph): MoneyFlowTotals => {
  const inflow = new Map<string, number>();
  const outflow = new Map<string, number>();
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));

  for (const { source, target, value } of graph.links) {
    outflow.set(source, (outflow.get(source) ?? 0) + value);
    inflow.set(target, (inflow.get(target) ?? 0) + value);
  }

  const totalInflow = graph.nodes
    .filter((node) => node.kind === 'account')
    .reduce((sum, node) => sum + (inflow.get(node.id) ?? 0), 0);

  return { nodesById, inflow, outflow, totalInflow };
};

const nameOf = (totals: MoneyFlowTotals, id: string): string =>
  totals.nodesById.get(id)?.name ?? id;

/** A share line, or nothing at all when there is no denominator to be a share of. */
const shareLine = (value: number, of: number, denominatorLabel: string): string | null =>
  of > 0 ? `${formatPercent(value / of)} of ${denominatorLabel}` : null;

/**
 * One ribbon's tooltip: what it connects, what it is worth, and what share of its *source's* whole
 * outflow it represents — e.g. "Main account → Groceries · €412.60 · 18% of Main account's outflow".
 *
 * Pure, so it is unit-tested without a chart instance (the `tooltip-formatter.ts` precedent). Under
 * privacy mode the absolute amount is dropped and the proportion kept: a proportion is not a figure,
 * the same line the Dashboard already draws (TICKET-PRIV-01).
 */
export const formatMoneyFlowLinkTooltip = (
  link: FlowLink,
  totals: MoneyFlowTotals,
  privacyMode: boolean,
): string => {
  const sourceName = nameOf(totals, link.source);
  const heading = `${sourceName} → ${nameOf(totals, link.target)}`;
  const share = shareLine(
    link.value,
    totals.outflow.get(link.source) ?? 0,
    `${sourceName}'s outflow`,
  );

  return [heading, privacyMode ? null : formatCurrency(link.value), share]
    .filter((part): part is string => part !== null)
    .join('<br/>');
};

/**
 * One node's tooltip: its name, its total — in for a destination, out for a source, both for an
 * account — and its share of the period's total inflow. Pure and privacy-aware for the same reasons
 * as the link formatter above.
 */
export const formatMoneyFlowNodeTooltip = (
  nodeId: string,
  totals: MoneyFlowTotals,
  privacyMode: boolean,
): string => {
  const into = totals.inflow.get(nodeId) ?? 0;
  const outOf = totals.outflow.get(nodeId) ?? 0;
  const lines = [nameOf(totals, nodeId)];

  if (!privacyMode) {
    if (into > 0) lines.push(`In: ${formatCurrency(into)}`);
    if (outOf > 0) lines.push(`Out: ${formatCurrency(outOf)}`);
  }

  // A source node has no inflow of its own, so its outflow is the figure that describes it.
  const share = shareLine(into > 0 ? into : outOf, totals.totalInflow, 'all money in');
  if (share) lines.push(share);

  return lines.join('<br/>');
};

export type MoneyFlowClickTarget =
  { kind: 'node'; id: string } | { kind: 'link'; source: string; target: string };

/** What an echarts click landed on, or `undefined` for a click that carries no usable identity (empty canvas). */
export const moneyFlowClickTarget = (
  event: Pick<ECElementEvent, 'dataType' | 'name' | 'data'>,
): MoneyFlowClickTarget | undefined => {
  if (event.dataType === 'edge') {
    const edge = event.data as { source?: string; target?: string } | undefined;
    return edge?.source && edge.target
      ? { kind: 'link', source: edge.source, target: edge.target }
      : undefined;
  }
  return event.name ? { kind: 'node', id: event.name } : undefined;
};

const nodeFilter = (node: FlowNode | undefined): TransactionDrilldownParams | undefined => {
  if (node?.kind === 'category') return { categoryId: node.categoryId ?? UNCATEGORISED_SENTINEL };
  if (node?.kind === 'account' && node.accountId != null) return { accountId: node.accountId };
  return undefined;
};

/**
 * The `/transactions` filter a clicked element stands for, or `undefined` when it stands for none —
 * which is what makes the diagram a query interface over the same data rather than a poster.
 *
 * `savings`, `carried-in`, `left-over` and `group` deliberately yield nothing: no single transaction
 * filter expresses "money that stayed put", and a group is several categories at once. They are
 * rendered non-interactive rather than clickable-but-inert.
 */
export const moneyFlowDrilldownParams = (
  target: MoneyFlowClickTarget,
  nodesById: ReadonlyMap<string, FlowNode>,
  range: { from: string; to: string },
): TransactionDrilldownParams | undefined => {
  if (target.kind === 'node') {
    const filter = nodeFilter(nodesById.get(target.id));
    return filter && { ...range, ...filter };
  }

  const source = nodesById.get(target.source);
  const destination = nodesById.get(target.target);

  // An income ribbon identifies both ends: this category, arriving in this account.
  if (source?.kind === 'income-source' && destination?.kind === 'account') {
    return {
      ...range,
      categoryId: source.categoryId ?? UNCATEGORISED_SENTINEL,
      accountId: destination.accountId,
    };
  }

  // Anything landing on a category — `account → category`, and `group → category` once
  // TICKET-EXP-03's level is on — filters by that category, plus the account when there is one.
  if (destination?.kind === 'category') {
    return {
      ...range,
      categoryId: destination.categoryId ?? UNCATEGORISED_SENTINEL,
      accountId: source?.kind === 'account' ? source.accountId : undefined,
    };
  }

  return undefined;
};

/**
 * Pure echarts-option builder, kept outside the component so the node/link mapping is testable
 * without a chart instance or `TestBed` — the `buildColumnChartOption`/`buildHeatmapChartOption`
 * precedent.
 *
 * ECharts keys a Sankey's nodes by `name`, so the *node id* is what goes in `name` and the display
 * label is produced by `label.formatter`. Passing the display name as `name` instead would silently
 * merge a category and an account that happen to share one, which is precisely what the aggregate
 * namespaces its ids to prevent.
 */
export const buildMoneyFlowChartOption = (
  graph: MoneyFlowGraph,
  palette: string[],
  syntheticColors: { carriedIn: string; leftOver: string },
  totals: MoneyFlowTotals,
  privacyMode: boolean,
): EChartsCoreOption => {
  const colorFor = (node: FlowNode): string => {
    if (node.kind === 'carried-in') return syntheticColors.carriedIn;
    if (node.kind === 'left-over') return syntheticColors.leftOver;
    return node.color;
  };

  /** A node's own total — inflow for anything with one, else its outflow (a level-0 source). */
  const totalFor = (id: string): number => totals.inflow.get(id) ?? totals.outflow.get(id) ?? 0;

  const nodeInteractive = (node: FlowNode): boolean => nodeFilter(node) !== undefined;
  const linkInteractive = (link: FlowLink): boolean =>
    moneyFlowDrilldownParams(
      { kind: 'link', source: link.source, target: link.target },
      totals.nodesById,
      { from: '', to: '' },
    ) !== undefined;

  return {
    ...resolveChartAnimation(),
    color: palette,
    tooltip: {
      trigger: 'item',
      formatter: (params: { dataType?: string; name?: string; data?: unknown }) => {
        const target = moneyFlowClickTarget(params as Parameters<typeof moneyFlowClickTarget>[0]);
        if (!target) return '';
        return target.kind === 'link'
          ? formatMoneyFlowLinkTooltip(
              { source: target.source, target: target.target, value: linkValue(graph, target) },
              totals,
              privacyMode,
            )
          : formatMoneyFlowNodeTooltip(target.id, totals, privacyMode);
      },
    },
    series: [
      {
        type: 'sankey',
        left: 8,
        right: 8,
        top: 8,
        bottom: 8,
        emphasis: { focus: 'adjacency' },
        nodeAlign: 'justify',
        data: graph.nodes.map((node) => ({
          name: node.id,
          depth: node.level,
          itemStyle: { color: colorFor(node) },
          // A node that leads nowhere shows no pointer, so "clickable" is legible before the click.
          cursor: nodeInteractive(node) ? 'pointer' : 'default',
        })),
        links: graph.links.map((link) => ({
          source: link.source,
          target: link.target,
          value: link.value,
          cursor: linkInteractive(link) ? 'pointer' : 'default',
        })),
        label: {
          formatter: (params: { name: string }) => {
            const node = totals.nodesById.get(params.name);
            if (!node) return params.name;
            // Privacy mode drops the amount suffix and keeps the name; the ribbons, which are
            // proportions rather than figures, stay at full fidelity.
            const total = totalFor(node.id);
            return privacyMode || total <= 0
              ? node.name
              : `${node.name} · ${formatCurrency(total)}`;
          },
        },
        lineStyle: { color: 'gradient', opacity: 0.45 },
      },
    ],
  };
};

/** The drawn value of a hovered edge — echarts' edge params carry source/target but not always a usable value. */
const linkValue = (graph: MoneyFlowGraph, target: { source: string; target: string }): number =>
  graph.links.find((link) => link.source === target.source && link.target === target.target)
    ?.value ?? 0;

/**
 * The Explore page's headline section (FR-EXP-2, TICKET-EXP-02/03/04): one diagram showing a
 * range's income arriving in the user's accounts and leaving again for categories, savings and what
 * stayed put — the shape of a period's money in a single picture, instead of four charts to
 * reconstruct it from.
 *
 * Every figure comes from `computeMoneyFlowGraph`, which routes each transaction through
 * `classifyForStats` and balances each account, so a ribbon's width here means the same thing a
 * Dashboard stat card means.
 *
 * Renders nothing when the range holds no flow at all — the page's own empty state (TICKET-EXP-01)
 * covers the no-data-anywhere case, and an empty Sankey frame says less than no frame.
 */
@Component({
  selector: 'app-money-flow-panel',
  imports: [
    NgxEchartsDirective,
    RouterLink,
    FlexComponent,
    LabelComponent,
    PaperComponent,
    TypographyComponent,
  ],
  templateUrl: './money-flow-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoneyFlowPanelComponent {
  private readonly transactionsStore = inject(TransactionsStore);
  private readonly categoriesStore = inject(CategoriesStore);
  private readonly accountsStore = inject(AccountsStore);
  private readonly rangeStore = inject(RangeStore);
  private readonly appSettingsStore = inject(AppSettingsStore);
  private readonly router = inject(Router);

  protected readonly privacyMode = this.appSettingsStore.privacyModeEnabled;

  private readonly ownSavingsIbans = computed(() =>
    savingsAccountIbans(this.accountsStore.accounts()),
  );

  /**
   * Whether spending routes through `Category.group` on its way to individual categories
   * (TICKET-EXP-03), held for the session by `ChartOptionsStore`. Seeded on — someone who has
   * bothered to sort their categories into groups wants to see them — and the toggle that changes
   * it is hidden entirely when no category in range has one.
   */
  private readonly groupControl = chartGroupCategories('explore-money-flow', () => true);
  protected readonly groupCategories = this.groupControl.value;
  protected readonly setGroupCategories = this.groupControl.set;

  private readonly range = computed(() => ({
    from: this.rangeStore.from('explore'),
    to: this.rangeStore.to('explore'),
  }));

  protected readonly graph = computed(() =>
    computeMoneyFlowGraph(
      this.transactionsStore.transactions(),
      this.categoriesStore.categoriesById(),
      this.accountsStore.accountsById(),
      this.range().from,
      this.range().to,
      this.ownSavingsIbans(),
      this.groupCategories(),
    ),
  );

  private readonly totals = computed(() => summariseMoneyFlow(this.graph()));

  protected readonly hasFlow = computed(() => this.graph().links.length > 0);

  /**
   * The toggle only appears once at least one category in range actually carries a group: a control
   * that can only ever do nothing is worse than no control, because it reads as a broken one.
   */
  protected readonly canGroup = computed(() => this.graph().groupableCategoryCount > 0);

  protected readonly chartOption = computed<EChartsCoreOption>(() => {
    const palette = resolveChartCategoricalColors();
    return buildMoneyFlowChartOption(
      this.graph(),
      palette,
      {
        carriedIn: palette[CARRIED_IN_COLOR_SLOT] ?? palette[0],
        leftOver: palette[LEFT_OVER_COLOR_SLOT] ?? palette[0],
      },
      this.totals(),
      this.privacyMode(),
    );
  });

  /**
   * Stated only when the netting pass actually dropped something, so the diagram never quietly
   * shows less than the range contains — a category fully refunded inside the range has no honest
   * ribbon, but its absence deserves a sentence.
   */
  protected readonly nettedOutNote = computed<string | null>(() => {
    const count = this.graph().nettedOutLinkCount;
    if (count === 0) return null;
    return count === 1
      ? '1 flow is not shown: it was fully refunded or withdrawn again within this range.'
      : `${count} flows are not shown: they were fully refunded or withdrawn again within this range.`;
  });

  protected readonly chartAriaLabel = computed(
    () =>
      `Money flow from income sources through accounts to categories and savings, ${this.range().from}–${this.range().to}; table with values follows`,
  );

  /**
   * Every link's figures as DOM text for assistive tech (TICKET-STAT-20), off the same signal the
   * chart renders so the two can't diverge, and each row carrying the same drill-down link its
   * ribbon does — the interaction isn't mouse-only.
   */
  protected readonly accessibleRows = computed<MoneyFlowAccessibleRow[]>(() => {
    const totals = this.totals();
    const range = this.range();
    const privacyMode = this.privacyMode();

    return this.graph().links.map((link) => {
      const params = moneyFlowDrilldownParams(
        { kind: 'link', source: link.source, target: link.target },
        totals.nodesById,
        range,
      );
      return {
        source: nameOf(totals, link.source),
        target: nameOf(totals, link.target),
        // Withheld, not blurred: `.sr-only` clips the table to a 1px box, so a CSS filter paints
        // nothing and a screen reader would read the amount out regardless (TICKET-PRIV-01).
        amount: privacyMode ? null : formatCurrency(link.value),
        queryParams: params ? buildTransactionDrilldownParams(params) : null,
      };
    });
  });

  protected readonly hiddenAmountLabel = HIDDEN_AMOUNT;

  protected onChartClick(event: ECElementEvent): void {
    const target = moneyFlowClickTarget(event);
    if (!target) return;

    const params = moneyFlowDrilldownParams(target, this.totals().nodesById, this.range());
    if (!params) return;

    void this.router.navigate(['/transactions'], {
      queryParams: buildTransactionDrilldownParams(params),
    });
  }
}
