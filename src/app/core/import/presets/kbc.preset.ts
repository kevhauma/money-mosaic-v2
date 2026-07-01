import type { BankPreset } from './bank-preset.type';

/**
 * Best-effort KBC Belgium CSV export column signature, reconstructed from general
 * knowledge of KBC's "rekeninguittreksel" CSV export — NOT verified against a real
 * sample file. Correct the headers/delimiter/decimal separator/encoding here once a
 * real KBC export is available.
 */
export const KBC_PRESET: BankPreset = {
  id: 'kbc',
  label: 'KBC',
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
};
