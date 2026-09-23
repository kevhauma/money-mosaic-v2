import { resolveConfig } from './config.js';
import { openDatabase, readSchemaVersion, runMigrations } from './db.js';

/** Applies pending migrations without starting the HTTP server (`npm run server:migrate`). */
const config = resolveConfig(process.env);
const handle = openDatabase(config.dbFile);
runMigrations(handle);
console.log(
  `Migrations applied — ${config.dbFile} is at schema version ${readSchemaVersion(handle)}`,
);
handle.close();
