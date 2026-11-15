export type RoadmapEntry = {
  readonly ticketId: string;
  readonly title: string;
  readonly area: string;
  /**
   * True for a topic-level entry summarizing a whole not-yet-ticketed (or not-yet-broken-down)
   * area/idea, rather than one specific open ticket — `ticketId` then holds a short `topic-*`
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
 * beyond the order they were added in. See `.claude/skills/roadmap-entry/SKILL.md` for the
 * entry convention.
 */
export const ROADMAP_ENTRIES: readonly RoadmapEntry[] = [
  {
    ticketId: 'topic-food-vouchers',
    title: 'Food voucher support as a special income/expense category',
    area: 'Ideas',
    isTopic: true,
  },
  // The "heatmaps + Sankey + 3D" half of the extra-graphs idea has been ticketed as
  // docs/releases/v2.1_extra_graphs. Its heatmap tickets and the spending mosaic have since shipped (see
  // CHANGELOG_ENTRIES) and are no longer listed here; the two below are still open.
  {
    ticketId: 'TICKET-STAT-31',
    title:
      'The spending heatmap only offers the time views your selected date range is long enough for',
    area: 'Dashboard',
  },
  {
    ticketId: 'TICKET-STAT-32',
    title:
      'Leave categories out of the spending heatmap, so one big fixed cost stops washing it out',
    area: 'Dashboard',
  },
  {
    ticketId: 'TICKET-MCP-05',
    title: 'Create and revoke your own agent (MCP) access tokens from Settings',
    area: 'MCP',
  },
  // Code review 6 (docs/releases/v3_code_review_2). SRV and AUTH tickets get no entries, per
  // docs/server/overview.md and docs/auth/overview.md.
  {
    ticketId: 'TICKET-IMP-20',
    title: 'The import screen keeps working when reading a file or checking for duplicates fails',
    area: 'Import',
  },
  {
    ticketId: 'TICKET-IMP-21',
    title: 'An import that saved your rows is never reported as failed',
    area: 'Import',
  },
  {
    ticketId: 'TICKET-IMP-22',
    title: 'Bank files with multi-line notes import correctly',
    area: 'Import',
  },
  {
    ticketId: 'TICKET-IMP-23',
    title: 'Banks that write "0,00" in the unused debit or credit column import correctly',
    area: 'Import',
  },
  {
    ticketId: 'TICKET-IMP-24',
    title: 'Overlapping imports recognise duplicates however the IBAN is spaced',
    area: 'Import',
  },
  {
    ticketId: 'TICKET-IMP-25',
    title: "A file in a multi-file import that can't be read says so",
    area: 'Import',
  },
  {
    ticketId: 'TICKET-IMP-26',
    title: 'Going back during a multi-file import never imports a file twice',
    area: 'Import',
  },
  {
    ticketId: 'TICKET-TXN-13',
    title: 'A rule made from a filter matches the rows the filter shows',
    area: 'Transactions',
  },
  {
    ticketId: 'TICKET-TXN-14',
    title: 'Bulk actions only affect the rows you can see selected',
    area: 'Transactions',
  },
  {
    ticketId: 'TICKET-TXN-15',
    title: 'Transactions keep showing a category you archived',
    area: 'Transactions',
  },
  {
    ticketId: 'TICKET-TRF-07',
    title: 'Imports never undo a transfer you unlinked or a category you set by hand',
    area: 'Transfers',
  },
  {
    ticketId: 'TICKET-TRF-08',
    title: 'The transfer settings form shows your saved settings',
    area: 'Transfers',
  },
  {
    ticketId: 'TICKET-CAT-13',
    title: '"Always categorise this merchant" wins over your older, broader rules',
    area: 'Categories',
  },
  {
    ticketId: 'TICKET-CAT-14',
    title: 'Rules on an IBAN match however the bank spaced it',
    area: 'Categories',
  },
  {
    ticketId: 'TICKET-CAT-15',
    title: "Running rules keeps your partner's deposits tagged as Partner contribution",
    area: 'Categories',
  },
  {
    ticketId: 'TICKET-NG-18',
    title: 'Reorder arrows move the item past the one you can see, not a hidden archived one',
    area: 'Categories',
  },
  {
    ticketId: 'TICKET-ML-19',
    title: 'Rule suggestions only appear when the model agrees about a merchant',
    area: 'Auto-categorisation',
  },
  {
    ticketId: 'TICKET-REC-12',
    title: 'Merging recurring payments in two steps keeps every payment',
    area: 'Recurring',
  },
  {
    ticketId: 'TICKET-REC-13',
    title: 'The next expected payment lands on your usual day of the month',
    area: 'Recurring',
  },
  {
    ticketId: 'TICKET-REC-14',
    title: "Ending a subscription's category no longer adds a phantom final payment",
    area: 'Recurring',
  },
  {
    ticketId: 'TICKET-REC-15',
    title: 'Double-clicking Dismiss or Merge counts once',
    area: 'Recurring',
  },
  {
    ticketId: 'TICKET-LOAN-16',
    title: "Only real repayments count toward your loan's progress",
    area: 'Loans',
  },
  {
    ticketId: 'TICKET-LOAN-17',
    title: 'Lump-sum what-ifs land exactly once, even near month-end',
    area: 'Loans',
  },
  {
    ticketId: 'TICKET-LOAN-18',
    title: 'The Loans page stops saying loan tracking is "on its way"',
    area: 'Loans',
  },
  {
    ticketId: 'TICKET-LOAN-19',
    title: 'The Loans pages wait for your data instead of showing "no loans"',
    area: 'Loans',
  },
  {
    ticketId: 'TICKET-SOLID-10',
    title: 'Monthly dates step the same way everywhere, ending on the last day of short months',
    area: 'Loans',
  },
  {
    ticketId: 'TICKET-FUT-10',
    title: 'The "what do I need to save" chart reaches every goal',
    area: 'Goals & forecast',
  },
  {
    ticketId: 'TICKET-FUT-11',
    title: 'Both forecast views agree on whether a goal is on track',
    area: 'Goals & forecast',
  },
  {
    ticketId: 'TICKET-FUT-12',
    title: 'The Future page waits for your data before you change anything',
    area: 'Goals & forecast',
  },
  {
    ticketId: 'TICKET-STAT-48',
    title: 'Year-over-year comparisons only appear once last year is fully covered by your data',
    area: 'Dashboard',
  },
  {
    ticketId: 'TICKET-STAT-51',
    title: 'A refund on a shared purchase lowers your spending instead of counting as income',
    area: 'Dashboard',
  },
  {
    ticketId: 'TICKET-STAT-54',
    title: 'Cancelled (nullified) payments no longer appear among your biggest transactions',
    area: 'Dashboard',
  },
  {
    ticketId: 'TICKET-NG-11',
    title: 'The dashboard waits for your saved layout before letting you change it',
    area: 'Dashboard',
  },
  {
    ticketId: 'TICKET-SOLID-12',
    title: 'Percentage changes are calculated the same way on every chart',
    area: 'Dashboard',
  },
  {
    ticketId: 'TICKET-STAT-50',
    title: 'The money-flow diagram draws each linked transfer once, without a fake income source',
    area: 'Explore',
  },
  {
    ticketId: 'TICKET-STAT-49',
    title: 'Stepping back and forth through fiscal years keeps your fiscal start month',
    area: 'Date ranges',
  },
  {
    ticketId: 'TICKET-STAT-53',
    title: '"All time" always covers all your data up to today, and resets when you sign out',
    area: 'Date ranges',
  },
  {
    ticketId: 'TICKET-SOLID-08',
    title: '"Today" follows your local date, so just after midnight the new month shows',
    area: 'Date ranges',
  },
  {
    ticketId: 'TICKET-STAT-52',
    title: "Screen readers read the trend chart's date range correctly",
    area: 'Accessibility',
  },
  {
    ticketId: 'TICKET-NG-17',
    title: 'Reorder arrows always move the item, even after deleting or adding one',
    area: 'Accounts',
  },
  {
    ticketId: 'TICKET-NG-19',
    title: 'Deleting an account always removes its transactions and transfers from view too',
    area: 'Accounts',
  },
  {
    ticketId: 'TICKET-NG-20',
    title: 'Reordering accounts or categories saves completely or not at all',
    area: 'Accounts',
  },
  {
    ticketId: 'TICKET-NG-12',
    title: 'Settings fields keep every character you type, even on a slow connection',
    area: 'Settings',
  },
  {
    ticketId: 'TICKET-NG-22',
    title: 'Ticking several checkboxes quickly saves every tick',
    area: 'Settings',
  },
  {
    ticketId: 'TICKET-NG-13',
    title: 'A failed save tells you so and keeps your form open',
    area: 'Interface',
  },
  {
    ticketId: 'TICKET-NG-14',
    title: "Signing out and in as someone else never mixes in the previous person's data",
    area: 'Interface',
  },
  {
    ticketId: 'TICKET-NG-15',
    title: 'Ordinary server errors stop being logged as app bugs',
    area: 'Interface',
  },
  {
    ticketId: 'TICKET-NG-16',
    title: 'An amount that adds up to zero shows as €0,00, never a red "-€0,00"',
    area: 'Interface',
  },
  {
    ticketId: 'TICKET-NG-21',
    title: 'Behind the scenes: "nothing saved yet" answers are recognised reliably',
    area: 'Interface',
  },
  {
    ticketId: 'TICKET-SOLID-11',
    title: 'Behind the scenes: one set of date helpers instead of many copies',
    area: 'Interface',
  },
  {
    ticketId: 'TICKET-DAT-06',
    title: 'The "Where your data lives" card says your theme and preferences follow your account',
    area: 'Data management',
  },
  {
    ticketId: 'TICKET-MCP-06',
    title: 'Copy token and Copy command work when you open the app by its home-network address',
    area: 'MCP',
  },
  {
    ticketId: 'TICKET-SOLID-09',
    title: 'Your agent sees the same account balances as the Accounts page',
    area: 'MCP',
  },
  {
    ticketId: 'topic-chart-builder',
    title: 'Chart builder: create your own custom visualizations from your data',
    area: 'Ideas',
    isTopic: true,
  },
  {
    ticketId: 'topic-multi-device',
    title: 'Two-way sync between multiple devices (desktop, mobile, tablet) via E2E, P2P',
    area: 'Ideas',
    isTopic: true,
  },
  {
    ticketId: 'topic-assets',
    title:
      'Assets: add houses, cars, and other assets to track net worth and depreciation over time',
    area: 'Ideas',
    isTopic: true,
  },
];
