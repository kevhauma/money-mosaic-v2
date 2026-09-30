import express, { type Express } from 'express';

import type { DatabaseHandle } from './db.js';
import { mountStaticSite } from './http/static-site.js';
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
};

/**
 * Builds the Express app. Everything it needs is passed in, so a test can mount it against an
 * in-memory database without booting `index.ts`.
 */
export const createApp = ({ handle, isDev, webRoot }: CreateAppOptions): Express => {
  const app = express();

  // Nothing gains from announcing the server framework on every response.
  app.disable('x-powered-by');

  // Express' 100kB default is generous for a single entity but not for the bulk writes
  // TICKET-SRV-04 carries (a CSV import's worth of transactions in one transactional request),
  // where it would show up as a bare 413 rather than anything diagnosable.
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  if (isDev) app.use(requestLogger());

  app.use('/api', createHealthRouter(handle));
  app.use('/api/auth', createAuthRouter(handle.db));

  // Health and the auth routes above are the only endpoints a signed-out client may reach: every
  // entity router mounts behind `requireAuth` (TICKET-SRV-03). The middleware is applied per router
  // rather than blanket-mounted on `/api`, so an unknown path still answers 404 rather than 401.
  const requireAuth = createRequireAuth(handle.db);
  for (const { path, router } of createApiRouters(handle.db)) {
    app.use(path, requireAuth, router);
  }

  // After every `/api` router and before the 404, which is the whole of the ordering contract:
  // a deep link has to reach `index.html` (it is not a file, so nothing else would answer it) and
  // `/api/typo` must not (an HTML body where JSON was expected surfaces as a parse error somewhere
  // else entirely). `mountStaticSite` declines the `/api` prefix itself for that reason.
  if (webRoot !== undefined) mountStaticSite(app, webRoot);

  app.use(notFoundHandler);
  app.use(createErrorHandler());

  return app;
};
