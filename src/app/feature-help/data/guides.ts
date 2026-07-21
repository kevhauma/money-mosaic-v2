export type GuideStep = {
  readonly title: string;
  readonly description: string;
};

export type Guide = {
  readonly slug: string;
  readonly title: string;
  readonly summary: string;
  readonly steps: readonly GuideStep[];
  readonly tryItLabel: string;
  readonly tryItRoute: string;
};

/**
 * Static, hand-written how-to content (TICKET-PUB-02) — no CMS, no runtime fetch. Steps mirror the
 * real UI flow as of writing; if a future ticket changes the import wizard, rule form, or transfer
 * review UI in a way that makes a step here inaccurate, update the matching entry as part of that
 * ticket (see the `work-ticket` skill's Implement step).
 */
export const GUIDES: readonly Guide[] = [
  {
    slug: 'importing-a-bank-statement',
    title: 'Importing a bank statement',
    summary: 'Turn a CSV export from your bank into transactions, from drag-and-drop to confirm.',
    steps: [
      {
        title: 'Drag your CSV file(s) in',
        description:
          'On the Import page, drag one or more CSV files onto the drop zone, or use "Browse" to pick them. Each file needs an account chosen next to it — if the file\'s IBAN matches an existing account, Money Mosaic picks it automatically and shows an "Auto-detected" badge.',
      },
      {
        title: 'Check the column mapping',
        description:
          "If the file's format matches a known bank, its preset mapping is applied automatically (or your own saved mapping, if you've imported from this account before). Otherwise, map each column yourself — date, amount (or separate debit/credit), description, counterparty — using the raw file preview on the right to check you picked the right ones.",
      },
      {
        title: 'Review the preview',
        description:
          'Before anything is saved, a preview table shows every row as valid or invalid, with a reason for each invalid one. Only valid rows are imported; a row already imported before (matched by a duplicate fingerprint) is skipped automatically.',
      },
      {
        title: 'Confirm',
        description:
          'Confirm the import to save the transactions. A failed import leaves your existing data untouched, and large files are parsed in the background so the app stays responsive.',
      },
    ],
    tryItLabel: 'Try it — go to Import',
    tryItRoute: '/import',
  },
  {
    slug: 'setting-up-categorisation-rules',
    title: 'Setting up categorisation rules',
    summary:
      'Automatically assign categories to transactions as they come in, without touching every row by hand.',
    steps: [
      {
        title: 'Open Categories → Rules and add a rule',
        description:
          'Give the rule a name and pick the category it should assign. Priority controls which rule wins when more than one matches — lower numbers run first.',
      },
      {
        title: 'Add one or more conditions',
        description:
          'Each condition checks a field (description, merchant, amount, account, ...) against an operator (contains, equals, between, ...) and a value. Choose "ALL conditions (AND)" for every condition to match, or "ANY condition (OR)" for just one to be enough.',
      },
      {
        title: 'Decide what happens after a match',
        description:
          'Leave "Continue to next rule after a match" off if this rule should be the last word for a matching transaction, or on to let lower-priority rules still run afterwards (useful for rules that only tag, not fully categorise).',
      },
      {
        title: 'Save — and know what it will never touch',
        description:
          "Rules run automatically on import and can be re-applied to existing transactions, but they never overwrite a category you've set manually on a transaction — that manual choice is protected until you change it yourself.",
      },
    ],
    tryItLabel: 'Try it — go to Categories',
    tryItRoute: '/categories',
  },
  {
    slug: 'reviewing-and-linking-transfers',
    title: 'Reviewing and linking transfers',
    summary:
      'See how money moving between your own accounts gets matched, and fix a match that got it wrong.',
    steps: [
      {
        title: 'Let auto-matching run',
        description:
          'When you import transactions, Money Mosaic looks for pairs that look like the same transfer between two of your own accounts. A high-confidence match (e.g. the same IBAN on both sides) links instantly and is excluded from income/expense but still counts toward net worth.',
      },
      {
        title: 'Review ambiguous matches',
        description:
          'On the Transactions page, open "Review possible transfers" to see pairs that were close but not certain enough to link automatically. Confirm a pair to link it, or leave it if it isn\'t really a transfer.',
      },
      {
        title: 'Undo a match that got it wrong',
        description:
          'A linked transaction shows an "Unlink transfer" action on its row — use it to break an incorrect pairing; both sides go back to being counted as normal transactions.',
      },
      {
        title: 'Tune the matching settings',
        description:
          'The match window (in days) and whether medium-confidence pairs auto-link are both configurable next to the review panel, if the defaults are too strict or too loose for how you bank.',
      },
    ],
    tryItLabel: 'Try it — go to Transactions',
    tryItRoute: '/transactions',
  },
  {
    slug: 'using-the-auto-categoriser',
    title: 'Using the auto-categoriser',
    summary:
      'Train an on-device model on your own categorised history, then accept its category suggestions and mined rules from the Learning page.',
    steps: [
      {
        title: 'Check the model status',
        description:
          'The Learning page shows the model as "not enough data" (fewer than 25 categorised transactions, or fewer than 2 active categories), "training", "ready", or "stale". It needs enough of your own history to learn from before it can suggest anything.',
      },
      {
        title: 'Pick a training window and train',
        description:
          'Choose how much history to train on (the available "last N years" options), then click Train. Training runs in a background worker, so the app stays responsive, and shows live progress (epoch, loss, accuracy) while it works.',
      },
      {
        title: 'Review category suggestions',
        description:
          'Once ready, every uncategorised transaction gets a suggested category with a confidence percentage next to it. Accept applies the suggestion, Dismiss leaves the transaction as-is — suggestions are never applied automatically.',
      },
      {
        title: 'Accept mined rule proposals',
        description:
          'When enough confident suggestions cluster around the same counterparty and category, a rule proposal shows up above the suggestions table with its matched transactions. Accept turns it into a real rule so future imports from that counterparty categorise themselves without going through suggestions again; Dismiss discards the proposal.',
      },
      {
        title: 'Retrain when it goes stale',
        description:
          'Adding, renaming, or removing a category flips the model to "stale" since its old categories no longer match — retrain any time from the same page to bring it back up to date.',
      },
    ],
    tryItLabel: 'Try it — go to Learning',
    tryItRoute: '/learning',
  },
];
