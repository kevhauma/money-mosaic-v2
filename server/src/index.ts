import { resolveConfig } from './config.js';
import { createApp } from './app.js';
import { seedAdminUser } from './auth/seed.js';
import { openDatabase, runMigrations } from './db.js';

/**
 * Boots the backend: open the database, bring it up to date, seed the first admin if there is no
 * user yet, then listen. All three run *before* the first request can arrive, so starting the
 * process is the only step needed to get a usable database with someone able to sign in.
 */
const main = async (): Promise<void> => {
  const config = resolveConfig(process.env);
  const handle = openDatabase(config.dbFile);
  runMigrations(handle);
  if (await seedAdminUser(handle.db)) {
    console.log('Seeded the first account: admin / admin — change it from Settings.');
  }

  const app = createApp({ handle, isDev: config.isDev });
  const server = app.listen(config.port, () => {
    console.log(`Money Mosaic server listening on http://localhost:${config.port}`);
    console.log(`Database: ${config.dbFile}`);
  });

  const shutdown = (): void => {
    server.close(() => {
      handle.close();
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

main().catch((error: unknown) => {
  console.error('Failed to start the server', error);
  process.exit(1);
});
