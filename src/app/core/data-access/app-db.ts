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
  delimiter: string;
  decimalSeparator: string;
  dateFormat: string;
  encoding: string;
  headerRows: number;
  signConvention: string;
  columns: MappingProfileColumns;
  defaultAccountId?: number;
};

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
  }
}

export const appDb = new AppDb();
