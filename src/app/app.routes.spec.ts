import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { Router, TitleStrategy, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuthApiService, type PublicUser } from '@/core/auth';
import { AppTitleStrategy } from './core/layout/app-title.strategy';
import { routes } from './app.routes';

const ADMIN: PublicUser = {
  id: 1,
  email: 'admin@example.com',
  displayName: 'Admin',
  role: 'admin',
};

/**
 * Every route below `/login` now sits behind `authGuard` (TICKET-AUTH-02), and the guard settles an
 * `unknown` session by calling `GET /api/auth/me`. These cases are about the route *table*, not
 * about who is signed in, so they stub that one call — signed in unless a case says otherwise.
 */
const signedIn = (user: PublicUser | null = ADMIN) => ({
  provide: AuthApiService,
  useValue: {
    me: vi.fn(() => (user ? Promise.resolve(user) : Promise.reject(new Error('401')))),
    login: vi.fn(),
    logout: vi.fn(),
  },
});

/**
 * Records what the shipped route table actually does with a URL nothing matches — there is no
 * wildcard route, and TICKET-DAT-04 removed the last remnant of the old top-level `/data` route
 * (data management is an embedded Settings section, see TICKET-SET-06's amended record).
 */
/**
 * Longer than Vitest's 5s default, for the same reason the ML worker spec carries its own: every
 * case here resolves a real route, and a *matching* one dynamically imports that feature's whole
 * lazy chunk — for `/settings` and `/explore`, hundreds of kilobytes each (the latter pulls in
 * echarts via its route-level `provideEchartsCore`). That import is quick in isolation and
 * comfortably over 5s inside the full suite's cold module graph, so the default turns "the route
 * table is correct" into a timing assertion about esbuild.
 */
const ROUTE_RESOLUTION_TIMEOUT_MS = 30_000;

describe('app routes: unmatched URLs', () => {
  const navigate = async (url: string): Promise<{ resolved: boolean; error: unknown }> => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes), signedIn()] });
    const router = TestBed.inject(Router);
    try {
      return { resolved: await router.navigateByUrl(url), error: null };
    } catch (error) {
      return { resolved: false, error };
    }
  };

  it(
    'rejects /data — the route was removed with the Settings embed, and no wildcard catches it',
    async () => {
      const { resolved, error } = await navigate('/data');

      expect(resolved).toBe(false);
      expect(String(error)).toMatch(/Cannot match any routes/);
    },
    ROUTE_RESOLUTION_TIMEOUT_MS,
  );

  it(
    'rejects any other unmatched URL the same way (no silent redirect to a default page)',
    async () => {
      const { resolved, error } = await navigate('/definitely-not-a-route');

      expect(resolved).toBe(false);
      expect(String(error)).toMatch(/Cannot match any routes/);
    },
    ROUTE_RESOLUTION_TIMEOUT_MS,
  );

  it(
    'still resolves /settings, which owns the data-management section',
    async () => {
      const { resolved } = await navigate('/settings');

      expect(resolved).toBe(true);
    },
    ROUTE_RESOLUTION_TIMEOUT_MS,
  );

  it(
    'resolves /explore, the routed home for the full-width diagrams (TICKET-EXP-01)',
    async () => {
      const { resolved } = await navigate('/explore');

      expect(resolved).toBe(true);
    },
    ROUTE_RESOLUTION_TIMEOUT_MS,
  );

  it(
    'resolves /recurring, the routed home for the recurring payments panel and bills calendar',
    async () => {
      const { resolved } = await navigate('/recurring');

      expect(resolved).toBe(true);
    },
    ROUTE_RESOLUTION_TIMEOUT_MS,
  );

  it(
    'resolves /auto-categoriser, the renamed home of the model training console (TICKET-UI-32)',
    async () => {
      const { resolved } = await navigate('/auto-categoriser');

      expect(resolved).toBe(true);
    },
    ROUTE_RESOLUTION_TIMEOUT_MS,
  );

  it(
    'still resolves the old /learning URL, landing on /auto-categoriser (TICKET-UI-32)',
    async () => {
      // The rename must not break a bookmark or a note written while the page was called
      // Learning — this is the only reason the old path is still in the table.
      TestBed.configureTestingModule({ providers: [provideRouter(routes), signedIn()] });
      const router = TestBed.inject(Router);

      const resolved = await router.navigateByUrl('/learning');

      expect(resolved).toBe(true);
      expect(router.url).toBe('/auto-categoriser');
    },
    ROUTE_RESOLUTION_TIMEOUT_MS,
  );
});

/**
 * The shipped table's own titles (TICKET-TXN-12) — `AppTitleStrategy`'s two branches are covered
 * against a local table in `core/layout/app-title.strategy.spec.ts`; what these cases pin is that
 * each *real* route carries the name of the page it opens, since a page shipped without one is
 * invisible from the tab, the history and a screen reader's navigation announcement.
 */
describe('app routes: page titles', () => {
  const titleAfterNavigating = async (url: string): Promise<string> => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        signedIn(),
        { provide: TitleStrategy, useClass: AppTitleStrategy },
      ],
    });
    await TestBed.inject(Router).navigateByUrl(url);
    return TestBed.inject(Title).getTitle();
  };

  it(
    'names the page the URL opened, ahead of the brand',
    async () => {
      await expect(titleAfterNavigating('/transactions')).resolves.toBe(
        'Transactions · Money Mosaic',
      );
    },
    ROUTE_RESOLUTION_TIMEOUT_MS,
  );

  it(
    'names a child page for itself rather than for its section',
    async () => {
      await expect(titleAfterNavigating('/income/salary')).resolves.toBe(
        'Salary details · Money Mosaic',
      );
    },
    ROUTE_RESOLUTION_TIMEOUT_MS,
  );

  it(
    'resolves a guide URL to that guide, not to a generic "How-to"',
    async () => {
      await expect(titleAfterNavigating('/help/importing-a-bank-statement')).resolves.toBe(
        'Importing a bank statement · Money Mosaic',
      );
    },
    ROUTE_RESOLUTION_TIMEOUT_MS,
  );

  it(
    'leaves the landing page as the bare brand — it is the front door, not a page inside the app',
    async () => {
      await expect(titleAfterNavigating('/home')).resolves.toBe('Money Mosaic');
    },
    ROUTE_RESOLUTION_TIMEOUT_MS,
  );
});

/**
 * What the guard does to the shipped table (TICKET-AUTH-02) — the guard's own branches are covered
 * in `core/auth/auth.guard.spec.ts`; what these pin is that it is actually *attached* here, and
 * that `/login` is the one route it is not attached to.
 */
describe('app routes: the session gate', () => {
  const navigateAs = async (user: PublicUser | null, url: string): Promise<Router> => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes), signedIn(user)] });
    const router = TestBed.inject(Router);
    await router.navigateByUrl(url);
    return router;
  };

  it(
    'sends a signed-out visitor from a deep link to /login, carrying the URL they asked for',
    async () => {
      const router = await navigateAs(null, '/transactions');

      expect(router.url).toBe('/login?returnUrl=%2Ftransactions');
    },
    ROUTE_RESOLUTION_TIMEOUT_MS,
  );

  it(
    'leaves /login itself reachable without a session',
    async () => {
      const router = await navigateAs(null, '/login');

      expect(router.url).toBe('/login');
    },
    ROUTE_RESOLUTION_TIMEOUT_MS,
  );

  it(
    'lets a signed-in visitor straight through to the route they asked for',
    async () => {
      const router = await navigateAs(ADMIN, '/transactions');

      expect(router.url).toBe('/transactions');
    },
    ROUTE_RESOLUTION_TIMEOUT_MS,
  );
});
