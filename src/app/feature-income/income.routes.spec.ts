import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { INCOME_ROUTES } from './income.routes';

/**
 * The Income feature's two configuration surfaces became real routes in TICKET-INC-18. Asserted
 * here rather than assumed: a lazy `loadComponent` that throws only shows up on navigation, and a
 * grouping route with `children` is easy to nest wrongly and never notice until the page 404s.
 */
describe('INCOME_ROUTES (TICKET-INC-18)', () => {
  const navigate = async (url: string): Promise<boolean> => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'income', children: INCOME_ROUTES }])],
    });
    return TestBed.inject(Router).navigateByUrl(url);
  };

  it('resolves the overview at /income', async () => {
    expect(await navigate('/income')).toBe(true);
  });

  it('resolves the settings page at /income/settings', async () => {
    expect(await navigate('/income/settings')).toBe(true);
  });

  it('resolves the salary page at /income/salary', async () => {
    expect(await navigate('/income/salary')).toBe(true);
  });

  it('puts all three under one provider scope, so echarts is configured once', () => {
    const [group] = INCOME_ROUTES;

    expect(group.providers).toHaveLength(1);
    expect(group.children?.map((child) => child.path)).toEqual(['', 'settings', 'salary']);
    // The grouping route renders nothing itself — a component here would need its own outlet.
    expect(group.component).toBeUndefined();
    expect(group.loadComponent).toBeUndefined();
  });
});
