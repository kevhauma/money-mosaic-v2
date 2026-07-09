/** Centralised percentage (0-100) ⇄ fraction (0-1) conversion for share-style inputs (TICKET-ACC-02). */
export const percentageToFraction = (percentage: number): number => percentage / 100;

export const fractionToPercentage = (fraction: number): number => Math.round(fraction * 100);
