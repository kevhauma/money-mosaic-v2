import type { Account, MappingProfile } from '@/core/data-access';
import { normalizeIban } from '@/shared/utils';

/**
 * Reads the CSV's own account IBAN/number out of a sample of raw (unmapped) rows, using the
 * matched mapping profile's `columns.ownIban` header to find the right column. Returns the first
 * non-empty value found, since every row of a single-account bank export repeats the same IBAN.
 */
export const detectOwnIban = (
  headerRow: string[],
  dataRows: string[][],
  profile: MappingProfile | undefined,
): string | null => {
  const ownIbanHeader = profile?.columns.ownIban;
  if (!ownIbanHeader) return null;

  const columnIndex = headerRow.findIndex(
    (header) => header.trim().toLowerCase() === ownIbanHeader.trim().toLowerCase(),
  );
  if (columnIndex === -1) return null;

  for (const row of dataRows) {
    const raw = row[columnIndex]?.trim();
    if (raw) return raw;
  }
  return null;
};

/** Matches a detected IBAN against known accounts, ignoring whitespace/case differences. */
export const matchAccountByIban = (
  iban: string | null,
  accounts: Account[],
): Account | undefined => {
  if (!iban) return undefined;
  const normalized = normalizeIban(iban);
  return accounts.find((account) => account.iban && normalizeIban(account.iban) === normalized);
};
