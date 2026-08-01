import { syncFormatSettings } from './format-settings';

/**
 * Pins the app-wide format settings to their defaults around every test in the calling file.
 *
 * `format-settings.ts` keeps `locale`/`currencySymbol`/`currencySymbolPosition` in module-level
 * signals (TICKET-NG-10) and Vitest runs with `isolate: false`, so those signals are shared by
 * every spec file in the process: a spec that sets `en-BE`/`$` and doesn't put them back leaves
 * them that way for whichever file runs next, which then fails on `€1,234.56` vs `$1.234,56`
 * assertions that have nothing to do with it.
 *
 * `src/test-setup.ts` cannot do this globally, however much it looks like it should: the builder
 * pre-bundles each spec while Vite transforms the setup file separately, so the setup file gets its
 * *own copy* of `format-settings.ts` and resetting it reaches nothing. (That hook silently did
 * nothing from the day it was written until 2026-08-01; a throwaway probe spec proved the setup
 * file's `afterEach` ran while the specs' `locale` signal stayed on the leaked value.)
 *
 * So the reset has to be registered from inside the spec graph. Call this once at the top of any
 * spec file that reads *or* writes formatted currency/date/percent text:
 *
 * ```ts
 * describe('SomeComponent', () => {
 *   withCleanFormatSettings();
 *   // ...
 * });
 * ```
 *
 * It brackets each test on both sides on purpose — `afterEach` stops the file leaking outward, and
 * `beforeEach` makes the file immune to anything another file leaked inward, so a caller is
 * protected whether or not the rest of the suite plays along.
 */
export const withCleanFormatSettings = (): void => {
  // `syncFormatSettings({})` defaults every field — each falls back internally when omitted.
  beforeEach(() => syncFormatSettings({}));
  afterEach(() => syncFormatSettings({}));
};
