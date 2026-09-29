import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { vi } from 'vitest';
import { startApp } from './app-bootstrap';

/**
 * Bootstrap, end to end, against a server that is and is not there (TICKET-SRV-06).
 *
 * The real `appConfig` and the real `main.ts` entry point, driven by a stubbed `fetch` — nothing is
 * mocked below the HTTP client, because the thing under test *is* what the app does when a request
 * gets no answer. A rejected `fetch` is exactly what a stopped server produces, and Angular's fetch
 * backend turns it into the status-0 `HttpErrorResponse` the whole ticket keys off.
 */
const SESSION_USER = {
  id: 1,
  email: 'admin',
  displayName: 'Administrator',
  role: 'admin',
  usingDefaultPassword: false,
};

/** Answers `/api/auth/me`, and anything else the app asks for with an empty list. */
const respond = (url: string): Response => {
  const body = url.includes('/api/auth/me') ? SESSION_USER : [];
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};

describe('startApp', () => {
  const unreachableScreen = (): HTMLElement | null =>
    document.querySelector('app-server-unreachable');

  /** The real app is mounted when Angular has put anything of its own inside `<app-root>`. */
  const appMounted = (): boolean =>
    (document.querySelector('app-root')?.childElementCount ?? 0) > 0;

  /** What a connection that is refused looks like to `fetch`: a rejection, not a response. */
  const serverDown = (): void => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))),
    );
  };

  const serverUp = (): void => {
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL) => Promise.resolve(respond(String(input)))),
    );
  };

  beforeEach(() => {
    document.body.innerHTML = '<app-root></app-root>';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('shows the "can\'t reach the server" screen instead of a blank page', async () => {
    serverDown();

    await startApp();

    expect(unreachableScreen()).not.toBeNull();
    expect(unreachableScreen()?.textContent).toContain("Can't reach the server");
    // The address, because a misconfigured base URL is indistinguishable from a stopped server.
    expect(unreachableScreen()?.textContent).toContain('/api');
  });

  it('starts the app normally when the session resolves', async () => {
    serverUp();

    await startApp();

    expect(unreachableScreen()).toBeNull();
    expect(appMounted()).toBe(true);
  });

  it('recovers on Retry once the server is back, without a page reload', async () => {
    serverDown();
    await startApp();

    serverUp();
    unreachableScreen()?.querySelector('button')?.click();
    // The host defers the teardown out of the click's own turn, then bootstraps again.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(unreachableScreen()).toBeNull();
    expect(appMounted()).toBe(true);
  });
});

/**
 * Read as source rather than exercised, because what this asserts is an *absence* — two things
 * bootstrap must no longer do (TICKET-SRV-06). A runtime test can only show that opening the
 * database did not break anything, which it would not, right up until somebody's browser had no
 * IndexedDB. `app-db.ts` and `StorageStatusService` both survive until TICKET-SRV-08 deletes them;
 * the point is that nothing on the startup path reaches for either.
 */
describe('app.config.ts: bootstrap resolves the session and nothing else', () => {
  const source = readFileSync(join(process.cwd(), 'src', 'app', 'app.config.ts'), 'utf-8');

  it('does not open the database', () => {
    expect(source).not.toContain('appDb');
    expect(source).not.toContain('app-db');
  });

  it('does not ask for persistent storage — the data is not in this browser any more', () => {
    expect(source).not.toContain('StorageStatusService');
  });

  it('runs exactly one initializer, and it is the session', () => {
    expect(source.match(/provideAppInitializer\(/g)).toHaveLength(1);
    expect(source).toContain('inject(SessionStore).restore()');
  });
});
