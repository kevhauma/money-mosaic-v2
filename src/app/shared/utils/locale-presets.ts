/** Fixed quick-pick list for the Settings page's locale field (TICKET-SET-04) — number/date formatting convention only, not translated UI copy. */
export type LocalePreset = { locale: string; label: string };

export const LOCALE_PRESETS: readonly LocalePreset[] = [
  { locale: 'en-US', label: 'English (United States)' },
  { locale: 'en-GB', label: 'English (United Kingdom)' },
  { locale: 'en-BE', label: 'English (Belgium)' },
  { locale: 'nl-BE', label: 'Dutch (Belgium)' },
  { locale: 'nl-NL', label: 'Dutch (Netherlands)' },
  { locale: 'fr-FR', label: 'French (France)' },
  { locale: 'de-DE', label: 'German (Germany)' },
  { locale: 'es-ES', label: 'Spanish (Spain)' },
];
