import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Backend tests. Kept out of `ng test` on purpose: the Angular workspace's test target only
// knows about `src/`, and these specs need Node globals and a real SQLite binding.
export default defineConfig({
  resolve: {
    alias: {
      // The `shared/*` path mapping from `tsconfig.json`, repeated for Vitest — it resolves
      // modules through Vite, which does not read tsconfig paths (TICKET-SRV-02).
      shared: fileURLToPath(new URL('../shared', import.meta.url)),
    },
  },
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});
