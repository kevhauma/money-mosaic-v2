import { defineConfig } from 'vitest/config';

// Backend tests. Kept out of `ng test` on purpose: the Angular workspace's test target only
// knows about `src/`, and these specs need Node globals and a real SQLite binding.
export default defineConfig({
  test: {
    include: ['src/**/*.spec.ts'],
    environment: 'node',
  },
});
