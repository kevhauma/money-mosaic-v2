/**
 * First-run seed rows and the defaults both workspaces must agree on (TICKET-SRV-02). Type-only
 * imports from `./entities.js` only, asserted by `server/src/shared-module.spec.ts`.
 */
import type {
  AppSettings,
  Category,
  CategoryComparisonSettings,
  CategoryModelSettings,
  CsvEncoding,
  DashboardLayoutSettings,
  DashboardRowId,
  DateFormat,
  ForecastSettings,
  MappingProfile,
  SignConvention,
  ThemeStyleId,
  TransferSettings,
  UiPreferences,
} from './entities.js';

/** Co-owner tagging finds this category by name, so the category form refuses to rename it. */
export const PARTNER_CONTRIBUTION_CATEGORY_NAME = 'Partner contribution';

const BELGIAN_CSV = {
  delimiter: ';',
  decimalSeparator: ',',
  dateFormat: 'DD/MM/YYYY',
  encoding: 'windows-1252',
  headerRows: 1,
  signConvention: 'as-is',
} as const;

/** Reconstructed from general knowledge, NOT verified against a real export. */
export const DEFAULT_MAPPING_PROFILE_TEMPLATES: MappingProfile[] = [
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
    ...BELGIAN_CSV,
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
    ...BELGIAN_CSV,
  },
];

const SEED = { archived: false, isSystem: true } as const;

/** Out-of-the-box categories (FR-CAT-1). */
export const DEFAULT_CATEGORIES: Category[] = [
  { name: 'Groceries', kind: 'expense', color: '#4ADE80', icon: 'shopping-cart', ...SEED },
  { name: 'Shopping', kind: 'expense', color: '#F472B6', icon: 'shopping-bag', ...SEED },
  { name: 'Subscriptions', kind: 'expense', color: '#A78BFA', icon: 'repeat', ...SEED },
  { name: 'Housing', kind: 'expense', color: '#FB923C', icon: 'home', ...SEED },
  { name: 'Transport', kind: 'expense', color: '#60A5FA', icon: 'car', ...SEED },
  { name: 'Eating Out', kind: 'expense', color: '#FBBF24', icon: 'tools-kitchen', ...SEED },
  { name: 'Utilities', kind: 'expense', color: '#38BDF8', icon: 'bolt', ...SEED },
  { name: 'Health', kind: 'expense', color: '#F87171', icon: 'heartbeat', ...SEED },
  { name: 'Salary', kind: 'income', group: 'Income', color: '#34D399', icon: 'cash', ...SEED },
  {
    name: 'Other Income',
    kind: 'income',
    group: 'Income',
    color: '#2DD4BF',
    icon: 'coin',
    ...SEED,
  },
  {
    name: PARTNER_CONTRIBUTION_CATEGORY_NAME,
    kind: 'neutral',
    group: 'Contributions',
    color: '#94A3B8',
    icon: 'users',
    ...SEED,
  },
];

/*
 * What an unwritten singleton row reads as — the server answers with these and merges a PATCH into
 * them (TICKET-SRV-03); the client's stores start from them. Keys that may be `undefined` are still
 * declared: ngrx `withState` derives its signals from the seed's keys.
 */

export const DEFAULT_TRANSFER_SETTINGS: TransferSettings = {
  id: 1,
  matchWindowDays: 3,
  autoLinkMediumConfidence: true,
};

export const DEFAULT_CATEGORY_COMPARISON_SETTINGS: CategoryComparisonSettings = {
  id: 1,
  excludedCategoryIds: [],
};

/** New rows go on the **end**: `resolveDashboardRowOrder` appends ids a saved layout lacks. */
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

export const DEFAULT_DASHBOARD_LAYOUT_SETTINGS: DashboardLayoutSettings = {
  id: 1,
  rowOrder: DEFAULT_DASHBOARD_ROW_ORDER,
  hiddenRowIds: [],
};

export const DEFAULT_CATEGORY_MODEL_SETTINGS: CategoryModelSettings = {
  id: 1,
  trainingWindowYears: null,
};

export const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 1,
  primaryColor: undefined,
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

export const DEFAULT_FORECAST_SETTINGS: ForecastSettings = {
  id: 1,
  lookbackMonths: 6,
  basis: 'net-cash-flow',
  safetyNetAmount: 0,
  mode: 'when-affordable',
  scopeAccountIds: undefined,
};

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  id: 1,
  themeStyle: undefined,
  hasVisited: undefined,
  backupReminderDismissed: undefined,
};

/*
 * Allowed values of stored unions — the server CHECKs each column against them. `Record<Union,
 * true>` makes the compiler reject a missing member as well as an extra one. Changes need a migration.
 */
const allOf = <K extends string>(members: Record<K, true>): readonly [K, ...K[]] =>
  Object.keys(members) as [K, ...K[]];

export const THEME_STYLE_IDS = allOf<ThemeStyleId>({
  deformable: true,
  'deformable-dark': true,
  neumorphism: true,
  'neumorphism-dark': true,
  'liquid-glass': true,
  cyberpunk: true,
  skeuomorphism: true,
  'anti-polish': true,
  memphis: true,
  'retro-futurism': true,
});

export const SIGN_CONVENTIONS = allOf<SignConvention>({
  'as-is': true,
  'debit-negative': true,
  'credit-negative': true,
});

export const SUPPORTED_DATE_FORMATS = allOf<DateFormat>({
  'DD/MM/YYYY': true,
  'YYYY-MM-DD': true,
  'MM/DD/YYYY': true,
});

export const SUPPORTED_ENCODINGS = allOf<CsvEncoding>({ 'utf-8': true, 'windows-1252': true });
