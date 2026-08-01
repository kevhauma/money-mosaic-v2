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
    versionFolder: 'Import',
    ticketId: 'topic-import-multi-account',
    title: 'Multi account csv import',
    area: 'Import',
  },
  {
    versionFolder: 'Import',
    ticketId: 'topic-import-fees',
    title: 'Ability to add transaction fees to import',
    area: 'Import',
  },
  {
    versionFolder: 'Transactions',
    ticketId: 'topic-transactions-fees',
    title: 'Figuring out how to handle transaction fees in the transactions list and statistics',
    area: 'Transactions',
  },
  {
    versionFolder: 'Settings',
    ticketId: 'TICKET-PRIV-01',
    title: 'Privacy mode: blur Dashboard amounts with one click',
    area: 'Privacy Mode',
  },
  {
    versionFolder: 'v2',
    ticketId: 'TICKET-STAT-22',
    title: 'Empty dashboard view that points you to Import when you have no transactions yet',
    area: 'Dashboard',
  },
  {
    versionFolder: 'v1.6_income_growth',
    ticketId: 'TICKET-INC-15',
    title:
      'Compare your last complete month against the start of the year, on cards that link to their transactions',
    area: 'Income',
  },
  {
    versionFolder: 'v1.6_income_growth',
    ticketId: 'TICKET-INC-17',
    title: 'An Events sidebar listing raises, bonuses and stopped income streams by year',
    area: 'Income',
  },
  {
    versionFolder: 'v1.6_income_growth',
    ticketId: 'TICKET-INC-18',
    title:
      'Income settings and Salary details as their own pages, with room to explain each control',
    area: 'Income',
  },
  {
    versionFolder: 'v1.6_income_growth',
    ticketId: 'TICKET-PUB-07',
    title: 'A getting-started guide for the Income page, written for your first visit',
    area: 'Help',
  },
  {
    versionFolder: 'v1.6_income_growth',
    ticketId: 'TICKET-PUB-08',
    title:
      'Your first visit to the Income page: what it does, a quick setup, and a walk to the settings',
    area: 'Help',
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
