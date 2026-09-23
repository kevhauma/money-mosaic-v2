import { resolveConfig } from './config.js';
import { createApp } from './app.js';
import { openDatabase, runMigrations } from './db.js';

/**
 * Boots the backend: open the database, bring it up to date, then listen. Migrations run *before*
 * the first request can arrive, so starting the process is the only step needed to get a usable
 * database.
 */
const main = (): void => {
  const config = resolveConfig(process.env);
  const handle = openDatabase(config.dbFile);
  runMigrations(handle);

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

main();
