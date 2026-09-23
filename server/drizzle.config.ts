import { defineConfig } from 'drizzle-kit';

import { resolveDbFile } from './src/config.js';

// `drizzle-kit generate` diffs src/schema against drizzle/ and writes a new SQL migration.
// The server applies whatever lands here on boot — see src/db.ts.
export default defineConfig({
  dialect: 'sqlite',
  schema: './src/schema/index.ts',
  out: './drizzle',
  dbCredentials: { url: resolveDbFile(process.env) },
});
