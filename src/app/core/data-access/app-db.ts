import Dexie, { type Table } from 'dexie';
// Deep import (not the barrel) keeps this framework-agnostic Dexie module free of the Angular/ngrx
// code the shared/utils barrel also re-exports.
import { computeFingerprint } from '@/shared/utils/fingerprint';
// Deep import (not the `core/ml` barrel) for the same reason as above — the barrel's
// rule-proposal-mining module pulls in an `@Injectable` service transitively.
import type { FeatureConfig } from '@/core/ml/model-config';
// Deep import (not the `core/theme` barrel) for the same reason as above — the barrel's
// `ThemeService` pulls in an `@Injectable` service transitively.
import type { AccentColorId } from '@/core/theme/accent-colors';
import type { CurrencySymbolPosition } from '@/shared/utils/format-settings';
// Deep import (not the `core/stats` barrel) for the same reason as above. Type-only, so this is
// erased at build time and data-access keeps no runtime dependency on stats (TICKET-FUT-02).
import type { SavingBasis } from '@/core/stats/saving-velocity';

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

export const DEFAULT_TRANSFER_SETTINGS: TransferSettings = {
  id: 1,
  matchWindowDays: 3,
  autoLinkMediumConfidence: true,
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
   *
   * Both are **non-indexed**, so adding them needed no `.version(n + 1)` block — `.stores()`
   * declares indexes, not fields (the `appSettings` precedent in the data-model skill).
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

/** How debit/credit-column signs map onto the stored (negative-expense) amount. */
export const SIGN_CONVENTIONS = ['as-is', 'debit-negative', 'credit-negative'] as const;
export type SignConvention = (typeof SIGN_CONVENTIONS)[number];

/** Date formats the CSV parser understands (see `parseDate` in `core/import/csv-row-mapper.ts`). */
export const SUPPORTED_DATE_FORMATS = ['DD/MM/YYYY', 'YYYY-MM-DD', 'MM/DD/YYYY'] as const;
export type DateFormat = (typeof SUPPORTED_DATE_FORMATS)[number];

/** Text encodings offered when decoding an uploaded CSV file. */
export const SUPPORTED_ENCODINGS = ['utf-8', 'windows-1252'] as const;
export type CsvEncoding = (typeof SUPPORTED_ENCODINGS)[number];

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

/**
 * Best-effort bank CSV export signatures, reconstructed from general knowledge of each
 * bank's export format — NOT verified against a real sample file. Seeded into
 * `mappingProfiles` on first run so users get a starting point; correct or delete them
 * from the mapping profiles UI once a real export is available.
 */
const DEFAULT_MAPPING_PROFILE_TEMPLATES: MappingProfile[] = [
  {
    name: 'KBC',
    bankPreset: 'kbc',
    headerSignature: [
      'Rekeningnummer',
      'Boekingsdatum',
      'Bedrag',
      'Munt',
      'Omschrijving',
      'Naam tegenpartij',
      'Rekeningnummer tegenpartij',
    ],
    columns: {
      date: 'Boekingsdatum',
      amount: 'Bedrag',
      description: 'Omschrijving',
      counterpartyName: 'Naam tegenpartij',
      counterpartyIban: 'Rekeningnummer tegenpartij',
      ownIban: 'Rekeningnummer',
      balance: 'Saldo',
    },
    delimiter: ';',
    decimalSeparator: ',',
    dateFormat: 'DD/MM/YYYY',
    encoding: 'windows-1252',
    headerRows: 1,
    signConvention: 'as-is',
  },
  {
    name: 'Belfius',
    bankPreset: 'belfius',
    headerSignature: [
      'Rekening',
      'Boekingsdatum',
      'Bedrag',
      'Munt',
      'Omschrijving',
      'Naam tegenpartij',
      'Rekening tegenpartij',
    ],
    columns: {
      date: 'Boekingsdatum',
      amount: 'Bedrag',
      description: 'Omschrijving',
      counterpartyName: 'Naam tegenpartij',
      counterpartyIban: 'Rekening tegenpartij',
      ownIban: 'Rekening',
      balance: 'Saldo',
    },
    delimiter: ';',
    decimalSeparator: ',',
    dateFormat: 'DD/MM/YYYY',
    encoding: 'windows-1252',
    headerRows: 1,
    signConvention: 'as-is',
  },
];

/** Name of the seeded `neutral`-kind system category (TICKET-CAT-02), used to find it on both first-run seeding and the `.version(6)` backfill. */
export const PARTNER_CONTRIBUTION_CATEGORY_NAME = 'Partner contribution';

/** True when no seeded "Partner contribution" category exists yet — keeps the `.version(6)` upgrade a no-op on re-run or for a user who already has one. */
export const needsPartnerContributionSeed = (
  categories: Pick<Category, 'isSystem' | 'name'>[],
): boolean =>
  !categories.some(
    (category) => category.isSystem && category.name === PARTNER_CONTRIBUTION_CATEGORY_NAME,
  );

/**
 * Sensible out-of-the-box categories (FR-CAT-1). Seeded into `categories` on first run;
 * users can rename/archive them once the category manager ships in a later story.
 */
const DEFAULT_CATEGORIES: Category[] = [
  {
    name: 'Groceries',
    kind: 'expense',
    color: '#4ADE80',
    icon: 'shopping-cart',
    archived: false,
    isSystem: true,
  },
  {
    name: 'Shopping',
    kind: 'expense',
    color: '#F472B6',
    icon: 'shopping-bag',
    archived: false,
    isSystem: true,
  },
  {
    name: 'Subscriptions',
    kind: 'expense',
    color: '#A78BFA',
    icon: 'repeat',
    archived: false,
    isSystem: true,
  },
  {
    name: 'Housing',
    kind: 'expense',
    color: '#FB923C',
    icon: 'home',
    archived: false,
    isSystem: true,
  },
  {
    name: 'Transport',
    kind: 'expense',
    color: '#60A5FA',
    icon: 'car',
    archived: false,
    isSystem: true,
  },
  {
    name: 'Eating Out',
    kind: 'expense',
    color: '#FBBF24',
    icon: 'tools-kitchen',
    archived: false,
    isSystem: true,
  },
  {
    name: 'Utilities',
    kind: 'expense',
    color: '#38BDF8',
    icon: 'bolt',
    archived: false,
    isSystem: true,
  },
  {
    name: 'Health',
    kind: 'expense',
    color: '#F87171',
    icon: 'heartbeat',
    archived: false,
    isSystem: true,
  },
  {
    name: 'Salary',
    kind: 'income',
    group: 'Income',
    color: '#34D399',
    icon: 'cash',
    archived: false,
    isSystem: true,
  },
  {
    name: 'Other Income',
    kind: 'income',
    group: 'Income',
    color: '#2DD4BF',
    icon: 'coin',
    archived: false,
    isSystem: true,
  },
  {
    name: PARTNER_CONTRIBUTION_CATEGORY_NAME,
    kind: 'neutral',
    group: 'Contributions',
    color: '#94A3B8',
    icon: 'users',
    archived: false,
    isSystem: true,
  },
];

/** Singleton row (id always 1) of category ids the user has opted to exclude from the dashboard's category period comparison panel (TICKET-STAT-04 follow-up). Absent row / empty list = nothing excluded. */
export type CategoryComparisonSettings = {
  id?: number;
  excludedCategoryIds: number[];
};

export const DEFAULT_CATEGORY_COMPARISON_SETTINGS: CategoryComparisonSettings = {
  id: 1,
  excludedCategoryIds: [],
};

/** The eight Dashboard content rows a user can reorder/hide (TICKET-STAT-14) — matches `dashboard-overview.component.html`'s row structure 1:1. */
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

/**
 * A row added by a later ticket goes on the **end** (TICKET-STAT-29's `spending-heatmap` is the
 * first to do so): `resolveDashboardRowOrder` appends ids an existing saved layout doesn't know
 * about, so appending here is what makes a new row arrive in the same place for a new user and a
 * returning one, instead of shuffling a layout someone already arranged.
 */
export const DEFAULT_DASHBOARD_ROW_ORDER: DashboardRowId[] = [
  'stats',
  'weekday-weekend',
  'category-breakdown',
  'category-comparison',
  'trend-chart',
  'top-transactions',
  'action-queue',
  'account-balance',
  'spending-heatmap',
];

/** Singleton row (id always 1) persisting the user's Dashboard row order and hidden rows (TICKET-STAT-14). */
export type DashboardLayoutSettings = {
  id?: number;
  rowOrder: DashboardRowId[];
  hiddenRowIds: DashboardRowId[];
};

export const DEFAULT_DASHBOARD_LAYOUT_SETTINGS: DashboardLayoutSettings = {
  id: 1,
  rowOrder: DEFAULT_DASHBOARD_ROW_ORDER,
  hiddenRowIds: [],
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
   * were knowingly re-imported would be indistinguishable from 40 genuinely new ones. Optional and
   * non-indexed, so it needs no new `.version()` block.
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
 * change moves the median. A transaction id is a Dexie primary key: it does not move. A stored
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
  /** `MODEL_SCHEMA_VERSION` at training time, distinct from this table's own Dexie schema version. */
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

export const DEFAULT_CATEGORY_MODEL_SETTINGS: CategoryModelSettings = {
  id: 1,
  trainingWindowYears: null,
};

/**
 * Singleton row (id always 1) for app-wide settings that are genuinely portable/exportable data
 * (currency, locale, privacy default, etc.) — as opposed to `ThemeService`'s per-browser
 * appearance preference, which stays `localStorage`-only by design (TICKET-SET-05). Starts empty;
 * SET-02/SET-03/SET-04/PRIV-01 each add their own additive optional field on top later.
 */
export type AppSettings = {
  id: number;
  /**
   * Additive field (TICKET-SET-02) — a fixed palette key, not a freeform hex. `undefined` falls
   * back to each theme's own baked-in accent. Only applied while a Default Light/Dark theme is
   * active (`DEFAULT_THEME_STYLE_IDS` in `core/theme/theme-styles.ts`); every other theme keeps
   * its own accent regardless of this field. Required-but-possibly-`undefined` rather than
   * optional (`primaryColor?:`) — `@ngrx/signals`' `withState` preserves property optionality
   * onto the generated store accessor, which would make `store.primaryColor` itself possibly
   * `undefined` instead of a signal whose *value* can be `undefined` (same fix as `AppSettings.id`
   * needed in TICKET-SET-05).
   */
  primaryColor: AccentColorId | undefined;
  /**
   * Additive fields (TICKET-SET-03) — a display-only symbol overlay, not an ISO 4217 code: this
   * app doesn't do currency conversion, so rather than a fixed code list (which would imply real
   * multi-currency accounting), the user instead picks/types the symbol they want shown and which
   * side of the number it renders on. `undefined` falls back to `DEFAULT_CURRENCY_SYMBOL`/
   * `DEFAULT_CURRENCY_SYMBOL_POSITION` (`'€'`/`'before'`) — today's exact hardcoded behavior — so
   * nobody's amounts change until they opt in. Required-but-possibly-`undefined` rather than
   * optional, same `withState` accessor-optionality pitfall as `primaryColor` above.
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
   * Required-but-possibly-`undefined`, same `withState` accessor-optionality pitfall as
   * `primaryColor`/`currencySymbol` above.
   */
  locale: string | undefined;
  /**
   * Additive field (TICKET-INC-03) — income categories the user has opted *out* of "my income
   * growth" (FR-INC-3). Stored as an exclusion list rather than the selection itself, mirroring
   * `CategoryComparisonSettings.excludedCategoryIds`, so a newly created income category is
   * included by default without any sync effect keeping a stored selection in step with the
   * category list. `undefined`/empty = every income category counts. Lives here rather than in its
   * own singleton table because it's user-portable preference data and needs no schema version of
   * its own — `.stores()` declares indexes, not fields (same as `Category.sortOrder`).
   * Required-but-possibly-`undefined`, same `withState` accessor-optionality pitfall as
   * `primaryColor`/`currencySymbol`/`locale` above.
   */
  excludedIncomeCategoryIds: number[] | undefined;
  /**
   * Additive field (TICKET-INC-12) — the date the user's working life started (ISO `YYYY-MM-DD`),
   * which is not the same thing as where their imported history happens to begin (FR-INC-12). Only
   * the `/income` page reads it, where it clamps the span every panel covers so student-era income
   * or a back-imported opening balance stops distorting the growth story; `undefined` = today's
   * behaviour, the full data history. Same "additive optional field, no version bump" reasoning as
   * `excludedIncomeCategoryIds` above — `.stores()` declares indexes, not fields.
   * Required-but-possibly-`undefined`, same `withState` accessor-optionality pitfall as the fields
   * above.
   */
  careerStartDate: string | undefined;
  /**
   * Additive field (TICKET-INC-04) — income categories the user has marked as an *annual lump sum*
   * (13th month, vacation pay, a holiday bonus): real income, but deposited once a year, so the
   * `/income` trend spreads each year's total across that year's months instead of drawing one
   * spike (FR-INC-4). Unlike `excludedIncomeCategoryIds` this is an **inclusion** list defaulting
   * to empty — "count this category" is a sensible default for a new income category, "smooth this
   * category" never is. Same "additive optional field, no version bump" reasoning as the two fields
   * above. Required-but-possibly-`undefined`, same `withState` accessor-optionality pitfall.
   */
  smoothedBonusCategoryIds: number[] | undefined;
  /**
   * Additive field (TICKET-SET-08) — the preset the `/income` page's *gross pay* series take, so
   * gross and net are told apart by a colour the user picked rather than by whichever categorical
   * slot the theme handed out. Reuses `AccentColorId` rather than minting a second colour
   * vocabulary (and rather than a freeform hex, which could be invisible against the plot);
   * `undefined` falls back to the active theme's categorical palette, i.e. today's behaviour.
   * Unlike `primaryColor` it applies under *every* theme style, because it colours canvas rather
   * than daisyUI tokens. Same "additive optional field, no version bump" reasoning as the three
   * fields above. Required-but-possibly-`undefined`, same `withState` accessor-optionality pitfall.
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
   * same pruning `smoothedBonusCategoryIds` gets. Same "additive optional field, no version bump"
   * reasoning as the fields above. Required-but-possibly-`undefined`, same `withState`
   * accessor-optionality pitfall.
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
   * Same "additive optional field, no version bump" reasoning as the fields above.
   * Required-but-possibly-`undefined`, same `withState` accessor-optionality pitfall.
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
   * convention for a list of category ids is a field on this row (see `excludedIncomeCategoryIds`)
   * — `.stores()` declares indexes, not fields, so no version bump.
   * Required-but-possibly-`undefined`, same `withState` accessor-optionality pitfall as the fields
   * above.
   */
  heatmapExcludedCategoryIds: number[] | undefined;
  /**
   * Additive field (TICKET-PRIV-01) — whether privacy mode is on, blurring every figure on the
   * Dashboard so the page survives a screen-share. `undefined` means off, which is what an unset
   * field already means; `AppSettingsStore.privacyModeEnabled` resolves the `?? false` once so no
   * consumer has to. Stored here rather than in `localStorage` alongside `ThemeService`'s appearance
   * preference because it is a portable/exportable user preference, not a per-browser one.
   *
   * Same "additive optional field, no version bump" reasoning as the fields above.
   * Required-but-possibly-`undefined`, same `withState` accessor-optionality pitfall.
   */
  privacyMode: boolean | undefined;
  /**
   * Additive field (TICKET-SET-09) — the calendar month (1–12) a fiscal year begins in, so "previous
   * fiscal quarter"/"previous fiscal year" mean the user's year rather than the calendar's.
   * `undefined` means January, i.e. today's exact calendar-year behaviour — nobody's quarter/year
   * presets change until they opt in. Nothing reads this yet; it exists so STAT-37's two fiscal
   * quick ranges have a boundary to resolve against.
   *
   * Same "additive optional field, no version bump" reasoning as the fields above.
   * Required-but-possibly-`undefined`, same `withState` accessor-optionality pitfall.
   */
  fiscalYearStartMonth: number | undefined;
  /**
   * Additive field (TICKET-STAT-40) — the last ten date ranges applied to any picker (Apply in the
   * absolute panel, or a quick range clicked; prev/next stepping never records), most-recent-first,
   * global rather than per page. Holds canonical `range-expression` text (STAT-35) — an ISO date, or
   * `now-30d`-style relative text where the applied range came from one — **not** resolved dates, so
   * a saved `now-30d` still means "the last 30 days" on read rather than freezing into the window it
   * happened to resolve to when saved. `undefined`/empty = nothing applied yet.
   *
   * Same "additive optional field, no version bump" reasoning as the fields above.
   * Required-but-possibly-`undefined`, same `withState` accessor-optionality pitfall.
   */
  recentRanges: RecentRange[] | undefined;
};

/** One entry in `AppSettings.recentRanges` (TICKET-STAT-40) — see that field's doc comment. */
export type RecentRange = { fromExpr: string; toExpr: string };

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 1,
  primaryColor: undefined,
  // undefined, not a concrete '€'/'before' — same tri-state-via-undefined pattern as
  // `primaryColor` above: keeps a fresh row's read-merge-put free of extra concrete fields (which
  // would otherwise leak into every other setter's write), with the real default applied by each
  // reader via `?? DEFAULT_CURRENCY_SYMBOL`/`?? DEFAULT_CURRENCY_SYMBOL_POSITION`.
  currencySymbol: undefined,
  currencySymbolPosition: undefined,
  locale: undefined,
  excludedIncomeCategoryIds: undefined,
  careerStartDate: undefined,
  smoothedBonusCategoryIds: undefined,
  grossColor: undefined,
  mainIncomeCategoryId: undefined,
  seenGuideSlugs: undefined,
  heatmapExcludedCategoryIds: undefined,
  privacyMode: undefined,
  fiscalYearStartMonth: undefined,
  recentRanges: undefined,
};

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
 *
 * Declared here rather than in `core/stats` because FUT-09's aggregate only exists after this
 * ticket, and the field has to be part of `.version(14)`'s row shape from the start so that adding
 * the second mode needs no schema change (see TICKET-FUT-02's Notes).
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
   * Declared here so the row has one shape; non-indexed, so FUT-09 needs no version bump.
   */
  mode?: ForecastMode;
  /**
   * Accounts the forecast is allowed to consider (FUT-08). `undefined` or empty = every account,
   * which is the behaviour of every ticket before FUT-08 — declared here so the row has one
   * shape, since a non-indexed field needs no version bump either way (the CAT-10 precedent).
   */
  scopeAccountIds?: number[];
};

export const DEFAULT_FORECAST_SETTINGS: ForecastSettings = {
  id: 1,
  lookbackMonths: 6,
  basis: 'net-cash-flow',
  safetyNetAmount: 0,
  mode: 'when-affordable',
  // Declared as `undefined` rather than omitted, the `DEFAULT_APP_SETTINGS` convention: this object
  // seeds `ForecastSettingsStore`'s `withState`, and ngrx derives its signal members from the seed's
  // *keys* — an omitted key means no signal at all, so a later `patchState` would be unreadable.
  scopeAccountIds: undefined,
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
 * form-level invariant (LOAN-03), not a schema constraint, since Dexie has no FK constraints.
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

class AppDb extends Dexie {
  accounts!: Table<Account, number>;
  transactions!: Table<Transaction, number>;
  transfers!: Table<Transfer, number>;
  categories!: Table<Category, number>;
  rules!: Table<Rule, number>;
  mappingProfiles!: Table<MappingProfile, number>;
  importBatches!: Table<ImportBatch, number>;
  transferSettings!: Table<TransferSettings, number>;
  categoryModel!: Table<CategoryModelArtifact, 1>;
  categoryComparisonSettings!: Table<CategoryComparisonSettings, number>;
  dashboardLayoutSettings!: Table<DashboardLayoutSettings, number>;
  categoryModelSettings!: Table<CategoryModelSettings, number>;
  appSettings!: Table<AppSettings, number>;
  salaryMetadata!: Table<SalaryMetadata, number>;
  savingsGoals!: Table<SavingsGoal, number>;
  forecastSettings!: Table<ForecastSettings, number>;
  loans!: Table<Loan, number>;
  recurringOverrides!: Table<RecurringOverride, number>;

  constructor() {
    super('money-mosaic');

    this.version(1).stores({
      accounts: '++id, name, type, archived',
      transactions: '++id, accountId, bookingDate, categoryId, transferId, fingerprint',
      transfers: '++id, fromTransactionId, toTransactionId',
      categories: '++id, name, kind, archived',
      rules: '++id, priority, enabled',
      mappingProfiles: '++id, name, bankPreset, defaultAccountId',
      importBatches: '++id, accountId, importedAt',
    });

    this.version(2)
      .stores({
        accounts: '++id, name, type, archived',
        transactions: '++id, accountId, bookingDate, categoryId, transferId, fingerprint',
        transfers: '++id, fromTransactionId, toTransactionId',
        categories: '++id, name, kind, archived',
        rules: '++id, priority, enabled',
        mappingProfiles: '++id, name, bankPreset, defaultAccountId',
        importBatches: '++id, accountId, importedAt',
        transferSettings: 'id',
      })
      .upgrade(async (tx) => {
        await tx.table('transferSettings').add(DEFAULT_TRANSFER_SETTINGS);
      });

    // Backfills `ownIban` onto already-seeded KBC/Belfius profiles so multi-file import
    // auto-detection works without requiring users to delete and re-seed their mapping profiles.
    this.version(3)
      .stores({
        accounts: '++id, name, type, archived',
        transactions: '++id, accountId, bookingDate, categoryId, transferId, fingerprint',
        transfers: '++id, fromTransactionId, toTransactionId',
        categories: '++id, name, kind, archived',
        rules: '++id, priority, enabled',
        mappingProfiles: '++id, name, bankPreset, defaultAccountId',
        importBatches: '++id, accountId, importedAt',
        transferSettings: 'id',
      })
      .upgrade(async (tx) => {
        const ownIbanHeaderByPreset: Record<string, string> = {
          kbc: 'Rekeningnummer',
          belfius: 'Rekening',
        };
        const profiles = await tx.table<MappingProfile, number>('mappingProfiles').toArray();
        for (const profile of profiles) {
          const ownIbanHeader = profile.bankPreset && ownIbanHeaderByPreset[profile.bankPreset];
          if (ownIbanHeader && !profile.columns?.ownIban) {
            await tx
              .table('mappingProfiles')
              .update(profile.id!, { columns: { ...profile.columns, ownIban: ownIbanHeader } });
          }
        }
      });

    // Rewrites stored transaction fingerprints into the new format: 64-bit base hash (CR-1.3) plus a
    // `|<occurrence>` suffix per identical base within an account (CR-1.2). Recomputed from the row's
    // own fields — the same inputs `commitImport` uses — so future imports of already-imported data
    // still dedupe instead of silently duplicating.
    this.version(4)
      .stores({
        accounts: '++id, name, type, archived',
        transactions: '++id, accountId, bookingDate, categoryId, transferId, fingerprint',
        transfers: '++id, fromTransactionId, toTransactionId',
        categories: '++id, name, kind, archived',
        rules: '++id, priority, enabled',
        mappingProfiles: '++id, name, bankPreset, defaultAccountId',
        importBatches: '++id, accountId, importedAt',
        transferSettings: 'id',
      })
      .upgrade(async (tx) => {
        const table = tx.table<Transaction, number>('transactions');
        const transactions = await table.toArray();
        // Stable order so a base fingerprint's occurrence suffixes are assigned deterministically.
        transactions.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
        const occurrenceByBase = new Map<string, number>();
        for (const transaction of transactions) {
          const base = computeFingerprint({
            accountId: transaction.accountId,
            bookingDate: transaction.bookingDate,
            amount: transaction.amount,
            description: transaction.rawDescription,
            counterpartyIban: transaction.counterpartyIban,
          });
          const occurrence = (occurrenceByBase.get(base) ?? 0) + 1;
          occurrenceByBase.set(base, occurrence);
          await table.update(transaction.id!, { fingerprint: `${base}|${occurrence}` });
        }
      });

    // Backfills the new `conditionMatch` combinator onto existing rules so they keep their
    // original AND semantics (TICKET-CAT-01). No index change — `conditionMatch` isn't queried.
    this.version(5)
      .stores({
        accounts: '++id, name, type, archived',
        transactions: '++id, accountId, bookingDate, categoryId, transferId, fingerprint',
        transfers: '++id, fromTransactionId, toTransactionId',
        categories: '++id, name, kind, archived',
        rules: '++id, priority, enabled',
        mappingProfiles: '++id, name, bankPreset, defaultAccountId',
        importBatches: '++id, accountId, importedAt',
        transferSettings: 'id',
      })
      .upgrade(async (tx) => {
        await tx
          .table<Rule, number>('rules')
          .toCollection()
          .modify((rule) => {
            rule.conditionMatch ??= 'all';
          });
      });

    // Backfills the seeded "Partner contribution" (`neutral`-kind) system category for existing
    // users, since `populate` only runs for a fresh DB (TICKET-CAT-02). Idempotent: checks for an
    // existing system category with the same name before adding, so re-running it (or a user who
    // already has one) never duplicates it. No index change — `kind` widening an already-indexed
    // field needs no migration of stored values.
    this.version(6)
      .stores({
        accounts: '++id, name, type, archived',
        transactions: '++id, accountId, bookingDate, categoryId, transferId, fingerprint',
        transfers: '++id, fromTransactionId, toTransactionId',
        categories: '++id, name, kind, archived',
        rules: '++id, priority, enabled',
        mappingProfiles: '++id, name, bankPreset, defaultAccountId',
        importBatches: '++id, accountId, importedAt',
        transferSettings: 'id',
      })
      .upgrade(async (tx) => {
        const categories = tx.table<Category, number>('categories');
        const existing = await categories.toArray();
        if (needsPartnerContributionSeed(existing)) {
          await categories.add({
            name: PARTNER_CONTRIBUTION_CATEGORY_NAME,
            kind: 'neutral',
            group: 'Contributions',
            color: '#94A3B8',
            icon: 'users',
            archived: false,
            isSystem: true,
          });
        }
      });

    // Adds the `categoryModel` singleton-row table for the trained auto-categoriser (ML-04). Purely
    // additive — a brand-new, empty table — so no `.upgrade()` is needed.
    this.version(7).stores({
      accounts: '++id, name, type, archived',
      transactions: '++id, accountId, bookingDate, categoryId, transferId, fingerprint',
      transfers: '++id, fromTransactionId, toTransactionId',
      categories: '++id, name, kind, archived',
      rules: '++id, priority, enabled',
      mappingProfiles: '++id, name, bankPreset, defaultAccountId',
      importBatches: '++id, accountId, importedAt',
      transferSettings: 'id',
      categoryModel: 'id',
    });

    // Adds the `categoryComparisonSettings` singleton-row table for the category period comparison
    // panel's optional category exclusion list (TICKET-STAT-04 follow-up). Purely additive — a
    // brand-new, empty table — so no `.upgrade()` is needed; the repository's `get()` falls back to
    // `DEFAULT_CATEGORY_COMPARISON_SETTINGS` when the row hasn't been written yet, same as `categoryModel`.
    this.version(8).stores({
      accounts: '++id, name, type, archived',
      transactions: '++id, accountId, bookingDate, categoryId, transferId, fingerprint',
      transfers: '++id, fromTransactionId, toTransactionId',
      categories: '++id, name, kind, archived',
      rules: '++id, priority, enabled',
      mappingProfiles: '++id, name, bankPreset, defaultAccountId',
      importBatches: '++id, accountId, importedAt',
      transferSettings: 'id',
      categoryModel: 'id',
      categoryComparisonSettings: 'id',
    });

    // Adds the `dashboardLayoutSettings` singleton-row table for the Dashboard's customizable
    // row order/visibility (TICKET-STAT-14). Purely additive — a brand-new, empty table — so no
    // `.upgrade()` is needed; the repository's `get()` falls back to
    // `DEFAULT_DASHBOARD_LAYOUT_SETTINGS` when the row hasn't been written yet, same as `categoryModel`.
    this.version(9).stores({
      accounts: '++id, name, type, archived',
      transactions: '++id, accountId, bookingDate, categoryId, transferId, fingerprint',
      transfers: '++id, fromTransactionId, toTransactionId',
      categories: '++id, name, kind, archived',
      rules: '++id, priority, enabled',
      mappingProfiles: '++id, name, bankPreset, defaultAccountId',
      importBatches: '++id, accountId, importedAt',
      transferSettings: 'id',
      categoryModel: 'id',
      categoryComparisonSettings: 'id',
      dashboardLayoutSettings: 'id',
    });

    // Adds the `categoryModelSettings` singleton-row table for the training-window preset
    // (TICKET-ML-17). Purely additive — a brand-new, empty table — so no `.upgrade()` is needed;
    // the repository's `getSettings()` falls back to `DEFAULT_CATEGORY_MODEL_SETTINGS` when the
    // row hasn't been written yet, same as `categoryComparisonSettings`/`dashboardLayoutSettings`.
    this.version(10).stores({
      accounts: '++id, name, type, archived',
      transactions: '++id, accountId, bookingDate, categoryId, transferId, fingerprint',
      transfers: '++id, fromTransactionId, toTransactionId',
      categories: '++id, name, kind, archived',
      rules: '++id, priority, enabled',
      mappingProfiles: '++id, name, bankPreset, defaultAccountId',
      importBatches: '++id, accountId, importedAt',
      transferSettings: 'id',
      categoryModel: 'id',
      categoryComparisonSettings: 'id',
      dashboardLayoutSettings: 'id',
      categoryModelSettings: 'id',
    });

    // Versions 1-10 above are shipped and must never be edited (Dexie replays every user's
    // upgrade chain from their current version forward). They predate the minimal-declaration
    // convention below and stay as full table-map copies for that reason alone.
    //
    // From .version(11) onward: declare only the tables that are new or have an index change.
    // Dexie carries forward the schema of every table you omit — you do not need to repeat it.

    // Indexes `importBatchId` (undo-import lookup) and the dotted keypath
    // `attributionOverride.reimbursementTransferId` (reimbursement-leg lookup) on `transactions` —
    // both were full-table filter scans (TICKET-PERF-03). Purely additive index changes on an
    // existing table; no `.upgrade()` needed, Dexie backfills indexes from existing row data.
    this.version(11).stores({
      transactions:
        '++id, accountId, bookingDate, categoryId, transferId, fingerprint, importBatchId, attributionOverride.reimbursementTransferId',
    });

    // Adds the `appSettings` singleton-row table for app-wide portable settings (currency, locale,
    // privacy default, etc.) — the shared foundation SET-02/SET-03/SET-04/PRIV-01 each add their own
    // field to (TICKET-SET-05). Purely additive — a brand-new, empty table — so no `.upgrade()` is
    // needed; the repository's `get()` falls back to `DEFAULT_APP_SETTINGS` when the row hasn't been
    // written yet, same as `categoryModel`/`categoryComparisonSettings`.
    this.version(12).stores({
      appSettings: 'id',
    });

    // Adds the `salaryMetadata` table — one manually-entered row per month for gross wage and an
    // embedded bonus (TICKET-INC-10). `&yearMonth` is a **unique** index: a second row for the same
    // month is never meaningful, so the constraint lives in the schema rather than in the
    // repository's `upsert`. Purely additive — a brand-new, empty table — so no `.upgrade()` is
    // needed, same as `appSettings` at v12.
    this.version(13).stores({
      salaryMetadata: '++id, &yearMonth',
    });

    // Adds the two tables v2.2's goals & forecast need (TICKET-FUT-02): `savingsGoals`, an entity
    // table indexed on `sortOrder` because that order *is* the funding order every ETA reads, and
    // `forecastSettings`, the usual `id: 1` singleton row. Purely additive — both are brand-new and
    // empty — so no `.upgrade()` is needed, same as `appSettings` at v12 and `salaryMetadata` at
    // v13. Only the non-indexed fields of `ForecastSettings` grow after this (`mode` for FUT-09,
    // `scopeAccountIds` for FUT-08), so neither of those tickets bumps the version again.
    this.version(14).stores({
      savingsGoals: '++id, sortOrder',
      forecastSettings: 'id',
    });

    // Adds the `loans` table for v1.7's loan tracker (TICKET-LOAN-01) — indexed on `categoryId`
    // (linked-category lookups), `loanType` (badge/filter display), and `archived` (active/archived
    // split), mirroring `savingsGoals`. Purely additive — a brand-new, empty table — so no
    // `.upgrade()` is needed, same as `savingsGoals`/`forecastSettings` at v14.
    this.version(15).stores({
      loans: '++id, categoryId, loanType, archived',
    });

    // Adds `recurringOverrides` for TICKET-REC-11's dismiss/merge corrections — indexed on
    // `anchorTransactionId`, which is how a stored override is matched back to a freshly detected
    // series, and on `kind` so the dismissals and the merges can be read apart. Purely additive — a
    // brand-new, empty table — so no `.upgrade()` is needed, same as `loans` at v15.
    this.version(16).stores({
      recurringOverrides: '++id, anchorTransactionId, kind',
    });

    this.on('populate', () => {
      this.mappingProfiles.bulkAdd(DEFAULT_MAPPING_PROFILE_TEMPLATES);
      this.categories.bulkAdd(DEFAULT_CATEGORIES);
      this.transferSettings.add(DEFAULT_TRANSFER_SETTINGS);
    });
  }
}

export const appDb = new AppDb();
