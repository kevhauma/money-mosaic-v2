// Global Vitest setup (angular.json's `test.options.setupFiles`), run before any spec module.
// Polyfills IndexedDB (jsdom doesn't implement it) so specs that exercise a real Dexie/`appDb`
// round-trip (e.g. category-model.repository.spec.ts) work regardless of module load order —
// `appDb` is a module-level singleton, so this must be installed before the first spec file
// imports `app-db.ts`, not from within an individual spec file.
import 'fake-indexeddb/auto';
