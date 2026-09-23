import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** Port 4300 sits clear of `ng serve` (4210) and Angular's default (4200). */
export const DEFAULT_PORT = 4300;

/** Relative to the server workspace root, so the file lands in `server/data/` (gitignored). */
export const DEFAULT_DB_FILE = 'data/money-mosaic.sqlite';

/** Absolute path of the `server/` directory, whatever cwd the process was started from. */
export const SERVER_ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Migrations `drizzle-kit generate` writes, applied on boot by `runMigrations`. */
export const MIGRATIONS_DIR = path.join(SERVER_ROOT, 'drizzle');

export type ServerConfig = {
  readonly port: number;
  readonly dbFile: string;
  readonly isDev: boolean;
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

export const resolveConfig = (env: NodeJS.ProcessEnv): ServerConfig => ({
  port: resolvePort(env),
  dbFile: resolveDbFile(env),
  isDev: env['NODE_ENV'] !== 'production',
});
