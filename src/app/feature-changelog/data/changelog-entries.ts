export type ChangelogEntry = {
  readonly date: string;
  readonly versionFolder: string;
  readonly ticketIds: readonly string[];
  readonly title: string;
  readonly area: string;
};

/**
 * Append-only, hand-maintained (TICKET-CHG-01) — a new entry is added by the `work-ticket` skill's
 * changelog step once a ticket ships. `ticketIds` holds more than one ID for a batched entry (e.g.
 * the historical backfill below, grouped by version rather than one row per ticket) — see
 * `.claude/skills/changelog-entry/SKILL.md` for the entry convention. Dates on the backfilled
 * entries below are reconstructed from git history (last activity on that version's tickets), not
 * exact ship dates — precise enough for a changelog, not a source of truth for anything else.
 */
export const CHANGELOG_ENTRIES: readonly ChangelogEntry[] = [
  {
    date: '2026-07-10',
    versionFolder: 'v1.0_foundation',
    ticketIds: [
      'TICKET-DEV-01',
      'TICKET-ACC-01',
      'TICKET-IMP-02',
      'TICKET-IMP-03',
      'TICKET-IMP-04',
      'TICKET-TXN-01',
      'TICKET-TXN-02',
      'TICKET-CAT-01',
      'TICKET-TRF-01',
      'TICKET-TRF-02',
      'TICKET-STAT-02',
      'TICKET-STAT-03',
    ],
    title:
      'Launched the foundation: bank CSV import, categorisation rules, transfer matching, and dashboard stats',
    area: 'Foundation',
  },
  {
    date: '2026-07-15',
    versionFolder: 'v1.1_joint_accounts',
    ticketIds: [
      'TICKET-ACC-02',
      'TICKET-ACC-03',
      'TICKET-CAT-02',
      'TICKET-STAT-03',
      'TICKET-TXN-03',
      'TICKET-TXN-04',
      'TICKET-TRF-04',
      'TICKET-IMP-05',
      'TICKET-TXN-05',
      'TICKET-TXN-06',
      'TICKET-ACC-04',
      'TICKET-CAT-03',
      'TICKET-STAT-10',
    ],
    title:
      "Added joint/shared account tracking (contribution-based ownership, co-owner attribution), plus quality-of-life fixes: inline categorisation, account/category reordering, and viewing a transaction's original CSV line",
    area: 'Joint accounts',
  },
  {
    date: '2026-07-20',
    versionFolder: 'v1.2_auto_categorise',
    ticketIds: [
      'TICKET-ML-01',
      'TICKET-ML-02',
      'TICKET-ML-03',
      'TICKET-ML-04',
      'TICKET-ML-05',
      'TICKET-PERF-01',
      'TICKET-ML-06',
      'TICKET-ML-07',
      'TICKET-ML-08',
      'TICKET-ML-09',
      'TICKET-ML-10',
      'TICKET-ML-11',
      'TICKET-ML-12',
      'TICKET-ML-15',
      'TICKET-ML-13',
      'TICKET-ML-14',
      'TICKET-ML-17',
    ],
    title:
      'Added an on-device auto-categoriser that learns from your history and suggests categories, plus mined rule proposals, on a new Learning page',
    area: 'Auto-categorisation',
  },
  {
    date: '2026-07-21',
    versionFolder: 'v1.3_dashboard_insights',
    ticketIds: [
      'TICKET-STAT-09',
      'TICKET-STAT-05',
      'TICKET-STAT-06',
      'TICKET-STAT-08',
      'TICKET-STAT-07',
      'TICKET-STAT-04',
      'TICKET-STAT-11',
      'TICKET-CAT-04',
      'TICKET-STAT-12',
      'TICKET-STAT-13',
      'TICKET-STAT-14',
      'TICKET-STAT-15',
      'TICKET-STAT-16',
      'TICKET-STAT-17',
      'TICKET-STAT-19',
      'TICKET-STAT-21',
    ],
    title:
      'Added deeper dashboard insights: category period comparisons, spending rate, weekday/weekend split, year-over-year trends, and a customizable drag-and-drop dashboard layout',
    area: 'Dashboard insights',
  },
  {
    date: '2026-07-17',
    versionFolder: 'v1.4_data_management',
    ticketIds: ['TICKET-DAT-01', 'TICKET-DAT-02', 'TICKET-DAT-03'],
    title:
      'Added full local data export/import (JSON backup & restore), a persistent-storage request, and delete-all-data',
    area: 'Data management',
  },
  {
    date: '2026-07-18',
    versionFolder: 'v1.5_redesign',
    ticketIds: [
      'TICKET-UI-01',
      'TICKET-UI-02',
      'TICKET-UI-03',
      'TICKET-UI-04',
      'TICKET-UI-05',
      'TICKET-UI-06',
      'TICKET-UI-07',
      'TICKET-UI-08',
      'TICKET-UI-09',
      'TICKET-UI-10',
      'TICKET-UI-15',
      'TICKET-UI-11',
      'TICKET-UI-12',
      'TICKET-UI-13',
      'TICKET-UI-14',
    ],
    title:
      "Redesigned the app's visual identity: a Bento-grid dashboard layout, new type scale and color tokens, and a full set of shared UI primitives",
    area: 'Redesign',
  },
  {
    date: '2026-07-21',
    versionFolder: 'v1.9_deformable_ui_redesign',
    ticketIds: [
      'TICKET-UI-16',
      'TICKET-UI-17',
      'TICKET-UI-18',
      'TICKET-UI-19',
      'TICKET-UI-20',
      'TICKET-UI-21',
    ],
    title:
      'Refined the theme picker based on user feedback: a single selector with live full-tile previews, per-theme brand marks, and no more intense hover-zoom',
    area: 'Theme picker',
  },
  {
    date: '2026-07-21',
    versionFolder: 'v2',
    ticketIds: ['TICKET-PUB-01', 'TICKET-PUB-06', 'TICKET-PUB-02', 'TICKET-PUB-03'],
    title: 'Added a public landing page (with a GitHub link) and in-app How-to guides & FAQ',
    area: 'Public pages',
  },
  {
    date: '2026-07-22',
    versionFolder: 'v2',
    ticketIds: ['TICKET-CHG-01'],
    title: "Added a Changelog page showing what's shipped, kept current via the ticket workflow",
    area: 'Changelog',
  },
  {
    date: '2026-07-22',
    versionFolder: 'v2',
    ticketIds: ['TICKET-PUB-05'],
    title: "Added a Roadmap tab to the Changelog page, showing what's planned next",
    area: 'Changelog',
  },
  {
    date: '2026-07-23',
    versionFolder: 'v1.5_redesign',
    ticketIds: ['TICKET-TXN-08'],
    title:
      'Added an Expense/Income switch to the transaction amount filter, so you can type a plain positive amount instead of remembering to enter it as negative',
    area: 'Transactions',
  },
  {
    date: '2026-07-23',
    versionFolder: 'v1.5_redesign',
    ticketIds: ['TICKET-CAT-07'],
    title:
      'Added a "Make rule from filter" button so a filtered transaction view can be turned straight into a categorisation rule',
    area: 'Categories',
  },
];
