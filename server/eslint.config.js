// Server-only ESLint config. `ng lint` lints `src/**` in the Angular workspace and never reaches
// here; this config is what `npm run lint --prefix server` uses (TICKET-SRV-01).
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/**', 'data/**', 'drizzle/**'] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  tseslint.configs.stylistic,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      // Express recognises an error handler by its arity, so the unused `next` parameter is load-bearing.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // The mirror of the root config's guard: the backend never reaches into the Angular app.
      // Anything genuinely common gets its own home rather than one workspace reaching across the
      // seam (TICKET-SRV-01) — since TICKET-SRV-02 that home is the repo-root `shared/`
      // workspace, which this guard deliberately does not match.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/src/app/**'],
              message:
                'The backend must never import from the Angular app (TICKET-SRV-01) — put anything both sides need in the repo-root shared/ workspace instead.',
            },
          ],
        },
      ],
    },
  },
);
