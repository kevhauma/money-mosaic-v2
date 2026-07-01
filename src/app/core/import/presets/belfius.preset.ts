import type { BankPreset } from './bank-preset.type';

/**
 * Best-effort Belfius CSV export column signature, reconstructed from general
 * knowledge of Belfius's bilingual (NL/FR) CSV export — NOT verified against a real
 * sample file. Correct the headers/delimiter/decimal separator/encoding here once a
 * real Belfius export is available.
 */
export const BELFIUS_PRESET: BankPreset = {
  id: 'belfius',
  label: 'Belfius',
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
};
