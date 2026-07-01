import type { BankPreset } from './bank-preset.type';
import { KBC_PRESET } from './kbc.preset';
import { BELFIUS_PRESET } from './belfius.preset';

export * from './bank-preset.type';
export * from './kbc.preset';
export * from './belfius.preset';

export const BANK_PRESETS: BankPreset[] = [KBC_PRESET, BELFIUS_PRESET];

export const detectBankPreset = (headers: string[]): BankPreset | null => {
  const normalizedHeaders = new Set(headers.map((header) => header.trim().toLowerCase()));
  return (
    BANK_PRESETS.find((preset) =>
      preset.headerSignature.every((column) => normalizedHeaders.has(column.trim().toLowerCase())),
    ) ?? null
  );
};
