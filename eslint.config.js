// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
  {
    // The backend workspace and the root dev scripts are not part of the Angular workspace and
    // have their own toolchains (`server/eslint.config.js`). Without this, an editor running the
    // root config over `server/**` would apply Angular rules to Express code (TICKET-SRV-01).
    ignores: ['server/**', 'scripts/**'],
  },
  {
    // Hard rule guard (CLAUDE.md): nothing under `src/` may import from the backend workspace.
    // A value import would drag `better-sqlite3` and Express toward the browser bundle; even a
    // type-only import couples the client to the server's internal schema. Later v3 tickets are
    // tempted by exactly this when they want shared DTOs — those belong in their own location,
    // not in `server/src/`. That location is the repo-root `shared/` workspace (TICKET-SRV-02),
    // which this guard deliberately does not match: it is framework-free, dependency-free plain
    // TypeScript, so importing it pulls nothing toward the bundle.
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/server/*', '**/server/**'],
              message:
                'The Angular app must never import from the backend workspace (TICKET-SRV-01) — server code pulls better-sqlite3 and Express into the browser bundle. Anything both sides need goes in the repo-root shared/ workspace instead.',
            },
          ],
        },
      ],
    },
  },
  {
    // The third side of the same seam (TICKET-SRV-02): `shared/` is what both workspaces are
    // allowed to import, which only works while it depends on neither of them. A single import
    // of an Angular or Express module here would land that module in the other workspace's
    // build by the back door.
    files: ['shared/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: [
                // The two workspaces themselves.
                '**/server/*',
                '**/server/**',
                '**/src/app/**',
                '@/*',
                '@angular/*',
                // And their dependencies. Blocking only the workspaces left the more likely
                // mistake open: importing Drizzle *directly* here would couple every consumer of
                // shared/ to a persistence library without ever naming a workspace.
                'drizzle-orm',
                'drizzle-orm/*',
                'drizzle-kit',
                '@ngrx/*',
                'better-sqlite3',
                'express',
                'rxjs',
                'rxjs/*',
              ],
              message:
                'shared/ is imported by both workspaces (TICKET-SRV-02), so it may depend on neither — keep it framework-free, dependency-free plain TypeScript.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.stylistic,
      angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      '@typescript-eslint/no-empty-function': ['error', { allow: ['arrowFunctions'] }],
      '@angular-eslint/directive-selector': [
        'error',
        {
          type: 'attribute',
          prefix: 'app',
          style: 'camelCase',
        },
      ],
      '@angular-eslint/component-selector': [
        'error',
        {
          type: 'element',
          prefix: ['app', 'mm'],
          style: 'kebab-case',
        },
      ],
      '@angular-eslint/no-input-rename': ['error', { allowedNames: ['class', 'style'] }],
    },
  },
  {
    // Recurrence guard for the CR4-6/TICKET-NG-10 locale-drift finding: a hardcoded string-literal
    // locale in a new Intl.NumberFormat/DateTimeFormat means the result ignores the user's locale
    // setting. shared/utils owns the settings-driven formatters (formatCurrency, formatDate,
    // formatPercent, formatRatio) — anywhere else should call those instead of constructing its own
    // Intl formatter.
    files: ['**/*.ts'],
    ignores: ['src/app/shared/utils/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'NewExpression[callee.object.name="Intl"][callee.property.name=/^(NumberFormat|DateTimeFormat)$/][arguments.0.type="Literal"]',
          message:
            "Hardcoded Intl locale ignores the user's locale setting (TICKET-NG-10) — use a shared/utils formatter (formatCurrency/formatDate/formatPercent/formatRatio) instead of `new Intl.NumberFormat/DateTimeFormat(<string-literal>, ...)`.",
        },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [angular.configs.templateRecommended, angular.configs.templateAccessibility],
    rules: {},
  },
]);
