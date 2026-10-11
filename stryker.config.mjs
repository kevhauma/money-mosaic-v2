// @ts-check

/**
 * Mutation testing over both workspaces (`npx stryker run`).
 *
 * The suite does not run through `ng test` here. `@angular/build:unit-test` pre-bundles the specs
 * and hands Vitest JavaScript, so Vitest never transforms a source file — and a source file is
 * exactly what Stryker mutates. `vitest.stryker.config.ts` is therefore a second, Stryker-only way
 * to run the same specs, compiling them through `@analogjs/vite-plugin-angular` so the mutated
 * sources are what reaches the tests. It covers the Angular specs and the backend's, as two Vitest
 * projects, which is what lets one `stryker run` mutate `src/`, `shared/` and `server/` together.
 *
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
const config = {
  packageManager: 'npm',
  reporters: ['html', 'clear-text', 'progress'],
  mutate: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/**/*.testing.ts',
    '!src/**/*.d.ts',
    '!src/test-setup.ts',
    // `app-bootstrap.spec.ts` asserts on the *text* of this file (that bootstrap registers exactly
    // one initializer and hydrates no store) by reading it off disk. Instrumenting it rewrites the
    // very lines that spec matches on, so the suite fails before a single mutant is tested.
    // Excluded, which leaves Stryker copying it into the sandbox untouched.
    '!src/app/app.config.ts',
    // Same reason, from the other workspace: `server/src/routes/api.spec.ts` guards that every
    // repository method and every multi-table operation has a route by *reading these files as
    // text* and pulling their `name = (…) =>` members out with a regex — it may not import them,
    // because the TICKET-SRV-01 guard forbids the backend importing from `src/app/`. Instrumented
    // sources do not match that regex, so the guard fails on its own reading.
    '!src/app/core/data-access/*.repository.ts',
    '!src/app/core/import/import.service.ts',
    '!src/app/core/transactions/transaction-deletion.service.ts',
    '!src/app/core/transfers/transfer-linking.service.ts',
    '!src/app/core/accounts/account-deletion.service.ts',
    'shared/**/*.ts',
    'server/src/**/*.ts',
    '!server/src/**/*.spec.ts',
  ],
  // Stryker's built-in Angular ignorer. The compiler reads the options object of `input()`,
  // `output()`, `model()` and the signal queries statically, so a mutant inside one of those
  // (`input('', { alias: 'class' })`, 25 of them in `shared/ui`) is not a failing test but a
  // compile error that takes the whole run down. This leaves those objects alone and reports the
  // mutants as ignored, with the reason, rather than as survivors.
  ignorers: ['angular'],
  testRunner: 'vitest',
  vitest: {
    configFile: 'vitest.stryker.config.ts',
  },
  coverageAnalysis: 'perTest',
};
export default config;
