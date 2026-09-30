#!/usr/bin/env node
// `npm run start:local` — one command, one process, one port (TICKET-SRV-09). Builds the Angular
// app in production configuration, then starts the Express server in production mode, which is
// what makes it serve that build alongside /api. Dependency-free for the same reason dev.mjs is:
// the root package.json carries no concurrently and no cross-env, and `NODE_ENV=production cmd`
// is not something Windows' shell understands.

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVER_DIR = path.join(ROOT, 'server');
const isWindows = process.platform === 'win32';
const npm = isWindows ? 'npm.cmd' : 'npm';

if (!existsSync(path.join(SERVER_DIR, 'node_modules'))) {
  console.error(
    'server/node_modules is missing — the backend has its own dependencies.\n' +
      'Run `npm run server:install` once, then `npm run start:local` again.',
  );
  process.exit(1);
}

const spawnNpm = (args, cwd, env) =>
  spawn(npm, args, {
    cwd,
    stdio: 'inherit',
    // Needed to resolve npm.cmd on Windows, and the reason `kill` below cannot simply signal the
    // child: it would be signalling cmd.exe rather than the node process underneath it.
    shell: isWindows,
    env: { ...process.env, ...env },
  });

/** Runs a command to completion and resolves its exit code. */
const run = (args, cwd, env) =>
  new Promise((resolve) => {
    const child = spawnNpm(args, cwd, env);
    // Without this, an unresolvable npm is an unhandled 'error' event and a promise that never
    // settles — an opaque stack, in a script that otherwise explains itself.
    child.on('error', (error) => {
      console.error(`Could not run \`${npm} ${args.join(' ')}\`:`, error.message);
      resolve(1);
    });
    child.on('exit', (code) => resolve(code ?? 0));
  });

let child;
let shuttingDown = false;

/**
 * `shell: true` on Windows means `child` is cmd.exe and the server is its descendant, so killing
 * the child alone leaves the server holding the port and the next run dies on EADDRINUSE. Ctrl-C
 * happens to work regardless (the console signals the whole group); a SIGTERM from a process
 * manager or an IDE stop button does not, which is what this is for.
 */
const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  if (child?.pid === undefined) process.exit(0);
  if (isWindows) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
  else child.kill();
};

// Registered before the build, not after it: a signal arriving during `ng build` would otherwise
// kill this process and leave the build running.
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

console.log('Building the app (production configuration)…');
// `--configuration production` is `ng build`'s default, said out loud so the ticket's promise does
// not rest on that default staying put.
const buildCode = await run(['run', 'build', '--', '--configuration', 'production'], ROOT);
if (buildCode !== 0) {
  console.error(`\nThe build failed (exit ${buildCode}) — not starting the server.`);
  process.exit(buildCode);
}

// NODE_ENV=production is the switch from "API only, dev logger on" to "serve the build too".
// PORT is passed through untouched, so `PORT=8080 npm run start:local` works.
child = spawnNpm(['run', 'start'], SERVER_DIR, { NODE_ENV: 'production' });
child.on('error', (error) => {
  console.error('Could not start the server:', error.message);
  process.exit(1);
});
child.on('exit', (code, signal) => process.exit(code ?? (signal === null ? 0 : 1)));
