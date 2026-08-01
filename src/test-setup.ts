// Global Vitest setup (angular.json's `test.options.setupFiles`), run before any spec module.
// Polyfills IndexedDB (jsdom doesn't implement it) so specs that exercise a real Dexie/`appDb`
// round-trip (e.g. category-model.repository.spec.ts) work regardless of module load order —
// `appDb` is a module-level singleton, so this must be installed before the first spec file
// imports `app-db.ts`, not from within an individual spec file.
import 'fake-indexeddb/auto';

// NOTE (2026-08-01): this file cannot reset `shared/utils/format-settings.ts`'s module-level
// signals, however natural a home for that it looks like. It used to try, and the attempt was a
// silent no-op for its whole life: the builder pre-bundles each spec through the Angular compiler
// while Vite transforms this file separately, so this file gets its *own copy* of any app module it
// imports, and writing to that copy reaches no spec. (Proven with a throwaway probe spec — the hook
// here ran, and the specs' `locale` signal kept its leaked value. Neither the `@/` alias nor a
// relative path nor moving this file inside `src/app/` changes that; the alias doesn't even resolve
// from here.)
//
// Specs that read or write formatted currency/date/percent text call `withCleanFormatSettings()`
// from `shared/utils/format-settings.testing.ts` instead — registered from inside the spec graph,
// where it actually lands.
