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
          'On the Transactions page, the "Review possible transfers" button says how many pairs are waiting, and reads "none to review" once they are all dealt with — so you can tell a finished review from one you never ran. Open it to see pairs that were close but not certain enough to link automatically, then confirm a pair to link it, or leave it if it isn\'t really a transfer.',
      },
      {
        title: 'Undo a match that got it wrong',
        description:
          'A linked transaction\'s Category column reads "Transfer" followed by the account at the other end, rather than a category — that is how a linked row is meant to look, not something to go and fix. To break an incorrect pairing, use the "Unlink transfer" action on that row; both sides go back to being counted as normal transactions.',
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
      'Train an on-device model on your own categorised history, then accept its category suggestions and mined rules from the Auto-categoriser page.',
    steps: [
      {
        title: 'Check the model status',
        description:
          'The Auto-categoriser page shows the model as "not enough data" (fewer than 25 categorised transactions, or fewer than 2 active categories), "training", "ready", or "stale". It needs enough of your own history to learn from before it can suggest anything.',
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
    tryItLabel: 'Try it — go to the Auto-categoriser',
    tryItRoute: '/auto-categoriser',
  },
  {
    slug: 'getting-started-with-the-income-page',
    title: 'Getting started with the Income page',
    summary:
      'The Income page takes the money coming in — not what goes out — and turns it into a trend you can trust: is it growing, shrinking, or just noisy. It reads your existing transactions — there is nothing to log by hand — but it needs three things set up first.',
    // The first three steps are the quick-setup path, in the order they must be done, and are what
    // TICKET-PUB-08's first-visit surface renders (`steps.slice(0, 3)`). Reordering them changes
    // what a first-time user is shown, so `guides.spec.ts` pins the count and the order.
    steps: [
      {
        title: 'Get income transactions in, and categorised as income',
        description:
          'The page reads transactions you have already imported, so start there: bring in a statement (see "Importing a bank statement"), then make sure the money coming in sits in a category whose kind is "income" — that kind is set on the category itself, under Categories. A rule can do it for you every time (see "Setting up categorisation rules"). Until at least one income category has transactions in it, the page has nothing to read and will say so.',
      },
      {
        title: 'Tell the page when your career started',
        description:
          'On the Income settings page, set the date your working life began. That is rarely the same date your imported history begins, and the difference matters: a few student-era months or a back-dated opening balance sit at the front of every chart and drag the whole growth story down. Every panel starts from this date. Leave it empty to use your full history.',
      },
      {
        title: 'Choose which categories count, and flag any annual lump sums',
        description:
          'Still on the Income settings page: every income category counts by default, and unticking one removes it from every figure at once — the charts, the growth figures, the yearly totals, the take-home rate and the events list. That is what you want for a category full of one-off gifts and refunds, where a good month would otherwise read as sustained growth. Then handle your annual lump sums — a 13th month, vacation pay, a holiday bonus. There are two ways to record one, and which you use depends only on how your employer pays it. If it arrives as its own transaction in its own category, tick that category under "Annual lump sums" here. If it is paid inside your regular salary deposit, there is no separate category to tick — instead open Salary details, find that month, and type the bonus part into its Bonus column. Both do the same thing to the charts: the amount is spread across its year rather than drawn as one spike, and left out of the take-home rate. Use whichever matches your payslip, or both, if some years were paid one way and some the other. One more setting matters only for that second route: if more than one category pays you, pick your salary category under "Main income category", so a bonus you typed into Salary details comes off that category rather than off every stream that paid you that month. None of this ever changes a transaction.',
      },
      {
        title: 'Add your gross wage, if you want the take-home rate',
        description:
          'Optional, and the one place on this page where you type rather than configure. A bank export only records what landed in your account, never what you earned before deductions — so open Salary details and fill in a gross wage per month. Leaving a field saves it; there is no save button. Clicking a point on the income chart opens just that month, which is quicker when you only want to explain one spike.',
      },
      {
        title: 'What each part of the page then tells you',
        description:
          'The monthly chart is your income by source over time. The growth figures compare your last complete month against three baselines — when you started, the same month last year, and the start of this year. "Net vs gross" holds four charts comparing what you earn against what reaches you. The yearly view is one bar per calendar year. The list beside the charts is your history of raises, bonuses, wage moves and streams that stopped, grouped by year.',
      },
      {
        title: 'If the page still looks empty',
        description:
          'Three things cause it, and each has a different fix. No transactions in range — check the career start date is not set after your data begins, and that the import actually landed. No income categories counted — open Income settings and tick at least one; if the list there is empty, no category has kind "income" yet, which is set under Categories. Everything counted but the charts are flat — that usually means the transactions are there but categorised as something other than income.',
      },
    ],
    tryItLabel: 'Try it — go to Income',
    tryItRoute: '/income',
  },
  {
    slug: 'reading-your-income-growth',
    title: 'Reading your income growth',
    summary:
      'Once the Income page is set up, this is how to read what it shows — so a bonus month, a raise, or an ended contract each register as what they are. New here? Start with "Getting started with the Income page".',
    steps: [
      {
        title: 'Read the monthly chart by source, not just by total',
        description:
          "Each income category is its own series, so a total that holds steady while one stream shrinks and another grows is visible rather than hidden. Clicking a month opens that month's salary details, which is the quickest way to annotate a spike you are looking at.",
      },
      {
        title: 'Read the growth figures',
        description:
          'Three cards compare your last complete month against three baselines, oldest first: the first month you ever earned anything, the same month a year earlier, and the first month of this year. Reading them left to right is reading the story forwards — how far since you started, since last year, since January. Each card links to the transactions behind its own baseline month. A card shows a dash rather than a number when there is nothing to compare against, and says why.',
      },
      {
        title: 'Check the notable changes for what moved and when',
        description:
          'Beside the charts, every raise, pay cut, recorded bonus and income stream that went quiet is listed under its year, newest first — along with every month where your take-home or gross pay moved by more than 1%, as a row reading month, what moved and by how much, and the percentage beside a triangle for its direction. Nothing here is cleared away once read: it is a history to scroll back through, not a queue to work off, so you can still find when a raise landed months later. Those wage moves are measured on your plain salary, with annual lump sums left out, so a 13th month never shows up as a raise followed by a cut.',
      },
      {
        title: 'Compare net against gross',
        description:
          'Once you have entered gross wages, the "Net vs gross" section answers what "my income is up" cannot. The take-home rate is drawn as a full 0–100% band, so a rate that drifts from 68% to 64% is visible rather than lost in an axis that rescales itself. The other three charts plot gross against net — their levels, and how far each has moved since your first recorded month, in currency and as a percentage. The two lines rising together means your raises are passing through intact; gross pulling away from net means your deduction rate is climbing.',
      },
      {
        title: 'Know what a bonus does to the numbers',
        description:
          'A lump sum is handled two ways, depending on how it was paid, and they agree with each other. If it arrives in its own category, tick that category under "Annual lump sums". If it is baked into your regular salary deposit, record it in the Bonus column of Salary details instead. Either way it is spread across its year on the income chart, so it stops reading as a raise — and left out of the take-home rate entirely, since that comparison is about your plain monthly wage. Either way it also keeps a band of its own on the chart: a flagged category keeps its own colour, and a bonus typed into Salary details gets a "Bonus (spread over the year)" band, so you can see how much of the year was bonus instead of having it quietly inflate your salary line. Your yearly totals are unchanged: smoothing only redistributes. Salary details still shows the bonus in the month it actually landed, which is the one place the real deposit is preserved.',
      },
      {
        title: 'Compare whole years',
        description:
          'The yearly view is one bar per calendar year, with a span picker for how many years to set side by side. The year in progress is left out rather than shown short — a part-year against whole ones reads as a collapse that has nothing to do with your income.',
      },
      {
        title: 'Make gross and net easier to tell apart',
        description:
          'If the two lines in the "Net vs gross" section are hard to distinguish, pick a colour for the gross series under Income settings. It applies to every gross-pay series on the page and changes no figure anywhere.',
      },
    ],
    tryItLabel: 'Try it — go to Income',
    tryItRoute: '/income',
  },
];
