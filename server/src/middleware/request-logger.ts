import type { RequestHandler } from 'express';

/** One line per request, dev only — enough to see the proxy actually reaching this process. */
export const requestLogger =
  (log: (message: string) => void = console.log): RequestHandler =>
  (req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`);
    });
    next();
  };
