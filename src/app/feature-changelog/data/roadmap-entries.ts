export type RoadmapEntry = {
  readonly versionFolder: string;
  readonly ticketId: string;
  readonly title: string;
  readonly area: string;
  /**
   * True for a topic-level entry summarizing a whole not-yet-ticketed (or not-yet-broken-down)
   * version/idea, rather than one specific open ticket — `ticketId` then holds a short `topic-*`
   * slug instead of a real `TICKET-*` id. Not matched/removed by `work-ticket`'s Step 6.5 (there's
   * no single ticket shipping it); replace manually with granular per-ticket entries once that
   * version actually gets ticketed via `story-ticket`.
   */
  readonly isTopic?: boolean;
};

/**
 * Hand-maintained (TICKET-PUB-05) — an entry is added by the `story-ticket` skill when a ticket is
 * created, and removed by the `work-ticket` skill once that ticket ships (its changelog entry
 * replaces it). No `date`/`status` field — these haven't shipped yet, so there's nothing to sort by
 * beyond each version's own build order. See `.claude/skills/roadmap-entry/SKILL.md` for the
 * entry convention.
 */
export const ROADMAP_ENTRIES: readonly RoadmapEntry[] = [
  {
    versionFolder: 'v1.6.2_interface_polish',
    ticketId: 'TICKET-ACC-11',
    title:
      'Hovering a day on a balance chart shows what moved that day, on both the Accounts page and an account’s own page',
    area: 'Accounts',
  },
  {
    versionFolder: 'v1.6.2_interface_polish',
    ticketId: 'TICKET-ACC-09',
    title: 'Account cards stack in one column, in the same order as the chart’s bands',
    area: 'Accounts',
  },
  {
    versionFolder: 'v1.6.2_interface_polish',
    ticketId: 'TICKET-TXN-10',
    title: 'Picking Income or Expenses filters the list straight away, and “All” turns it back off',
    area: 'Transactions',
  },
  {
    versionFolder: 'v1.6.2_interface_polish',
    ticketId: 'TICKET-INC-22',
    title:
      'The Income page fits its charts side by side instead of scrolling for pages, and the events list stays put while you scroll',
    area: 'Income',
  },
  {
    versionFolder: 'v1.7_loan_tracker',
    ticketId: 'topic-loan-tracker',
    title:
      'A Loan tracker: payoff progress, amortization schedule, and ahead/behind-schedule tracking for any loan type',
    area: 'Loans',
    isTopic: true,
  },
  {
    versionFolder: 'v1.8_extended_date_range_picker',
    ticketId: 'topic-date-range-picker',
    title:
      'A more powerful date range picker with quick ranges, relative expressions, and recent history',
    area: 'Date range picker',
    isTopic: true,
  },
  {
    versionFolder: 'v9999_ideas',
    ticketId: 'topic-food-vouchers',
    title: 'Food voucher support as a special income/expense category',
    area: 'Ideas',
    isTopic: true,
  },
  {
    versionFolder: 'v9999_ideas',
    ticketId: 'topic-extra-graphs',
    title: 'More chart types: heatmaps, Sankey flow diagrams, and richer visualizations',
    area: 'Ideas',
    isTopic: true,
  },
  {
    versionFolder: 'v9999_ideas',
    ticketId: 'topic-extra-graphs',
    title: 'Chart builder: create your own custom visualizations from your data',
    area: 'Ideas',
    isTopic: true,
  },
  {
    versionFolder: 'v9999_ideas',
    ticketId: 'topic-multi-device',
    title: 'Sync between multiple devices (desktop, mobile, tablet) via E2E, P2P, QR code',
    area: 'Ideas',
    isTopic: true,
  },
  {
    versionFolder: 'v9999_ideas',
    ticketId: 'topic-assets',
    title:
      'Assets: add houses, cars, and other assets to track net worth and depreciation over time',
    area: 'Ideas',
    isTopic: true,
  },
];
