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
  {
    date: '2026-07-23',
    versionFolder: 'v1.5_redesign',
    ticketIds: ['TICKET-IMP-07'],
    title:
      'Redesigned the CSV import mapper into a guided, field-by-field flow with live sample values, required-field errors, and duplicate-column warnings',
    area: 'Import',
  },
  {
    date: '2026-07-24',
    versionFolder: 'v1.1_joint_accounts',
    ticketIds: ['TICKET-IMP-08'],
    title:
      'Added a "+ New account" quick action to the CSV import screen, so a brand-new bank or account no longer needs to be set up before importing — including seeding its opening balance from the file\'s own running balance column when it has one',
    area: 'Import',
  },
  {
    date: '2026-07-24',
    versionFolder: 'v1.5_redesign',
    ticketIds: ['TICKET-IMP-09'],
    title:
      'The CSV import mapper now walks through the fields, and a final summary as a short horizontal wizard, with the raw file preview and row preview shown side by side, instead of one long scrolling form',
    area: 'Import',
  },
  {
    date: '2026-07-26',
    versionFolder: 'v2_settings',
    ticketIds: ['TICKET-SET-05', 'TICKET-SET-02'],
    title: 'Accent color picker for default themes',
    area: 'Settings',
  },
  {
    date: '2026-07-26',
    versionFolder: 'v1.5_bugs',
    ticketIds: [],
    title: 'Popover menus now have a background. no longer transparent',
    area: 'Bugfix',
  },
  {
    date: '2026-07-26',
    versionFolder: 'v2',
    ticketIds: ['TICKET-SET-03'],
    title:
      'Added a currency display setting — pick a symbol (€, $, £, ¥, ₹, or your own) and whether it shows before or after the number, everywhere amounts appear',
    area: 'Settings',
  },
  {
    date: '2026-07-26',
    versionFolder: 'v2',
    ticketIds: ['TICKET-SET-04'],
    title:
      "Added a locale setting, so number grouping/decimal separators and dates throughout the app are formatted the way you're used to reading them, not hardcoded to one convention",
    area: 'Settings',
  },
  {
    date: '2026-07-28',
    versionFolder: 'v2_code_review',
    ticketIds: ['TICKET-IMP-10'],
    title: "Tidied up the CSV import mapping screen's internals for easier future maintenance",
    area: 'Import',
  },
  {
    date: '2026-07-28',
    versionFolder: 'v2_code_review',
    ticketIds: ['TICKET-TEST-03'],
    title:
      "Added a safety-net test suite pinning the import wizard's commit behavior ahead of upcoming internal changes",
    area: 'Import',
  },
  {
    date: '2026-07-28',
    versionFolder: 'v2_code_review',
    ticketIds: ['TICKET-IMP-11'],
    title:
      "Simplified the CSV import wizard's internals into a single, more reliable session — no behavior change, but the Confirm button and mapping screen logic are now more consistent under the hood",
    area: 'Import',
  },
  {
    date: '2026-07-28',
    versionFolder: 'v2_code_review',
    ticketIds: ['TICKET-IMP-12'],
    title:
      "Tidied up the batch-import waiting screen's internals for easier future maintenance — no visible change",
    area: 'Import',
  },
  {
    date: '2026-07-28',
    versionFolder: 'v2_code_review',
    ticketIds: ['TICKET-NG-10'],
    title:
      'Fixed a bug where dashboard percentages, ratios, and month names always showed Belgian-style formatting regardless of your locale setting',
    area: 'Dashboard insights',
  },
  {
    date: '2026-07-28',
    versionFolder: 'v2_code_review',
    ticketIds: ['TICKET-STAT-23'],
    title:
      "Tidied up the category-comparison dashboard panel's internals for easier future maintenance — no visible change",
    area: 'Dashboard insights',
  },
  {
    date: '2026-07-28',
    versionFolder: 'v2_code_review',
    ticketIds: ['TICKET-ACC-05'],
    title:
      "Tidied up the Accounts page's internals for easier future maintenance — no visible change",
    area: 'Accounts',
  },
  {
    date: '2026-07-29',
    versionFolder: 'v2_code_review',
    ticketIds: ['TICKET-ACC-06'],
    title:
      'The account detail page and the accounts list now share one balance display, so they stay in sync — no visible change',
    area: 'Accounts',
  },
  {
    date: '2026-07-29',
    versionFolder: 'v2_code_review',
    ticketIds: ['TICKET-TXN-09'],
    title:
      "Tidied up the transactions table's internals for easier future maintenance — no visible change",
    area: 'Transactions',
  },
  {
    date: '2026-07-29',
    versionFolder: 'v2_code_review',
    ticketIds: ['TICKET-CAT-08'],
    title:
      "Tidied up the rule editor's condition rows for easier future maintenance — no visible change",
    area: 'Categories',
  },
  {
    date: '2026-07-29',
    versionFolder: 'v2_code_review',
    ticketIds: ['TICKET-STAT-24'],
    title:
      'Added an exhaustive test suite pinning how every transaction is counted towards income, expense, and savings',
    area: 'Dashboard insights',
  },
  {
    date: '2026-07-29',
    versionFolder: 'v2',
    ticketIds: ['TICKET-SET-06', 'TICKET-DAT-04'],
    title:
      'Data export, import, and delete-all now live inside Settings instead of their own sidebar item',
    area: 'Data management',
  },
  {
    date: '2026-07-29',
    versionFolder: 'v2_code_review',
    ticketIds: ['TICKET-SET-07'],
    title:
      'Rebuilt the Settings page as separate sections so new settings are quicker to add — no visible change',
    area: 'Settings',
  },
  {
    date: '2026-07-29',
    versionFolder: 'v2_code_review',
    ticketIds: ['TICKET-SOLID-07'],
    title: 'Moved the shared date-range state to where the rest of the app-wide state lives',
    area: 'Foundation',
  },
  {
    date: '2026-07-30',
    versionFolder: 'v1.6_income_growth',
    ticketIds: ['TICKET-INC-01'],
    title:
      'Added an Income page to the sidebar — your income trends move off the dashboard and into their own home, filling up panel by panel',
    area: 'Income',
  },
];
