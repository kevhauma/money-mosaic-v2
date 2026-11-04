/**
 * The Money Mosaic data model — one definition of `Account`, `Transaction`, `Category` and the
 * rest, read by **both** workspaces (TICKET-SRV-02).
 *
 * This module lives at the repo root rather than in either workspace on purpose. TICKET-SRV-01
 * shipped two ESLint guards — `src/**` may not import `server/**`, and vice versa — the first of
 * which protects a `CLAUDE.md` hard rule about the browser bundle. Rather than punch a hole in
 * that guard so the backend could reach into `src/app/core/data-access/`, the shapes both sides
 * agree on got their own home, which both guards permit. The Angular side reaches it through
 * `src/app/core/data-access/entities.ts`, a re-export, so no import path under `src/app/` names
 * this file.
 *
 * ## Rules for this file
 *
 * - **It imports nothing.** No Angular, no Drizzle, not even a sibling in `shared/` — asserted by
 *   `server/src/shared-module.spec.ts`. A dependency here would be a dependency in both a browser
 *   bundle and a Node process. That is why the supporting unions below are declared here and
 *   re-exported by the modules that own them, rather than the other way round.
 * - **Types only.** Every runtime value lives next door in `shared/seed-data.ts`, so this module
 *   erases completely at build time. The Drizzle tables in `server/src/schema/` are the storage;
 *   this is the shape that travels over the wire.
 *
 * ## The `field: T | undefined` convention
 *
 * Singleton settings rows (`AppSettings`, `UiPreferences`) declare every optional field as
 * required-but-possibly-`undefined` rather than `field?:`. `@ngrx/signals`' `withState` keeps
 * property optionality on the generated accessor, so `field?:` would make `store.field` itself
 * possibly missing instead of a signal whose *value* can be `undefined`. `undefined` always means
 * "never chosen" and falls back to a default where it is read.
 */

/* --------------------------------------------------------------------------------------------
 * Supporting unions
 *
 * Small unions owned by a feature module elsewhere, but referenced by an entity below. Since this
 * module may not import, they are *declared* here and re-exported by their home module — which
 * keeps one definition each, rather than a hand-mirrored copy on either side of the seam.
 * ------------------------------------------------------------------------------------------ */

/**
 * A preset accent colour (TICKET-SET-02). Re-exported by — and described in full by —
 * `core/theme/accent-colors.ts`, which owns the palette values themselves.
 */
export type AccentColorId = 'amber' | 'sky' | 'violet' | 'rose' | 'teal' | 'lime';

/** Which side of the number the currency symbol renders on. Re-exported by `shared/utils/format-settings.ts`. */
export type CurrencySymbolPosition = 'before' | 'after';

/**
 * What "saving" means for a velocity measurement (FUT-01). Re-exported by — and explained in full
 * by — `core/stats/saving-velocity.ts`.
 */
export type SavingBasis = 'net-cash-flow' | 'savings-transfers';

/** The auto-categoriser's feature-hashing parameters (ML-04). Re-exported by `core/ml/model-config.ts`. */
export type FeatureConfig = {
  dim: number;
  charNgramMin: number;
  charNgramMax: number;
};

/* --------------------------------------------------------------------------------------------
 * Entities
 * ------------------------------------------------------------------------------------------ */

/** A person sharing a `joint` account, and the IBAN(s) they pay in from (TICKET-ACC-03). */
export type JointOwner = {
  name: string;
  ibans: string[];
  share?: number;
};

export type Account = {
  id?: number;
  name: string;
  type: 'checking' | 'savings' | 'joint' | 'invest';
  iban?: string;
  currency: 'EUR';
  openingBalance: number;
  openingBalanceDate: string;
  color: string;
  icon: string;
  archived: boolean;
  /**
   * My share of joint spending (and of the pre-existing opening balance), a fraction in `[0, 1]`.
   * Only meaningful for `type === 'joint'`. `undefined` means "whole account is mine" (i.e. `1`), so
   * every existing account and every non-joint account behaves exactly as before this field existed
   * (TICKET-ACC-02).
   */
  ownershipShare?: number;
  /**
   * Other people on a `joint` account and the IBAN(s) they pay in from, used to tell their
   * contributions apart from mine and from external money. Only meaningful for `type === 'joint'`;
   * `undefined`/empty means no co-owners registered (TICKET-ACC-03).
   */
  coOwners?: JointOwner[];
  /** Manual display order (TICKET-ACC-04) — `undefined` sorts after every account that has one. */
  sortOrder?: number;
};

export type Transaction = {
  id?: number;
  accountId: number;
  bookingDate: string;
  valueDate?: string;
  amount: number;
  currency: 'EUR';
  rawDescription: string;
  counterpartyName?: string;
  counterpartyIban?: string;
  categoryId?: number;
  /** True once the user has manually assigned/changed the category — rules must never overwrite it (FR-TXN-2, FR-CAT-3). */
  categoryManual?: boolean;
  transferId?: number;
  importBatchId?: number;
  fingerprint: string;
  notes?: string;
  createdAt: string;
  /**
   * The original CSV row this transaction was imported from, when known (TICKET-TXN-06).
   * `rawRow` (header name → cell value, in column order) is the preferred, structured form used to
   * render the labeled "Original CSV row" table; `rawLine` is the flat original line text, kept as a
   * fallback for transactions imported before `rawRow` was captured.
   */
  rawLine?: string;
  rawRow?: Record<string, string>;
  /**
   * Manual reweighting of this transaction's contribution to net worth and income/expense stats,
   * overriding the account-based default from `classifyJointLeg` (TICKET-TXN-03):
   * - `personal` — counts 100% regardless of account (a personal-only expense accidentally paid
   *   from the joint account).
   * - `notMine` — counts 0% (a co-owner's personal-only expense paid from the joint account).
   * - `shared` — weighted by the referenced `jointAccountId` account's `ownershipShare` instead of
   *   this transaction's own account's default weighting (a joint/shared expense accidentally paid
   *   from my own account). `jointAccountId` is required whenever more than one joint account
   *   exists; auto-inferred when there's exactly one.
   * `reimbursementTransferId` only applies to `shared`: when set, both legs of that `Transfer` are
   * excluded from net worth and income/expense stats, since this transaction's own weighted amount
   * already accounts for the reimbursed expense.
   * Mutually exclusive with `transferId` — a linked transfer leg's contribution is governed by its
   * own mineIn/mineOut classification, not a per-leg override. Independent of `categoryId`/`categoryManual`.
   */
  attributionOverride?: {
    mode: 'personal' | 'shared' | 'notMine';
    jointAccountId?: number;
    reimbursementTransferId?: number;
  };
  /**
   * Manually excluded from income/expense/savings-rate/category-breakdown; still counts toward
   * balance and net worth; independent of category and of `attributionOverride`'s weight
   * (TICKET-TXN-04). Mutually exclusive with `transferId` — a linked transfer leg is already
   * excluded from income/expense (FR-TRF-1) and has no category, so nullifying it would be
   * redundant. Never set/cleared by the rules engine.
   */
  nullified?: boolean;
};

export type Transfer = {
  id?: number;
  fromTransactionId: number;
  toTransactionId: number;
  method: 'auto-iban' | 'auto-amountdate' | 'manual';
  confidence: 'high' | 'medium' | 'manual';
  linkedAt: string;
};

/** Singleton row (id always 1) configuring transfer auto-matching (FR-TRF-4). */
export type TransferSettings = {
  id?: number;
  matchWindowDays: number;
  autoLinkMediumConfidence: boolean;
};

export type Category = {
  id?: number;
  name: string;
  /**
   * `expense`/`income` drive the stats sign buckets as before. `neutral` still counts toward
   * account balance and net worth but is excluded from income, expense, savings-rate, and
   * category-breakdown aggregates — e.g. a partner's contribution into a joint account, which
   * affects the balance but isn't the user's own income (TICKET-CAT-02).
   */
  kind: 'expense' | 'income' | 'neutral';
  group?: string;
  color: string;
  icon: string;
  archived: boolean;
  isSystem: boolean;
  /** Manual display order (TICKET-CAT-03) — `undefined` sorts after every category that has one. */
  sortOrder?: number;
  /**
   * The period this category actually applied to (FR-CAT-9, TICKET-CAT-10) — rent until the move,
   * a subscription until it was cancelled. ISO (`YYYY-MM-DD`) dates, both optional and independent:
   * an absent bound is unbounded on that side, so every category predating this field behaves
   * exactly as before.
   *
   * **Independent of `archived`, deliberately.** Archiving is timeless ("hide this everywhere, I'm
   * done seeing it"); a window is a dated fact ("this was true until then, and still is about that
   * period"), which is what lets a picker keep offering an ended category for a 2022 transaction it
   * genuinely applied to (TICKET-CAT-11).
   */
  activeFrom?: string;
  activeUntil?: string;
};

export type RuleCondition = {
  field: 'description' | 'counterpartyName' | 'counterpartyIban' | 'amount' | 'accountId';
  operator: 'contains' | 'equals' | 'regex' | '>' | '<' | 'between';
  value: string | number | [number, number];
};

export type RuleAction = {
  setCategoryId: number;
};

export type Rule = {
  id?: number;
  name: string;
  priority: number;
  enabled: boolean;
  continueOnMatch: boolean;
  /** How the rule's conditions combine: `'all'` = AND (default), `'any'` = OR (FR-CAT-2). Absent on rules created before v5, treated as `'all'`. */
  conditionMatch?: 'all' | 'any';
  conditions: RuleCondition[];
  action: RuleAction;
};

export type MappingProfileColumns = {
  date: string;
  amount?: string;
  debit?: string;
  credit?: string;
  description: string;
  counterpartyName?: string;
  counterpartyIban?: string;
  /** Column holding the CSV's own account number/IBAN, used to auto-detect which account a file belongs to. */
  ownIban?: string;
  balance?: string;
};

/**
 * How debit/credit-column signs map onto the stored (negative-expense) amount. Its option list,
 * `SIGN_CONVENTIONS`, is in `shared/seed-data.ts`.
 */
export type SignConvention = 'as-is' | 'debit-negative' | 'credit-negative';

/** Date formats the CSV parser understands (see `parseDate` in `core/import/csv-row-mapper.ts`). */
export type DateFormat = 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY';

/** Text encodings offered when decoding an uploaded CSV file. */
export type CsvEncoding = 'utf-8' | 'windows-1252';

export type MappingProfile = {
  id?: number;
  name: string;
  bankPreset?: string;
  /** Header names used to auto-detect this profile from an uploaded CSV. Only set on bank template profiles, not user-saved account mappings. */
  headerSignature?: string[];
  delimiter: string;
  decimalSeparator: string;
  dateFormat: DateFormat;
  encoding: CsvEncoding;
  headerRows: number;
  signConvention: SignConvention;
  columns: MappingProfileColumns;
  defaultAccountId?: number;
};

/** Singleton row (id always 1) of category ids the user has opted to exclude from the dashboard's category period comparison panel (TICKET-STAT-04 follow-up). Absent row / empty list = nothing excluded. */
export type CategoryComparisonSettings = {
  id?: number;
  excludedCategoryIds: number[];
};

/** The Dashboard content rows a user can reorder/hide (TICKET-STAT-14) — matches `dashboard-overview.component.html`'s row structure 1:1. */
export type DashboardRowId =
  | 'stats'
  | 'weekday-weekend'
  | 'category-breakdown'
  | 'category-comparison'
  | 'trend-chart'
  | 'top-transactions'
  | 'action-queue'
  | 'account-balance'
  | 'spending-heatmap';

/** Singleton row (id always 1) persisting the user's Dashboard row order and hidden rows (TICKET-STAT-14). */
export type DashboardLayoutSettings = {
  id?: number;
  rowOrder: DashboardRowId[];
  hiddenRowIds: DashboardRowId[];
};

export type ImportBatch = {
  id?: number;
  accountId: number;
  fileName: string;
  /** The remembered mapping profile used, when the user chose to remember it; absent otherwise (CR-1.6). */
  mappingProfileId?: number;
  importedAt: string;
  rowsRead: number;
  rowsAdded: number;
  /** Rows recognised as already present and **skipped**. */
  rowsDuplicate: number;
  /**
   * Rows recognised as already present and **added anyway**, because the user chose to
   * (TICKET-IMP-14). Absent on every batch imported before that was a choice, and on every batch
   * since where the user left the default alone — so `undefined` reads as zero.
   *
   * A separate figure rather than folding into `rowsDuplicate`: that one means "not added", and
   * `rowsRead = rowsAdded + rowsDuplicate` stays true. Without this, a batch where 40 known rows
   * were knowingly re-imported would be indistinguishable from 40 genuinely new ones.
   */
  rowsDuplicateImported?: number;
  dateFrom: string;
  dateTo: string;
};

/**
 * A user's correction to a *detected* recurring payment (TICKET-REC-11) — the equivalent, for
 * recurring detection, of `categoryManual` on a transaction: helpful automation the user can always
 * override, and an override re-detection may never quietly discard.
 *
 * **Identified by an occurrence, not by the series key.** `RecurringPaymentSeries.key` is
 * `<cluster>|<median amount>` and its own doc forbids hanging an override off it, because a price
 * change moves the median. A transaction id is a primary key: it does not move. A stored
 * override applies to whichever series still contains `anchorTransactionId` among its occurrences,
 * which is why importing *older* history — which would move a series' first occurrence earlier —
 * does not lose the override either.
 */
export type RecurringOverride = {
  id?: number;
  /** `dismissed`: not really a recurring payment. `merged`: the same real payment as another series. */
  kind: 'dismissed' | 'merged';
  /** Any transaction id belonging to the series this override is about. */
  anchorTransactionId: number;
  /**
   * For `merged` only: a transaction id belonging to the series this one is folded into. The two
   * are stored as a directed pair rather than a group id — a group would need its own lifecycle,
   * and a pair is enough for "these two rows are one payment", which is the whole of what the
   * review asked for.
   */
  mergedIntoTransactionId?: number;
  createdAt: string;
};

/** Singleton row (id always 1) persisting the trained auto-categoriser model (FR-ML-4) so it survives a reload. */
export type CategoryModelArtifact = {
  id: 1;
  modelTopology: ArrayBuffer;
  weightSpecs: ArrayBuffer;
  weightData: ArrayBuffer;
  categoryIdByIndex: number[];
  featureConfig: FeatureConfig;
  /** `taxonomySignature()` at training time — flips the model `stale` once categories change (ML-07). */
  taxonomySignature: string;
  /** `epochsRun` is optional — absent on artifacts persisted before ML-15 added it. */
  metrics: { accuracy: number; trainedSampleCount: number; epochsRun?: number };
  trainedAt: string;
  /** `MODEL_SCHEMA_VERSION` at training time, distinct from the database schema version. */
  schemaVersion: number;
};

/**
 * Singleton row (id always 1) for the user's chosen training-window preset (ML-17). Kept in its
 * own table rather than as a field on `CategoryModelArtifact` because the preference must persist
 * (and be changeable) even before a model has ever been trained, when no artifact row exists yet.
 */
export type CategoryModelSettings = {
  id?: number;
  /** `null` = unrestricted, train on the user's entire categorised history. */
  trainingWindowYears: number | null;
};

/**
 * Singleton row (id always 1) for app-wide settings that are genuinely portable/exportable data
 * (currency, locale, privacy default, etc.) — as opposed to the interface's own state (the chosen
 * theme, the onboarding flags), which lives in `UiPreferences` beside it (TICKET-SRV-10). Starts empty;
 * SET-02/SET-03/SET-04/PRIV-01 each add their own additive optional field on top later.
 */
export type AppSettings = {
  id: number;
  /**
   * Additive field (TICKET-SET-02) — a fixed palette key, not a freeform hex. `undefined` falls
   * back to each theme's own baked-in accent. Only applied while a Default Light/Dark theme is
   * active (`DEFAULT_THEME_STYLE_IDS` in `core/theme/theme-styles.ts`); every other theme keeps
   * its own accent regardless of this field.
   */
  primaryColor: AccentColorId | undefined;
  /**
   * Additive fields (TICKET-SET-03) — a display-only symbol overlay, not an ISO 4217 code: this
   * app doesn't do currency conversion, so rather than a fixed code list (which would imply real
   * multi-currency accounting), the user instead picks/types the symbol they want shown and which
   * side of the number it renders on. `undefined` falls back to `DEFAULT_CURRENCY_SYMBOL`/
   * `DEFAULT_CURRENCY_SYMBOL_POSITION` (`'€'`/`'before'`) — today's exact hardcoded behavior — so
   * nobody's amounts change until they opt in.
   */
  currencySymbol: string | undefined;
  currencySymbolPosition: CurrencySymbolPosition | undefined;
  /**
   * Additive field (TICKET-SET-04) — a BCP 47 tag (e.g. `'en-BE'`, `'en-US'`) driving both
   * `formatCurrency`'s number grouping/decimal separator and the shared date-formatting helper.
   * `undefined` falls back to `DEFAULT_LOCALE` in `shared/utils/format-settings.ts` — `'en-US'`
   * originally (SET-04's "keep today's formatting" argument), `'en-BE'` since TICKET-SET-10, which
   * re-made that call for the app's one documented Belgian user. A *stored* value always wins over
   * the default, so SET-10 changed nobody's opted-in formatting.
   */
  locale: string | undefined;
  /**
   * Additive field (TICKET-INC-03) — income categories the user has opted *out* of "my income
   * growth" (FR-INC-3). Stored as an exclusion list rather than the selection itself, mirroring
   * `CategoryComparisonSettings.excludedCategoryIds`, so a newly created income category is
   * included by default without any sync effect keeping a stored selection in step with the
   * category list. `undefined`/empty = every income category counts.
   */
  excludedIncomeCategoryIds: number[] | undefined;
  /**
   * Additive field (TICKET-INC-12) — the date the user's working life started (ISO `YYYY-MM-DD`),
   * which is not the same thing as where their imported history happens to begin (FR-INC-12). Only
   * the `/income` page reads it, where it clamps the span every panel covers so student-era income
   * or a back-imported opening balance stops distorting the growth story; `undefined` = today's
   * behaviour, the full data history.
   */
  careerStartDate: string | undefined;
  /**
   * Additive field (TICKET-INC-04) — income categories the user has marked as an *annual lump sum*
   * (13th month, vacation pay, a holiday bonus): real income, but deposited once a year, so the
   * `/income` trend spreads each year's total across that year's months instead of drawing one
   * spike (FR-INC-4). Unlike `excludedIncomeCategoryIds` this is an **inclusion** list defaulting
   * to empty — "count this category" is a sensible default for a new income category, "smooth this
   * category" never is.
   */
  smoothedBonusCategoryIds: number[] | undefined;
  /**
   * Additive field (TICKET-SET-08) — the preset the `/income` page's *gross pay* series take, so
   * gross and net are told apart by a colour the user picked rather than by whichever categorical
   * slot the theme handed out. Reuses `AccentColorId` rather than minting a second colour
   * vocabulary (and rather than a freeform hex, which could be invisible against the plot);
   * `undefined` falls back to the active theme's categorical palette, i.e. today's behaviour.
   * Unlike `primaryColor` it applies under *every* theme style, because it colours canvas rather
   * than daisyUI tokens.
   */
  grossColor: AccentColorId | undefined;
  /**
   * Additive field (TICKET-INC-19) — the income category the user's salary actually lands in, so a
   * bonus recorded against a month's salary details (`SalaryMetadata.bonus`, FR-INC-10) is taken off
   * *that* category alone instead of pro rata across every income stream that was non-zero that
   * month. `undefined` — the default — keeps the pro-rata split, which is exactly right for the one
   * income stream case and the only well-defined answer when the user hasn't said.
   *
   * A single global id rather than a per-month choice: re-asking which category a bonus landed in
   * every bonus month is a worse setting than one the user states once (see the ticket's Notes).
   * `IncomeStore.toggleIncomeCategory` clears it when the category leaves the growth selection, the
   * same pruning `smoothedBonusCategoryIds` gets.
   */
  mainIncomeCategoryId: number | undefined;
  /**
   * Additive field (TICKET-PUB-08) — the how-to guides whose first-visit intro the user has already
   * been shown, so it never interrupts twice. Keyed by **slug** rather than a boolean per feature,
   * so the next feature to want an intro reuses this field instead of adding one of its own.
   *
   * Deliberately *not* a general "dismissed notices" store: every other dismiss in the app is
   * per-visit component state and stays that way (the income events rail is explicitly
   * undismissable, TICKET-INC-17). This records one thing — "we have introduced this page" — which
   * genuinely should survive a reload, where a cleared notice should not.
   *
   * **Nothing writes this since TICKET-INC-23** removed the Income page's first-visit gate, which
   * was its only producer. The field stays because dropping it would be a migration that buys
   * nothing — rows already carrying it are harmless — and because it is where a future first-visit
   * hook belongs. The methods that maintained it were deleted with their caller rather than left as
   * an API with nothing behind it.
   */
  seenGuideSlugs: string[] | undefined;
  /**
   * Additive field (TICKET-STAT-32) — expense categories the user has left out of the Dashboard's
   * spending heatmap (FR-STAT-15), so one dominant fixed cost stops taking a row *and* setting the
   * colour scale every other category is then measured against. Excluded spend is dropped from the
   * grid entirely rather than folded into its "Other" row — folding it would leave the same money
   * in the same cells under a different label.
   *
   * Deliberately separate from `CategoryComparisonSettings.excludedCategoryIds`: "not interesting
   * to compare period-over-period" and "drowning out the heatmap" are different judgements about
   * different charts. Lives here rather than in a fourth singleton table because the newer
   * convention for a list of category ids is a field on this row (see `excludedIncomeCategoryIds`).
   */
  heatmapExcludedCategoryIds: number[] | undefined;
  /**
   * Additive field (TICKET-PRIV-01) — whether privacy mode is on, blurring every figure on the
   * Dashboard so the page survives a screen-share. `undefined` means off, which is what an unset
   * field already means; `AppSettingsStore.privacyModeEnabled` resolves the `?? false` once so no
   * consumer has to. A setting the user chooses on the Settings page, so it belongs on this row
   * rather than in `UiPreferences` with the interface's own state.
   */
  privacyMode: boolean | undefined;
  /**
   * Additive field (TICKET-SET-09) — the calendar month (1–12) a fiscal year begins in, so "previous
   * fiscal quarter"/"previous fiscal year" mean the user's year rather than the calendar's.
   * `undefined` means January, i.e. today's exact calendar-year behaviour — nobody's quarter/year
   * presets change until they opt in. Nothing reads this yet; it exists so STAT-37's two fiscal
   * quick ranges have a boundary to resolve against.
   */
  fiscalYearStartMonth: number | undefined;
  /**
   * Additive field (TICKET-STAT-40) — the last ten date ranges applied to any picker (Apply in the
   * absolute panel, or a quick range clicked; prev/next stepping never records), most-recent-first,
   * global rather than per page. Holds canonical `range-expression` text (STAT-35) — an ISO date, or
   * `now-30d`-style relative text where the applied range came from one — **not** resolved dates, so
   * a saved `now-30d` still means "the last 30 days" on read rather than freezing into the window it
   * happened to resolve to when saved. `undefined`/empty = nothing applied yet.
   */
  recentRanges: RecentRange[] | undefined;
};

/** One entry in `AppSettings.recentRanges` (TICKET-STAT-40) — see that field's doc comment. */
export type RecentRange = { fromExpr: string; toExpr: string };

/**
 * One month's manually-entered salary facts (TICKET-INC-10, FR-INC-10) — the one thing on the
 * Income page that isn't derived from imported transactions, because a bank CSV only ever records
 * what *landed* in the account.
 *
 * Household-level and deliberately unlinked to an `Account` or a `Category`: it's a fact about the
 * month, not about whichever account the net salary happened to arrive in.
 *
 * Both amounts are optional (see TICKET-INC-10's implementation notes): a user may know their gross
 * wage but not split out a bonus, or note a bonus in a month whose gross they haven't filled in
 * yet, and clearing a field must be able to remove it rather than persist a zero. A row where both
 * are absent is deleted rather than kept empty.
 */
export type SalaryMetadata = {
  id?: number;
  /** Calendar month, `YYYY-MM` — `bucketKeyForDate`'s `'month'` format. Uniquely indexed: one row per month. */
  yearMonth: string;
  /** Gross monthly pay before tax and social contributions. A plain number; the currency symbol is a display setting (TICKET-SET-03). */
  grossWage?: number;
  /** The part of *this month's actual deposit* that was a 13th month / vacation / holiday bonus rather than regular pay. Read by FR-INC-11's ratio, which subtracts it from net before comparing to `grossWage`. Distinct from FR-INC-4's per-category smoothing — see both tickets' Notes. */
  bonus?: number;
  note?: string;
};

/**
 * One thing the user is saving toward (TICKET-FUT-02, FR-FUT-2) — a name, what it costs, and where
 * it sits in the queue. Goals are funded **top-down** (TICKET-FUT-05), so `sortOrder` is not a
 * display preference here the way it is on `Account`/`Category`: it decides which goal's ETA moves
 * when another one is dragged above it.
 */
export type SavingsGoal = {
  id?: number;
  name: string;
  /** What it costs, in the app's currency. Always positive. */
  targetAmount: number;
  /** Manual funding order — goals are paid for top-down, so this drives every ETA (FUT-05). */
  sortOrder?: number;
  /** Optional "I want this by" date (ISO `YYYY-MM-DD`) — turns the ETA into on-track/behind. */
  targetDate?: string;
  note?: string;
  archived: boolean;
  /** ISO date the goal was created — the only ordering fallback before a manual order exists. */
  createdAt: string;
};

/**
 * Which question `/future` is answering (TICKET-FUT-09): walk the measured rate forward and solve
 * for the *date* a goal becomes affordable, or fix the date and solve for the *rate* it demands.
 */
export type ForecastMode = 'when-affordable' | 'required-rate';

/** The forecast's own parameters (TICKET-FUT-02) — one singleton row, `id: 1`, like `appSettings`. */
export type ForecastSettings = {
  id: 1;
  /** Complete months of history the velocity is measured over (FUT-01). */
  lookbackMonths: number;
  basis: SavingBasis;
  /** Cash kept aside and never spent on a goal — the emergency float. Never negative. */
  safetyNetAmount: number;
  /**
   * Which question `/future` is answering (FUT-09) — solve for the date, or for the rate.
   */
  mode?: ForecastMode;
  /**
   * Accounts the forecast is allowed to consider (FUT-08). `undefined` or empty = every account,
   * which is the behaviour of every ticket before FUT-08.
   */
  scopeAccountIds?: number[];
};

/**
 * Display label only (TICKET-LOAN-01) — a mortgage, a car loan, and a personal loan are amortized
 * identically (principal, fixed annual rate, term); `loanType` must never branch the amortization
 * or progress math in `core/loans/`. `'mortgage'` is simply the first/most common option in the
 * create/edit form's dropdown, not a special case.
 */
export type LoanType = 'mortgage' | 'auto' | 'personal' | 'student' | 'other';

/**
 * One tracked loan (TICKET-LOAN-01, FR-LOAN-1) — a mortgage, a car loan, a personal loan, or
 * anything else amortized on a fixed principal/rate/term. `categoryId` links it to the one expense
 * category whose transactions count as payments; enforcing "one active loan per category" is a
 * form-level invariant (LOAN-03), not a schema constraint.
 */
export type Loan = {
  id?: number;
  name: string;
  loanType: LoanType;
  /** Original loan amount. */
  principal: number;
  /** Annual rate, percent (e.g. 3.5 for 3.5%). */
  interestRate: number;
  termMonths: number;
  /** ISO `yyyy-mm-dd`. */
  startDate: string;
  /** FK -> `Category.id`; the expense category whose transactions count as payments. */
  categoryId: number;
  archived: boolean;
  sortOrder: number;
};

/**
 * Which theme from `core/theme/theme-styles.ts`'s catalogue renders the app. Declared here, rather
 * than beside the catalogue that owns it, for the same reason `AccentColorId` is
 * (TICKET-SRV-02): `UiPreferences.themeStyle` stores one of these ids, and this shared module may
 * not import anything — so the union lives here and `theme-styles.ts` re-exports it. Consumers
 * keep importing it from `@/core/theme`.
 */
export type ThemeStyleId =
  | 'deformable'
  | 'deformable-dark'
  | 'neumorphism'
  | 'neumorphism-dark'
  | 'liquid-glass'
  | 'cyberpunk'
  | 'skeuomorphism'
  | 'anti-polish'
  | 'memphis'
  | 'retro-futurism';

/**
 * Per-user interface state — the three flags that used to be the app's last `localStorage` keys.
 *
 * Until this table they were per-*browser*, each with a prose justification for why that was the
 * right scope. They are per-*account* now, deliberately: a self-hosted app that keeps every byte of
 * a user's data in one SQLite file and then quietly keeps three more in whichever browser they
 * happened to use is not one system, it is two, and the second one has no backup, no export and no
 * way to answer "why does this install look different on my laptop". So picking a theme, seeing the
 * landing page and waving the backup reminder away now travel with the account, which is what
 * every other preference in this app already does.
 *
 * Kept apart from `AppSettings` rather than folded into it: that row is the user's *portable
 * settings* — currency, locale, fiscal year, the things a person would recognise on a settings
 * page. These three are state the interface keeps about itself, and nobody edits `hasVisited`.
 * Separate tables keep each row's meaning readable, which matters more than saving a join nobody
 * is making.
 *
 * Every field is nullable/`undefined` on exactly the `AppSettings` tri-state convention — an unset
 * field means "never chosen" and falls back to `DEFAULT_UI_PREFERENCES`, so a user with no row at
 * all reads identically to a user whose row is all NULLs.
 */
export type UiPreferences = {
  id: number;
  /**
   * The chosen theme, or `undefined` for "never picked one" — which reads as `DEFAULT_STYLE`.
   */
  themeStyle: ThemeStyleId | undefined;
  /**
   * Whether this account has reached the dashboard at least once, which is what stops the landing
   * page (TICKET-PUB-01) showing itself again at `/`.
   */
  hasVisited: boolean | undefined;
  /**
   * Whether this account has been told where its data lives and who is responsible for backing it
   * up (TICKET-PUB-04). A separate flag from `hasVisited`, deliberately: that one is set on the
   * very first visit, long before this reminder has anything to say — it waits for an account that
   * actually holds transactions. One flag would mean the reminder was dismissed by somebody who
   * never saw it.
   */
  backupReminderDismissed: boolean | undefined;
};
