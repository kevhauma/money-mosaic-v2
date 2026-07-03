export const normalizeIban = (value: string | null | undefined): string =>
  (value ?? '').replace(/\s/g, '').toUpperCase();
