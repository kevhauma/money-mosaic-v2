// @ts-check
const eslint = require('@eslint/js');
const { defineConfig } = require('eslint/config');
const tseslint = require('typescript-eslint');
const angular = require('angular-eslint');

module.exports = defineConfig([
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
