import type { MappingProfileColumns } from '@/core/data-access';

export type BankPreset = {
  id: string;
  label: string;
  headerSignature: string[];
  columns: MappingProfileColumns;
  delimiter: string;
  decimalSeparator: string;
  dateFormat: string;
  encoding: string;
  headerRows: number;
  signConvention: 'as-is' | 'debit-negative' | 'credit-negative';
};
