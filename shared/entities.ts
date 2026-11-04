/**
 * The data model both workspaces read (TICKET-SRV-02); the Angular side reaches it through
 * `core/data-access/entities.ts`. Two rules, asserted by `server/src/shared-module.spec.ts`:
 * - **It imports nothing**, so supporting unions are declared here and re-exported by their owners.
 * - **Types only** — runtime values live in `shared/seed-data.ts`.
 *
 * Singleton settings rows declare optional fields as `field: T | undefined`, not `field?:`, because
 * ngrx `withState` keeps optionality on the accessor itself. `undefined` means "never chosen".
 */

// Supporting unions, re-exported by their home modules (see the rule above).
export type AccentColorId = 'amber' | 'sky' | 'violet' | 'rose' | 'teal' | 'lime';
export type CurrencySymbolPosition = 'before' | 'after';
export type SavingBasis = 'net-cash-flow' | 'savings-transfers';
export type FeatureConfig = { dim: number; charNgramMin: number; charNgramMax: number };

/** A person sharing a `joint` account, and the IBAN(s) they pay in from (TICKET-ACC-03). */
export type JointOwner = { name: string; ibans: string[]; share?: number };

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
  /** My share of a joint account, in `[0, 1]`; `undefined` means `1` (TICKET-ACC-02). */
  ownershipShare?: number;
  coOwners?: JointOwner[];
  /** `undefined` sorts after every account that has one. */
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
  /** Set once the user picks the category by hand — rules must never overwrite it (FR-CAT-3). */
  categoryManual?: boolean;
  transferId?: number;
  importBatchId?: number;
  fingerprint: string;
  notes?: string;
  createdAt: string;
  /** The original CSV row; `rawLine` is the fallback for imports before `rawRow` existed (TICKET-TXN-06). */
  rawLine?: string;
  rawRow?: Record<string, string>;
  /**
   * Manual reweighting (TICKET-TXN-03): `personal` counts 100%, `notMine` 0%, `shared` by
   * `jointAccountId`'s `ownershipShare`. Mutually exclusive with `transferId`.
   */
  attributionOverride?: {
    mode: 'personal' | 'shared' | 'notMine';
    jointAccountId?: number;
    reimbursementTransferId?: number;
  };
  /** Out of income/expense stats but still in balance (TICKET-TXN-04). Never touched by rules. */
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

export type TransferSettings = {
  id?: number;
  matchWindowDays: number;
  autoLinkMediumConfidence: boolean;
};

export type Category = {
  id?: number;
  name: string;
  /** `neutral` counts toward balance but not income/expense (TICKET-CAT-02). */
  kind: 'expense' | 'income' | 'neutral';
  group?: string;
  color: string;
  icon: string;
  archived: boolean;
  isSystem: boolean;
  sortOrder?: number;
  /** ISO dates the category applied between; independent of `archived` (TICKET-CAT-10/11). */
  activeFrom?: string;
  activeUntil?: string;
};

export type RuleCondition = {
  field: 'description' | 'counterpartyName' | 'counterpartyIban' | 'amount' | 'accountId';
  operator: 'contains' | 'equals' | 'regex' | '>' | '<' | 'between';
  value: string | number | [number, number];
};

export type RuleAction = { setCategoryId: number };

export type Rule = {
  id?: number;
  name: string;
  priority: number;
  enabled: boolean;
  continueOnMatch: boolean;
  /** Absent on old rules, treated as `'all'` (FR-CAT-2). */
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
  /** The CSV's own account IBAN, used to detect which account a file belongs to. */
  ownIban?: string;
  balance?: string;
};

export type SignConvention = 'as-is' | 'debit-negative' | 'credit-negative';
export type DateFormat = 'DD/MM/YYYY' | 'YYYY-MM-DD' | 'MM/DD/YYYY';
export type CsvEncoding = 'utf-8' | 'windows-1252';

export type MappingProfile = {
  id?: number;
  name: string;
  bankPreset?: string;
  /** Only set on bank templates, to auto-detect them from an uploaded CSV. */
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

export type CategoryComparisonSettings = { id?: number; excludedCategoryIds: number[] };

/** Matches `dashboard-overview.component.html`'s rows 1:1 (TICKET-STAT-14). */
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

export type DashboardLayoutSettings = {
  id?: number;
  rowOrder: DashboardRowId[];
  hiddenRowIds: DashboardRowId[];
};

export type ImportBatch = {
  id?: number;
  accountId: number;
  fileName: string;
  mappingProfileId?: number;
  importedAt: string;
  rowsRead: number;
  rowsAdded: number;
  /** Known rows **skipped**; `rowsRead = rowsAdded + rowsDuplicate`. */
  rowsDuplicate: number;
  /** Known rows the user chose to add anyway (TICKET-IMP-14); `undefined` reads as zero. */
  rowsDuplicateImported?: number;
  dateFrom: string;
  dateTo: string;
};

/**
 * A user's correction to a detected recurring payment (TICKET-REC-11). Anchored on a transaction
 * id, not the series key, because the key moves when the median amount changes.
 */
export type RecurringOverride = {
  id?: number;
  kind: 'dismissed' | 'merged';
  anchorTransactionId: number;
  /** For `merged` only: a transaction in the series this one is folded into. */
  mergedIntoTransactionId?: number;
  createdAt: string;
};

export type CategoryModelArtifact = {
  id: 1;
  modelTopology: ArrayBuffer;
  weightSpecs: ArrayBuffer;
  weightData: ArrayBuffer;
  categoryIdByIndex: number[];
  featureConfig: FeatureConfig;
  /** Flips the model `stale` once categories change (ML-07). */
  taxonomySignature: string;
  metrics: { accuracy: number; trainedSampleCount: number; epochsRun?: number };
  trainedAt: string;
  /** `MODEL_SCHEMA_VERSION`, not the database schema version. */
  schemaVersion: number;
};

/** Own table so it persists before any model exists (ML-17). `null` = all history. */
export type CategoryModelSettings = { id?: number; trainingWindowYears: number | null };

/** Portable settings; the interface's own state lives in `UiPreferences` (TICKET-SRV-10). */
export type AppSettings = {
  id: number;
  /** Only applied under the Default Light/Dark themes (TICKET-SET-02). */
  primaryColor: AccentColorId | undefined;
  currencySymbol: string | undefined;
  currencySymbolPosition: CurrencySymbolPosition | undefined;
  /** BCP 47 tag; `undefined` falls back to `DEFAULT_LOCALE` (TICKET-SET-04). */
  locale: string | undefined;
  /** An exclusion list so new income categories count by default (TICKET-INC-03). */
  excludedIncomeCategoryIds: number[] | undefined;
  careerStartDate: string | undefined;
  /** Annual lump-sum income categories spread across their year (TICKET-INC-04). */
  smoothedBonusCategoryIds: number[] | undefined;
  grossColor: AccentColorId | undefined;
  /** Where a recorded bonus is taken off; `undefined` splits it pro rata (TICKET-INC-19). */
  mainIncomeCategoryId: number | undefined;
  /** Nothing writes this since TICKET-INC-23; kept because dropping it needs a migration. */
  seenGuideSlugs: string[] | undefined;
  heatmapExcludedCategoryIds: number[] | undefined;
  privacyMode: boolean | undefined;
  /** 1–12; `undefined` means January (TICKET-SET-09). */
  fiscalYearStartMonth: number | undefined;
  /** Range-expression text, not resolved dates, so `now-30d` stays relative (TICKET-STAT-40). */
  recentRanges: RecentRange[] | undefined;
};

export type RecentRange = { fromExpr: string; toExpr: string };

/** One month's manual salary facts (TICKET-INC-10). A row with neither amount is deleted. */
export type SalaryMetadata = {
  id?: number;
  /** `YYYY-MM`, unique. */
  yearMonth: string;
  grossWage?: number;
  /** The bonus part of this month's deposit, subtracted from net before comparing to gross. */
  bonus?: number;
  note?: string;
};

export type SavingsGoal = {
  id?: number;
  name: string;
  targetAmount: number;
  /** Goals are funded top-down, so this drives every ETA (FUT-05). */
  sortOrder?: number;
  targetDate?: string;
  note?: string;
  archived: boolean;
  createdAt: string;
};

export type ForecastMode = 'when-affordable' | 'required-rate';

export type ForecastSettings = {
  id: 1;
  lookbackMonths: number;
  basis: SavingBasis;
  safetyNetAmount: number;
  mode?: ForecastMode;
  /** `undefined`/empty = every account (FUT-08). */
  scopeAccountIds?: number[];
};

/** Display label only — must never branch the amortization math (TICKET-LOAN-01). */
export type LoanType = 'mortgage' | 'auto' | 'personal' | 'student' | 'other';

export type Loan = {
  id?: number;
  name: string;
  loanType: LoanType;
  principal: number;
  /** Annual rate in percent (3.5 = 3.5%). */
  interestRate: number;
  termMonths: number;
  startDate: string;
  /** The expense category whose transactions count as payments. */
  categoryId: number;
  archived: boolean;
  sortOrder: number;
};

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

/** Per-account interface state that used to live in `localStorage` (TICKET-SRV-10). */
export type UiPreferences = {
  id: number;
  themeStyle: ThemeStyleId | undefined;
  hasVisited: boolean | undefined;
  /** Separate from `hasVisited`: the reminder waits for an account that holds transactions. */
  backupReminderDismissed: boolean | undefined;
};
