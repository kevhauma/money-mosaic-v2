// Global Vitest setup (angular.json's `test.options.setupFiles`), run before any spec module.
//
// It installed a browser-database polyfill until TICKET-SRV-08: the repositories were wrappers over
// a local database, so a repository spec was a real round trip and jsdom implements no such storage
// API. They are HTTP clients now and `withApiTesting()`/`provideFakeApi()` stand in for the
// backend, so there is nothing global left to install — but the note below still applies, and it is
// the reason this file exists at all.
//
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
