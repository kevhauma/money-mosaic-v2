import Dexie, { type Table } from 'dexie';

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
  kind: 'expense' | 'income';
  group?: string;
  color: string;
  icon: string;
  archived: boolean;
  isSystem: boolean;
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
  balance?: string;
};

export type MappingProfile = {
  id?: number;
  name: string;
  bankPreset?: string;
  /** Header names used to auto-detect this profile from an uploaded CSV. Only set on bank template profiles, not user-saved account mappings. */
  headerSignature?: string[];
  delimiter: string;
  decimalSeparator: string;
  dateFormat: string;
  encoding: string;
  headerRows: number;
  signConvention: string;
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
];

export type ImportBatch = {
  id?: number;
  accountId: number;
  fileName: string;
  mappingProfileId: number;
  importedAt: string;
  rowsRead: number;
  rowsAdded: number;
  rowsDuplicate: number;
  dateFrom: string;
  dateTo: string;
};

export class AppDb extends Dexie {
  accounts!: Table<Account, number>;
  transactions!: Table<Transaction, number>;
  transfers!: Table<Transfer, number>;
  categories!: Table<Category, number>;
  rules!: Table<Rule, number>;
  mappingProfiles!: Table<MappingProfile, number>;
  importBatches!: Table<ImportBatch, number>;
  transferSettings!: Table<TransferSettings, number>;

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

    this.on('populate', () => {
      this.mappingProfiles.bulkAdd(DEFAULT_MAPPING_PROFILE_TEMPLATES);
      this.categories.bulkAdd(DEFAULT_CATEGORIES);
      this.transferSettings.add(DEFAULT_TRANSFER_SETTINGS);
    });
  }
}

export const appDb = new AppDb();
