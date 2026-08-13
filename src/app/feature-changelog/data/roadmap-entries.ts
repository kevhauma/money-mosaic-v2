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
    versionFolder: 'v2.2_goals_and_forecast',
    ticketId: 'TICKET-FUT-07',
    title: 'Watch your projected net worth rise and dip as each goal gets bought',
    area: 'Forecast',
  },
  {
    versionFolder: 'v2.2_goals_and_forecast',
    ticketId: 'TICKET-FUT-09',
    title:
      'Switch the forecast around: pick the date you need something by and see what it takes to save for it each month',
    area: 'Forecast',
  },
  {
    versionFolder: 'v2.2_goals_and_forecast',
    ticketId: 'TICKET-FUT-08',
    title:
      'Point the forecast at just the accounts you would actually spend from, and leave the rest out',
    area: 'Forecast',
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
