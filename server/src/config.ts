import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** Port 4300 sits clear of `ng serve` (4210) and Angular's default (4200). */
export const DEFAULT_PORT = 4300;

/** Relative to the server workspace root, so the file lands in `server/data/` (gitignored). */
export const DEFAULT_DB_FILE = 'data/money-mosaic.sqlite';

/**
 * Where an import's bytes are staged before they are applied (TICKET-SRV-11). Beside the database,
 * under the same gitignored `server/data/`, because it holds the same data at the same sensitivity
 * — and on the same filesystem, so the files a sweep has to find are never spread across two.
 */
export const DEFAULT_STAGED_IMPORT_DIR = 'data/staged-imports';

/**
 * Where `ng build` puts the app, relative to the server workspace root — `dist/<project>/browser`
 * is the `@angular/build:application` layout. Serving it is what makes TICKET-SRV-09's one port
 * one port.
 */
export const DEFAULT_WEB_ROOT = '../dist/money-mosaic-vibe/browser';

/** Absolute path of the `server/` directory, whatever cwd the process was started from. */
export const SERVER_ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Migrations `drizzle-kit generate` writes, applied on boot by `runMigrations`. */
export const MIGRATIONS_DIR = path.join(SERVER_ROOT, 'drizzle');

export type ServerConfig = {
  readonly port: number;
  readonly dbFile: string;
  readonly isDev: boolean;
  /**
   * The directory holding the built app. Only *served* in production — in development `ng serve`
   * owns the documents and proxies `/api` here, so a stale `dist/` must not shadow it.
   */
  readonly webRoot: string;
  /** Directory for `POST /api/data/import/staged` to write into (TICKET-SRV-11). */
  readonly stagedImportDir: string;
};

/** `PORT` wins over the default; anything that isn't a usable port number is an error, not a silent fallback. */
export const resolvePort = (env: NodeJS.ProcessEnv): number => {
  const raw = env['PORT'];
  if (raw === undefined || raw.trim() === '') return DEFAULT_PORT;

  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`PORT must be an integer between 1 and 65535, got "${raw}"`);
  }
  return port;
};

/** `DB_FILE` wins over the default; a relative value resolves against the server workspace root. */
export const resolveDbFile = (env: NodeJS.ProcessEnv): string => {
  const raw = env['DB_FILE']?.trim();
  if (raw === undefined || raw === '') return path.resolve(SERVER_ROOT, DEFAULT_DB_FILE);
  if (raw === ':memory:') return raw;
  return path.resolve(SERVER_ROOT, raw);
};

/** `WEB_ROOT` wins over the default; a relative value resolves against the server workspace root. */
export const resolveWebRoot = (env: NodeJS.ProcessEnv): string => {
  const raw = env['WEB_ROOT']?.trim();
  return path.resolve(SERVER_ROOT, raw === undefined || raw === '' ? DEFAULT_WEB_ROOT : raw);
};

/** `STAGED_IMPORT_DIR` wins over the default; a relative value resolves against the server workspace root. */
export const resolveStagedImportDir = (env: NodeJS.ProcessEnv): string => {
  const raw = env['STAGED_IMPORT_DIR']?.trim();
  return path.resolve(
    SERVER_ROOT,
    raw === undefined || raw === '' ? DEFAULT_STAGED_IMPORT_DIR : raw,
  );
};

export const resolveConfig = (env: NodeJS.ProcessEnv): ServerConfig => ({
  port: resolvePort(env),
  dbFile: resolveDbFile(env),
  isDev: env['NODE_ENV'] !== 'production',
  webRoot: resolveWebRoot(env),
  stagedImportDir: resolveStagedImportDir(env),
});
