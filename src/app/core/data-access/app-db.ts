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

export class AppDb extends Dexie {
  accounts!: Table<Account, number>;
  transactions!: Table<Transaction, number>;

  constructor() {
    super('money-mosaic');

    this.version(1).stores({
      accounts: '++id, name, type, archived',
      transactions: '++id, accountId, bookingDate, categoryId, transferId, fingerprint',
    });
  }
}

export const appDb = new AppDb();
