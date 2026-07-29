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
});
