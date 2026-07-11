import Dexie, { type Table } from 'dexie';
// Deep import (not the barrel) keeps this framework-agnostic Dexie module free of the Angular/ngrx
// code the shared/utils barrel also re-exports.
import { computeFingerprint } from '@/shared/utils/fingerprint';
// Deep import (not the `core/ml` barrel) for the same reason as above — the barrel's
// rule-proposal-mining module pulls in an `@Injectable` service transitively.
import type { FeatureConfig } from '@/core/ml/model-config';

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

export type ImportBatch = {
  id?: number;
  accountId: number;
  fileName: string;
  /** The remembered mapping profile used, when the user chose to remember it; absent otherwise (CR-1.6). */
  mappingProfileId?: number;
  importedAt: string;
  rowsRead: number;
  rowsAdded: number;
  rowsDuplicate: number;
  dateFrom: string;
  dateTo: string;
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
  metrics: { accuracy: number; trainedSampleCount: number };
  trainedAt: string;
  /** `MODEL_SCHEMA_VERSION` at training time, distinct from this table's own Dexie schema version. */
  schemaVersion: number;
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

    this.on('populate', () => {
      this.mappingProfiles.bulkAdd(DEFAULT_MAPPING_PROFILE_TEMPLATES);
      this.categories.bulkAdd(DEFAULT_CATEGORIES);
      this.transferSettings.add(DEFAULT_TRANSFER_SETTINGS);
    });
  }
}

export const appDb = new AppDb();
