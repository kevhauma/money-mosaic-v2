import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { startTestAppWithDb, type TestApp } from '../app.testing.js';
import {
  IMMUTABLE_CACHE_CONTROL,
  NO_STORE_CACHE_CONTROL,
  REVALIDATE_CACHE_CONTROL,
  cacheControlFor,
  hasBuiltApp,
} from './static-site.js';

/**
 * A stand-in for `dist/money-mosaic-vibe/browser`, with one file of each kind the real build
 * emits: the entry document, a content-hashed chunk, a hashed asset in `media/`, and an unhashed
 * file copied out of `public/`. Built rather than pointed at the real `dist/`, because a spec that
 * needs `ng build` to have run is a spec that fails for reasons of its own.
 */
const INDEX_HTML = '<!doctype html><html><body>money mosaic</body></html>';

let webRoot: string;

beforeAll(() => {
  webRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'mm-web-root-'));
  fs.mkdirSync(path.join(webRoot, 'media'));
  fs.writeFileSync(path.join(webRoot, 'index.html'), INDEX_HTML);
  fs.writeFileSync(path.join(webRoot, 'main-ZSBNPVVC.js'), 'console.log(1);');
  fs.writeFileSync(path.join(webRoot, 'media', 'cinzel-latin-HB3QMI3R.woff2'), 'font');
  fs.writeFileSync(path.join(webRoot, 'favicon.ico'), 'icon');
});

afterAll(() => fs.rmSync(webRoot, { recursive: true, force: true }));

describe('static-site: cacheControlFor', () => {
  it('lets a hashed artifact be cached for a year', () => {
    expect(cacheControlFor('/dist/main-ZSBNPVVC.js')).toBe(IMMUTABLE_CACHE_CONTROL);
    expect(cacheControlFor('/dist/chunk-22E4ZNCE.js')).toBe(IMMUTABLE_CACHE_CONTROL);
    expect(cacheControlFor('/dist/styles-SQHKSA24.css')).toBe(IMMUTABLE_CACHE_CONTROL);
    expect(cacheControlFor('/dist/media/cinzel-latin-wght-normal-HB3QMI3R.woff2')).toBe(
      IMMUTABLE_CACHE_CONTROL,
    );
  });

  /**
   * The one name that survives a redeploy, and the one that names all the others. Cached, it goes
   * on asking for the previous build's chunks — the "hard refresh fixed it" bug.
   */
  it('never lets index.html be cached', () => {
    expect(cacheControlFor('/dist/index.html')).toBe(NO_STORE_CACHE_CONTROL);
  });

  it('asks an unhashed asset to revalidate, since its name would outlive a change', () => {
    expect(cacheControlFor('/dist/favicon.ico')).toBe(REVALIDATE_CACHE_CONTROL);
    expect(cacheControlFor('/dist/favicon.svg')).toBe(REVALIDATE_CACHE_CONTROL);
  });
});

describe('static-site: hasBuiltApp', () => {
  it('is true for a directory holding an index.html and false otherwise', () => {
    expect(hasBuiltApp(webRoot)).toBe(true);
    expect(hasBuiltApp(path.join(webRoot, 'media'))).toBe(false);
    expect(hasBuiltApp(path.join(webRoot, 'nope'))).toBe(false);
  });
});

describe('static-site: serving the built app beside /api', () => {
  let app: TestApp;

  /**
   * Per test rather than per suite: `startTestAppWithDb` registers its teardown through
   * `onTestFinished`, which needs a test to attach to. An in-memory database on an ephemeral port
   * is cheap enough that this costs nothing worth arranging around.
   */
  beforeEach(async () => {
    app = await startTestAppWithDb({ webRoot });
  });

  const get = (urlPath: string): Promise<Response> => fetch(`${app.baseUrl}${urlPath}`);

  it('serves the app at the root, uncached', async () => {
    const response = await get('/');

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(INDEX_HTML);
    expect(response.headers.get('cache-control')).toBe(NO_STORE_CACHE_CONTROL);
  });

  /**
   * The acceptance criterion a refresh on a deep link tests by hand: `/transactions` is not a file,
   * so without the fallback it is a 404 and the router never gets to see the URL.
   */
  it('falls back to the app for a deep link, so a refresh survives', async () => {
    for (const deepLink of ['/transactions', '/transactions/482', '/admin/users']) {
      const response = await get(deepLink);
      expect(response.status).toBe(200);
      expect(await response.text()).toBe(INDEX_HTML);
    }
  });

  it('serves a hashed asset with a year-long immutable cache', async () => {
    const response = await get('/main-ZSBNPVVC.js');

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(IMMUTABLE_CACHE_CONTROL);
  });

  it('serves an unhashed asset with a revalidating cache', async () => {
    const response = await get('/favicon.ico');

    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe(REVALIDATE_CACHE_CONTROL);
  });

  /**
   * The failure mode this ticket calls out as otherwise silent: a typo in a fetch path answering
   * with an HTML document surfaces as a JSON parse error in whichever client code was unlucky
   * enough to read it, nowhere near the typo.
   */
  it('answers an unknown /api path with JSON, never the app', async () => {
    const response = await get('/api/nope');

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toMatch(/application\/json/);
    expect(await response.json()).toEqual({ error: 'No route for GET /api/nope' });
  });

  it('answers a non-GET to an unknown path with JSON too', async () => {
    const response = await fetch(`${app.baseUrl}/api/nope`, { method: 'POST' });
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toMatch(/application\/json/);

    const nonApi = await fetch(`${app.baseUrl}/transactions`, { method: 'DELETE' });
    expect(nonApi.status).toBe(404);
    expect(nonApi.headers.get('content-type')).toMatch(/application\/json/);
  });

  it('still answers the API it is sharing the port with', async () => {
    const response = await get('/api/health');

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true });
  });

  /** `/api` is the API's; `/api-docs` is a route the app could own. */
  it('does not mistake a path merely starting with "api" for the API', async () => {
    const response = await get('/api-docs');

    expect(response.status).toBe(200);
    expect(await response.text()).toBe(INDEX_HTML);
  });

  /**
   * Express matches mounts case-insensitively, so `/API/health` reaches the API router. A
   * case-sensitive guard here would disagree with the router it guards and hand `/API/nope` an
   * HTML document — the exact confusion the JSON 404 exists to prevent, reintroduced through the
   * shift key.
   */
  it('treats /API as the API too, the way the router already does', async () => {
    const health = await get('/API/health');
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({ ok: true });

    const unknown = await get('/API/nope');
    expect(unknown.status).toBe(404);
    expect(unknown.headers.get('content-type')).toMatch(/application\/json/);
  });

  /**
   * The redeploy case: an open tab asks for a lazy chunk the new build no longer emits. Answering
   * `index.html` with a 200 turns that into `Unexpected token '<'` inside a dynamic import, which
   * is reported from somewhere entirely unlike the cause. A path with a file extension is a
   * request for a file, and a missing file is a 404.
   */
  it('404s a missing asset instead of answering it with the app', async () => {
    for (const missing of [
      '/main-OLDHASH1.js',
      '/styles-GONE1234.css',
      '/media/absent-AAAAAAAA.woff2',
    ]) {
      const response = await get(missing);
      expect(response.status).toBe(404);
      expect(response.headers.get('content-type')).toMatch(/application\/json/);
    }
  });
});

describe('static-site: with no build to serve', () => {
  /**
   * The API-only mode `npm run dev` runs in, where `ng serve` owns the documents. An unmatched
   * path has to stay a JSON 404 rather than becoming a 500 about a missing index.html.
   */
  it('leaves every unmatched path a JSON 404 when no webRoot is mounted', async () => {
    const app = await startTestAppWithDb();
    const response = await fetch(`${app.baseUrl}/transactions`);

    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toMatch(/application\/json/);
  });
});
