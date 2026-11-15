import { runTokenCommand } from './auth/token-command.js';
import { resolveConfig } from './config.js';
import { openDatabase, runMigrations } from './db.js';

/** Entry point of the `token:*` scripts (TICKET-MCP-01) — opens the configured database. */
const handle = openDatabase(resolveConfig(process.env).dbFile);
try {
  runMigrations(handle);
  console.log(runTokenCommand(handle.db, process.argv.slice(2)));
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  handle.close();
}
