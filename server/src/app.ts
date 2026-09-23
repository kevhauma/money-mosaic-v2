import express, { type Express } from 'express';

import type { DatabaseHandle } from './db.js';
import { createErrorHandler, notFoundHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/request-logger.js';
import { createAuthRouter } from './routes/auth.js';
import { createHealthRouter } from './routes/health.js';

/** Ceiling on a request body — see the note in `createApp`. */
export const JSON_BODY_LIMIT = '10mb';

export type CreateAppOptions = {
  readonly handle: DatabaseHandle;
  /** Dev adds the request logger; production stays quiet. */
  readonly isDev: boolean;
};

/**
 * Builds the Express app. Everything it needs is passed in, so a test can mount it against an
 * in-memory database without booting `index.ts`.
 */
export const createApp = ({ handle, isDev }: CreateAppOptions): Express => {
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

  // Every router added from here on mounts behind `createRequireAuth(handle.db)` (TICKET-SRV-03):
  // health and the auth routes above are the only endpoints a signed-out client may reach. The
  // middleware is applied per router rather than blanket-mounted on `/api`, so an unknown path
  // still answers 404 rather than 401.

  app.use(notFoundHandler);
  app.use(createErrorHandler());

  return app;
};
