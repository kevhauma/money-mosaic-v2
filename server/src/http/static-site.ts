import express, { type Express } from 'express';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Angular's `outputHashing: "all"` names every build artifact after a hash of its contents —
 * `main-ZSBNPVVC.js`, `chunk-22E4ZNCE.js`, `styles-SQHKSA24.css`, `media/cinzel-…-HB3QMI3R.woff2`.
 * A file with one of those names can never change, so caching it for a year is safe: a rebuild
 * produces different *names*, never different contents under the same name.
 *
 * It is a name test, not a provenance one, so an unhashed asset that happens to end in a dash and
 * eight upper-case characters would match — a hand-authored `public/logo-DARKMODE.png` would be
 * pinned for a year and could only be corrected by renaming it. Only the two favicons live in
 * `public/` today; anything added there wants a lower-case or shorter suffix.
 */
const HASHED_NAME = /-[A-Z0-9]{8,}\.[A-Za-z0-9]+$/;

/** A year, the ceiling `max-age` is specified to be meaningful up to. */
export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/**
 * `index.html` is the one file whose name never changes and the one that names all the others.
 * Cached, it goes on asking for the previous build's chunks after a redeploy — the "a hard refresh
 * fixed it" bug — so it is `no-store` rather than a short `max-age`.
 */
export const NO_STORE_CACHE_CONTROL = 'no-store';

/**
 * Everything else: the unhashed files copied out of `public/`. Not immutable, because the name
 * would outlive a change — but still worth a conditional request rather than a full one.
 */
export const REVALIDATE_CACHE_CONTROL = 'public, max-age=0, must-revalidate';

export const cacheControlFor = (filePath: string): string => {
  const name = path.basename(filePath);
  if (name.endsWith('.html')) return NO_STORE_CACHE_CONTROL;
  return HASHED_NAME.test(name) ? IMMUTABLE_CACHE_CONTROL : REVALIDATE_CACHE_CONTROL;
};

/**
 * Whether a path belongs to the API rather than to the app.
 *
 * Lower-cased because **Express matches mounts case-insensitively**: `app.use('/api', …)` answers
 * `/API/health`. A case-sensitive test here would disagree with the router it is guarding, and
 * `/API/nope` would fall through to `index.html` — an HTML body reaching a caller that asked for
 * JSON, which is precisely the failure this guard exists to prevent.
 */
export const isApiPath = (urlPath: string): boolean => {
  const lower = urlPath.toLowerCase();
  return lower === '/api' || lower.startsWith('/api/');
};

/**
 * Whether an unmatched path should be answered with the app.
 *
 * A route has no file extension (`/transactions/482`, `/admin/users`, `/`); a request for a file
 * does (`/main-OLDHASH.js`). The distinction matters after a redeploy, when an open tab asks for a
 * lazy chunk that no longer exists: answering `index.html` with a 200 turns that into
 * `Unexpected token '<'` inside a dynamic import, while a 404 is something the caller can see for
 * what it is.
 */
export const isAppRoute = (urlPath: string): boolean => path.extname(urlPath) === '';

/** The file a request for a route — rather than for an asset — is answered with. */
export const indexHtmlIn = (webRoot: string): string => path.join(webRoot, 'index.html');

/** Whether a directory holds an Angular build this server can serve. */
export const hasBuiltApp = (webRoot: string): boolean => fs.existsSync(indexHtmlIn(webRoot));

/**
 * Serves the built Angular app alongside `/api` on one port (TICKET-SRV-09).
 *
 * Mounted *after* every `/api` router and *before* `notFoundHandler`, which is the whole of the
 * ordering contract: a deep link is not a file, so nothing but the fallback would answer it, and
 * `/api/typo` must never reach that fallback.
 */
export const mountStaticSite = (app: Express, webRoot: string): void => {
  // `res.sendFile` rejects a relative path where `express.static` accepts one, so resolving here
  // keeps a relative `webRoot` from producing a working asset layer and a 500 on every deep link.
  const root = path.resolve(webRoot);
  const indexHtml = indexHtmlIn(root);

  const serveAsset = express.static(root, {
    // The fallback below answers `/` too, so `index.html` has one code path and one place its
    // `no-store` header is set.
    index: false,
    setHeaders: (res, filePath) => res.setHeader('Cache-Control', cacheControlFor(filePath)),
  });

  // The API is checked ahead of the file lookup, so its paths never depend on there happening to
  // be no file of that name under the web root. Both layers skip it, and what they skip to is
  // `notFoundHandler` — a JSON 404, which is the point.
  app.use((req, res, next) => (isApiPath(req.path) ? next() : serveAsset(req, res, next)));

  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    if (isApiPath(req.path) || !isAppRoute(req.path)) return next();

    res.setHeader('Cache-Control', NO_STORE_CACHE_CONTROL);
    res.sendFile(indexHtml, (error: unknown) => {
      // A client that navigated away mid-send leaves the headers already written, and handing that
      // to the error handler only produces ERR_HTTP_HEADERS_SENT noise in the operator's log.
      if (error !== undefined && error !== null && !res.headersSent) next(error);
    });
  });
};
