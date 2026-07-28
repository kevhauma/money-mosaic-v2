// Global Vitest setup (angular.json's `test.options.setupFiles`), run before any spec module.
// Polyfills IndexedDB (jsdom doesn't implement it) so specs that exercise a real Dexie/`appDb`
// round-trip (e.g. category-model.repository.spec.ts) work regardless of module load order —
// `appDb` is a module-level singleton, so this must be installed before the first spec file
// imports `app-db.ts`, not from within an individual spec file.
import 'fake-indexeddb/auto';
// Relative, not the `@/shared/utils` alias — that alias isn't resolvable from this file's location
// (outside `src/app/`), and a deep import keeps this global setup file minimal regardless.
import { syncFormatSettings } from './app/shared/utils/format-settings';

// `shared/utils/format-settings.ts`'s locale/currencySymbol/currencySymbolPosition signals are a
// process-global module singleton (TICKET-NG-10) and Vitest runs with isolate:false, so any spec
// that changes them (directly, or indirectly via AppSettingsStore) leaks that state into whichever
// spec file happens to run next — surfacing as spurious locale/currency-symbol mismatches in
// completely unrelated formatCurrency/formatPercent/formatDate/signedAmount assertions. Resetting
// here, once, after every test in every file, is cheaper and more reliable than adding the same
// `beforeEach` to every spec that happens to render formatted currency/percent/date text.
// `syncFormatSettings({})` defaults every field (each falls back internally when omitted).
afterEach(() => {
  syncFormatSettings({});
});
