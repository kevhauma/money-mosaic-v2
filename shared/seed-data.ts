/**
 * First-run seed data and the constants both workspaces must agree on (TICKET-SRV-02).
 *
 * The server's `seedUserDefaults` writes the seed rows for a newly created user. The `DEFAULT_*`
 * singleton fallbacks are what a settings row reads as before anyone has written it — the server
 * answers with them and the client's stores start from them (TICKET-SRV-03).
 *
 * Plain data and type-only imports from `./entities.js`, asserted by `server/src/shared-module.spec.ts`.
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

/** Name of the seeded `neutral`-kind system category (TICKET-CAT-02). Co-owner tagging finds it by this name, so the category form refuses to rename it. */
export const PARTNER_CONTRIBUTION_CATEGORY_NAME = 'Partner contribution';

/**
 * Best-effort bank CSV export signatures, reconstructed from general knowledge of each
 * bank's export format — NOT verified against a real sample file. Seeded into
 * `mappingProfiles` on first run so users get a starting point; correct or delete them
 * from the mapping profiles UI once a real export is available.
 */
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

/**
 * Sensible out-of-the-box categories (FR-CAT-1). Seeded into `categories` on first run;
 * users can rename/archive them once the category manager ships in a later story.
 */
export const DEFAULT_CATEGORIES: Category[] = [
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

/** The transfer auto-matching defaults a database starts with (FR-TRF-4). */
export const DEFAULT_TRANSFER_SETTINGS: TransferSettings = {
  id: 1,
  matchWindowDays: 3,
  autoLinkMediumConfidence: true,
};

/* --------------------------------------------------------------------------------------------
 * Singleton fallbacks
 *
 * What an **unwritten** singleton row reads as. The server's `/api/settings/<name>` endpoints
 * answer with these for a user who has never written the row, and merge a PATCH into them when
 * creating it (TICKET-SRV-03); the client's repositories and stores start from the same objects.
 * The `id: 1` each one carries is the old singleton convention the client types still require; the
 * server drops it, since there the owner is the key.
 * ------------------------------------------------------------------------------------------ */

export const DEFAULT_CATEGORY_COMPARISON_SETTINGS: CategoryComparisonSettings = {
  id: 1,
  excludedCategoryIds: [],
};

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

/* --------------------------------------------------------------------------------------------
 * Allowed values of stored unions
 *
 * The server pins each column to one of these lists with a CHECK constraint; the client offers the
 * same list. Each is written as a `Record<Union, true>` so the compiler rejects a missing member as
 * well as an extra one — a plain `Union[]` annotation only catches extras, which would let a value
 * the client offers fail the server's CHECK. Changing a list still needs a migration.
 * ------------------------------------------------------------------------------------------ */

const allOf = <K extends string>(members: Record<K, true>): readonly [K, ...K[]] =>
  Object.keys(members) as [K, ...K[]];

/** Only the ids are shared, because only the ids are stored; labels live in `core/theme/theme-styles.ts`. */
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

export const SUPPORTED_ENCODINGS = allOf<CsvEncoding>({
  'utf-8': true,
  'windows-1252': true,
});

/**
 * What the per-user interface state reads as before anyone has written it (TICKET-SRV-10): no theme
 * picked, the landing page not yet seen, the backup reminder not yet dismissed.
 *
 * Every key is declared as `undefined` rather than omitted — the `DEFAULT_APP_SETTINGS` convention.
 * Nothing here seeds a `withState` today, but the repository spreads a `{}` response over this
 * object and a missing key would read back as `undefined` from a signal that does not exist.
 */
export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  id: 1,
  themeStyle: undefined,
  hasVisited: undefined,
  backupReminderDismissed: undefined,
};
