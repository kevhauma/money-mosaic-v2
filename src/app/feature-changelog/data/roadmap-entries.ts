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
    versionFolder: 'Experience',
    ticketId: 'TICKET-IMP-07',
    title: 'Improve import flow, better UX',
    area: 'Import',
  },
  {
    versionFolder: 'Experience',
    ticketId: 'topic-import-flow',
    title: 'Improve import flow: Multi account csv,...',
    area: 'Import',
  },
  {
    versionFolder: 'Experience',
    ticketId: 'TICKET-IMP-08',
    title:
      'A "+ New account" quick action on the import screen — nudges you to create one right away if you have none yet',
    area: 'Import',
  },
  {
    versionFolder: 'Settings',
    ticketId: 'TICKET-SET-05',
    title: 'Foundation for app settings (accent color, currency, locale, privacy mode)',
    area: 'App Settings',
  },
  {
    versionFolder: 'Settings',
    ticketId: 'TICKET-SET-02',
    title: 'Pick your own accent color for the app',
    area: 'App Settings',
  },
  {
    versionFolder: 'Settings',
    ticketId: 'TICKET-SET-03',
    title: 'Choose your currency so amounts display correctly instead of defaulting to EUR',
    area: 'App Settings',
  },
  {
    versionFolder: 'Settings',
    ticketId: 'TICKET-SET-04',
    title: 'Choose your locale so numbers and dates format the way you expect',
    area: 'App Settings',
  },
  {
    versionFolder: 'Settings',
    ticketId: 'TICKET-PRIV-01',
    title: 'Privacy mode: blur Dashboard amounts with one click',
    area: 'Privacy Mode',
  },
  {
    versionFolder: 'v1.6_income_growth',
    ticketId: 'topic-income-growth',
    title:
      'A dedicated Income page: trends by source, growth rate, and gross-vs-net tracking over time',
    area: 'Income',
    isTopic: true,
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
    title: 'Sync between multiple devices (desktop, mobile, tablet) via E2E, P2P',
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
