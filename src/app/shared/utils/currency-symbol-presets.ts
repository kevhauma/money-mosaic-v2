/** Fixed quick-pick list for the Settings page's currency symbol field (TICKET-SET-03) — anything else goes through the custom text field instead. */
export type CurrencySymbolPreset = { symbol: string; label: string };

export const CURRENCY_SYMBOL_PRESETS: readonly CurrencySymbolPreset[] = [
  { symbol: '€', label: 'Euro' },
  { symbol: '$', label: 'US Dollar' },
  { symbol: '£', label: 'Pound' },
  { symbol: '¥', label: 'Yen' },
  { symbol: '₹', label: 'Rupee' },
];
