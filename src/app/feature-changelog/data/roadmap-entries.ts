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
    versionFolder: 'v1.7_loan_tracker',
    ticketId: 'topic-loan-tracker',
    title:
      'A Loan tracker: payoff progress, amortization schedule, and ahead/behind-schedule tracking for any loan type',
    area: 'Loans',
    isTopic: true,
  },
  // The date-range-picker idea has been ticketed as docs/v1.8_extended_date_range_picker; its
  // topic-level entry is replaced by the seven per-ticket entries below, in build order.
  {
    versionFolder: 'v1.8_extended_date_range_picker',
    ticketId: 'TICKET-STAT-35',
    title: 'Say "the last 30 days" once and have it still mean that next month',
    area: 'Date range picker',
  },
  {
    versionFolder: 'v1.8_extended_date_range_picker',
    ticketId: 'TICKET-STAT-36',
    title: 'A bookmarked rolling window stays rolling instead of freezing into fixed dates',
    area: 'Date range picker',
  },
  {
    versionFolder: 'v1.8_extended_date_range_picker',
    ticketId: 'TICKET-SET-09',
    title: 'Tell the app which month your financial year starts in',
    area: 'Settings',
  },
  {
    versionFolder: 'v1.8_extended_date_range_picker',
    ticketId: 'TICKET-STAT-38',
    title: 'One control showing your current range, opening onto every range you might want',
    area: 'Date range picker',
  },
  {
    versionFolder: 'v1.8_extended_date_range_picker',
    ticketId: 'TICKET-STAT-39',
    title: 'Type an exact window into the date fields and apply it in one go',
    area: 'Date range picker',
  },
  {
    versionFolder: 'v1.8_extended_date_range_picker',
    ticketId: 'TICKET-STAT-40',
    title: 'The ranges you picked recently, one click away instead of retyped',
    area: 'Date range picker',
  },
  {
    versionFolder: 'v1.8_extended_date_range_picker',
    ticketId: 'TICKET-STAT-41',
    title: 'Jump the Transactions date filter by year instead of clicking "previous" a dozen times',
    area: 'Date range picker',
  },
  {
    versionFolder: 'v9999_ideas',
    ticketId: 'topic-food-vouchers',
    title: 'Food voucher support as a special income/expense category',
    area: 'Ideas',
    isTopic: true,
  },
  // The "heatmaps + Sankey + 3D" half of the extra-graphs idea has been ticketed as
  // docs/v2.1_extra_graphs. Its heatmap tickets and the spending mosaic have since shipped (see
  // CHANGELOG_ENTRIES) and are no longer listed here; the two below are still open.
  {
    versionFolder: 'v2.1_extra_graphs',
    ticketId: 'TICKET-STAT-31',
    title:
      'The spending heatmap only offers the time views your selected date range is long enough for',
    area: 'Dashboard',
  },
  {
    versionFolder: 'v2.1_extra_graphs',
    ticketId: 'TICKET-STAT-32',
    title:
      'Leave categories out of the spending heatmap, so one big fixed cost stops washing it out',
    area: 'Dashboard',
  },
  {
    versionFolder: 'v9999_ideas',
    ticketId: 'topic-chart-builder',
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
