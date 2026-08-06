import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { routes } from './app.routes';

/**
 * Records what the shipped route table actually does with a URL nothing matches — there is no
 * wildcard route, and TICKET-DAT-04 removed the last remnant of the old top-level `/data` route
 * (data management is an embedded Settings section, see TICKET-SET-06's amended record).
 */
describe('app routes: unmatched URLs', () => {
  const navigate = async (url: string): Promise<{ resolved: boolean; error: unknown }> => {
    TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
    const router = TestBed.inject(Router);
    try {
      return { resolved: await router.navigateByUrl(url), error: null };
    } catch (error) {
      return { resolved: false, error };
    }
  };

  it('rejects /data — the route was removed with the Settings embed, and no wildcard catches it', async () => {
    const { resolved, error } = await navigate('/data');

    expect(resolved).toBe(false);
    expect(String(error)).toMatch(/Cannot match any routes/);
  });

  it('rejects any other unmatched URL the same way (no silent redirect to a default page)', async () => {
    const { resolved, error } = await navigate('/definitely-not-a-route');

    expect(resolved).toBe(false);
    expect(String(error)).toMatch(/Cannot match any routes/);
  });

  it('still resolves /settings, which owns the data-management section', async () => {
    const { resolved } = await navigate('/settings');

    expect(resolved).toBe(true);
  });

  // Longer timeout than the default 5s, for the same reason the ML worker spec carries one:
  // resolving this route dynamically imports `EXPLORE_ROUTES`, whose route-level
  // `provideEchartsCore({ echarts })` drags the whole echarts core in with it. That import is fast
  // in isolation and comfortably over 5s inside the full suite's cold module graph — a timeout that
  // says nothing about the route table, which is what this case is actually asserting.
  it('resolves /explore, the routed home for the full-width diagrams (TICKET-EXP-01)', async () => {
    const { resolved } = await navigate('/explore');

    expect(resolved).toBe(true);
  }, 30000);
});
