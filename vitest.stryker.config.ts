import { fileURLToPath } from 'node:url';

import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vitest/config';

/**
 * The Vitest config Stryker runs the test suite through (`stryker.config.mjs` points at it by
 * name). It is deliberately *not* called `vitest.config.ts`: a config under that name sits in
 * Vite's default resolution path, where it would also be picked up outside this run.
 *
 * `ng test` stays the real test command. It compiles specs with `@angular/build:unit-test`, which
 * bundles them ahead of time and hands Vitest JavaScript, so Vitest never sees — and therefore
 * never re-transforms — a source file. Stryker needs the source transformed on the fly, because
 * what it mutates is the source. `@analogjs/vite-plugin-angular` is what makes that possible: it
 * runs the Angular compiler inside Vite, which is also what resolves the `templateUrl` of the 150+
 * components whose templates live in their own files.
 *
 * Both workspaces run as Vitest projects so that one `stryker run` covers both suites. The backend
 * reuses its own config verbatim rather than a copy of it.
 */
const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [
          angular({
            tsconfig: fromRoot('./tsconfig.stryker.json'),
            // Mutants are not required to type-check: Stryker rewrites expressions, and a
            // perfectly good mutant like `a + b` -> `a - b` can be a type error. Leaving the
            // check on would report those as compile failures instead of as killed mutants.
            disableTypeChecking: true,
          }),
        ],
        resolve: {
          // The `@/*` and `shared/*` mappings from `tsconfig.json`, repeated for Vite, which
          // resolves modules itself and does not read tsconfig paths.
          alias: {
            '@': fromRoot('./src/app'),
            shared: fromRoot('./shared'),
          },
          // Also copied from the builder: it picks the Angular packages' ESM entry points.
          mainFields: ['es2020', 'module', 'main'],
          conditions: ['es2015', 'es2020', 'module'],
        },
        test: {
          name: 'app',
          globals: true,
          environment: 'jsdom',
          include: ['src/**/*.spec.ts'],
          setupFiles: [
            fromRoot('./stryker/angular-test-setup.ts'),
            fromRoot('./src/test-setup.ts'),
          ],
          // `setupFiles: 'list'` keeps the two in the order above, so the testing environment is
          // initialized first. The rest of this block matches what `@angular/build:unit-test`
          // applies to its own Vitest project, and the suite depends on more of it than it looks:
          // `isolate: false` is what leaves Node's own globals (`CompressionStream`) in place and
          // what makes `window.location` a redefinable property, which three specs rely on.
          isolate: false,
          sequence: { setupFiles: 'list' },
          // Analog defaults the pool to `vmThreads`, where `globalThis` *is* the jsdom window.
          // That is the one place its defaults and the builder's disagree in a way the specs can
          // see: jsdom's own `location` is non-configurable, and Node's globals are not reachable.
          // `forks` is Vitest's default and what the builder therefore runs on, which copies the
          // window onto Node's global instead and restores both behaviours.
          pool: 'forks',
        },
      },
      './server/vitest.config.ts',
    ],
  },
});
