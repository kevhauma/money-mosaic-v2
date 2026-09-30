import { resolveConfig } from './config.js';
import { createApp } from './app.js';
import { seedAdminUser } from './auth/seed.js';
import { openDatabase, runMigrations } from './db.js';
import { hasBuiltApp } from './http/static-site.js';
import { HOST, lanAddresses, startupUrls } from './network.js';

/**
 * Boots the backend: open the database, bring it up to date, seed the first admin if there is no
 * user yet, then listen. All three run *before* the first request can arrive, so starting the
 * process is the only step needed to get a usable database with someone able to sign in.
 *
 * In production it also serves the built app on the same port (TICKET-SRV-09) — one command, one
 * process, one URL to hand to the household.
 */
const main = async (): Promise<void> => {
  const config = resolveConfig(process.env);
  const handle = openDatabase(config.dbFile);
  runMigrations(handle);
  if (await seedAdminUser(handle.db)) {
    console.log('Seeded the first account: admin / admin — change it from Settings → Account.');
  }

  // Only production serves the build: in development `ng serve` owns the documents and proxies
  // `/api` here, so a `dist/` left over from an old build would shadow the app being worked on.
  // A production boot with nothing built yet stays API-only and says so, rather than answering
  // every page with a 500 about a missing index.html.
  const serveApp = !config.isDev && hasBuiltApp(config.webRoot);
  if (config.isDev) {
    // Said out loud, because "I built it and it is still not being served" is otherwise a silent
    // puzzle: what decides is NODE_ENV, not whether `dist/` happens to exist.
    console.log('Development mode — not serving dist/; `ng serve` owns the documents.');
  } else if (!serveApp) {
    console.warn(
      `No built app at ${config.webRoot} — serving the API only.\n` +
        'Run `npm run start:local` from the repo root to build it and start this server together.',
    );
  }

  const app = createApp({
    handle,
    isDev: config.isDev,
    ...(serveApp ? { webRoot: config.webRoot } : {}),
  });

  const server = app.listen(config.port, HOST, () => {
    // Binding every interface is deliberate, and the LAN address is printed because it is the one
    // a phone needs and the one nobody can derive from their own machine.
    console.log(serveApp ? 'Money Mosaic is serving on:' : 'Money Mosaic API is listening on:');
    for (const url of startupUrls(config.port, lanAddresses())) console.log(`  ${url}`);
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
