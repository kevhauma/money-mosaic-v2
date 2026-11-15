import express, { type Express } from 'express';

import type { DatabaseHandle } from './db.js';
import { mountStaticSite } from './http/static-site.js';
import { createMcpRouter } from './mcp/mcp-router.js';
import { createErrorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { createRequireAuth } from './middleware/require-auth.js';
import { createApiRouters } from './routes/api.js';
import { createAuthRouter } from './routes/auth.js';
import { createHealthRouter } from './routes/health.js';

/** Ceiling on a request body — see the note in `createApp`. */
export const JSON_BODY_LIMIT = '10mb';

export type CreateAppOptions = {
  readonly handle: DatabaseHandle;
  /** Dev adds the request logger; production stays quiet. */
  readonly isDev: boolean;
  /**
   * The built app to serve alongside `/api`, on the same port (TICKET-SRV-09). Left out in
   * development, where `ng serve` owns the documents and proxies `/api` here — and left out by
   * `index.ts` when there is no build on disk yet, so a first boot before `ng build` is an
   * API-only server rather than a 500 on every page.
   */
  readonly webRoot?: string;
  /**
   * Where `POST /api/data/import/staged` writes (TICKET-SRV-11). Passed in rather than read from
   * the config so a spec gets a temporary directory of its own — a backend spec never touches
   * `server/data/`.
   */
  readonly stagedImportDir: string;
};

/**
 * Builds the Express app. Everything it needs is passed in, so a test can mount it against an
 * in-memory database without booting `index.ts`.
 */
export const createApp = ({
  handle,
  isDev,
  webRoot,
  stagedImportDir,
}: CreateAppOptions): Express => {
  const app = express();

  // Nothing gains from announcing the server framework on every response.
  app.disable('x-powered-by');

  // Express' 100kB default is generous for a single entity but not for the bulk writes
  // TICKET-SRV-04 carries (a CSV import's worth of transactions in one transactional request),
  // where it would show up as a bare 413 rather than anything diagnosable.
  //
  // It is deliberately **not** sized for a whole-database restore, which is larger still. This
  // parser is mounted before `requireAuth` below, so its ceiling is what a *signed-out* caller on
  // the LAN can make the server allocate; raising it to fit a backup would hand that allowance to
  // everyone who can reach the port. A restore streams to disk instead and is bounded separately
  // (TICKET-SRV-11, `http/staged-upload.ts`).
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  if (isDev) app.use(requestLogger());

  app.use('/api', createHealthRouter(handle));
  app.use('/api/auth', createAuthRouter(handle.db));

  // Health and the auth routes above are the only endpoints a signed-out client may reach: every
  // entity router mounts behind `requireAuth` (TICKET-SRV-03). The middleware is applied per router
  // rather than blanket-mounted on `/api`, so an unknown path still answers 404 rather than 401.
  const requireAuth = createRequireAuth(handle.db);
  for (const { path, router } of createApiRouters(handle.db, stagedImportDir)) {
    app.use(path, requireAuth, router);
  }

  // A bearer token of its own and never the cookie (TICKET-MCP-01), so not behind `requireAuth`.
  app.use('/mcp', createMcpRouter(handle.db));

  // After every `/api` router and before the 404, which is the whole of the ordering contract:
  // a deep link has to reach `index.html` (it is not a file, so nothing else would answer it) and
  // `/api/typo` must not (an HTML body where JSON was expected surfaces as a parse error somewhere
  // else entirely). `mountStaticSite` declines the `/api` prefix itself for that reason.
  if (webRoot !== undefined) mountStaticSite(app, webRoot);

  app.use(notFoundHandler);
  app.use(createErrorHandler());

  return app;
};
