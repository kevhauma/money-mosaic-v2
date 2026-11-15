import type { DrizzleDb } from '../db.js';
import { createApiToken, listApiTokens, revokeApiToken } from './api-tokens.js';
import { findUserByEmail } from './users.js';

const USAGE = [
  'Usage:',
  '  npm run token:create -- <login> <name>',
  '  npm run token:list',
  '  npm run token:revoke -- <id>',
].join('\n');

/**
 * The `token:*` scripts (TICKET-MCP-01), as a function from arguments to the text to print, so a
 * spec can drive it without a process. Throws with the usage text on bad arguments.
 */
export const runTokenCommand = (db: DrizzleDb, [command, ...args]: readonly string[]): string => {
  if (command === 'create' && args.length === 2) {
    const [login, name] = args as [string, string];
    const user = findUserByEmail(db, login);
    if (user === undefined) throw new Error(`No user with login "${login}"`);
    const token = createApiToken(db, user.id, name);
    return `Token "${name}" for ${user.email} — shown once, store it now:\n${token}`;
  }

  if (command === 'list' && args.length === 0) {
    const rows = listApiTokens(db);
    if (rows.length === 0) return 'No tokens.';
    return rows
      .map((row) => `${row.id}\t${row.login}\t${row.name}\t${row.createdAt.toISOString()}`)
      .join('\n');
  }

  if (command === 'revoke' && args.length === 1) {
    const id = Number(args[0]);
    if (!Number.isInteger(id) || !revokeApiToken(db, id))
      throw new Error(`No token with id ${args[0]}`);
    return `Revoked token ${id}.`;
  }

  throw new Error(USAGE);
};
