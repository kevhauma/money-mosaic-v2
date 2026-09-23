#!/usr/bin/env node
// Runs the two processes a v3 dev session needs side by side: the Angular dev server on 4210
// (which proxies /api per proxy.conf.json) and the Express backend on 4300. Deliberately
// dependency-free — no concurrently/npm-run-all in the root package.json (TICKET-SRV-01).

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVER_DIR = path.join(ROOT, 'server');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

if (!existsSync(path.join(SERVER_DIR, 'node_modules'))) {
  console.error(
    'server/node_modules is missing — the backend has its own dependencies.\n' +
      'Run `npm run server:install` once, then `npm run dev` again.',
  );
  process.exit(1);
}

const children = [];
let shuttingDown = false;

const shutdown = (code) => {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of children) child.kill();
  process.exit(code);
};

const run = (label, args, cwd) => {
  const child = spawn(npm, args, { cwd, stdio: 'inherit', shell: process.platform === 'win32' });
  child.on('exit', (code) => {
    console.log(`[${label}] exited with code ${code ?? 0}`);
    shutdown(code ?? 0);
  });
  children.push(child);
};

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

run('server', ['run', 'dev'], SERVER_DIR);
// Port 4210 matches .claude/launch.json's `dev` config, so a browser check and `npm run dev`
// agree on one URL.
run('web', ['run', 'start', '--', '--port', '4210'], ROOT);
