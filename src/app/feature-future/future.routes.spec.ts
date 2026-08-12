import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AppSettingsRepository } from '@/core/data-access';
import { FutureOverviewComponent } from './components/future-overview/future-overview.component';
import { FUTURE_ROUTES } from './future.routes';

describe('FUTURE_ROUTES (TICKET-FUT-03)', () => {
  it('mirrors EXPLORE_ROUTES: one component-less grouping route with the overview as its "" child', () => {
    expect(FUTURE_ROUTES).toHaveLength(1);
    expect(FUTURE_ROUTES[0].path).toBe('');
    expect(FUTURE_ROUTES[0].component).toBeUndefined();
    expect(FUTURE_ROUTES[0].children).toHaveLength(1);
    expect(FUTURE_ROUTES[0].children?.[0].path).toBe('');
  });

  it('provides the ECharts core at route level, so FUT-07’s chart needs no wiring of its own', () => {
    // Route-level rather than in the component, which is what keeps echarts inside this feature's
    // lazy chunk (TICKET-PERF-01).
    expect(FUTURE_ROUTES[0].providers?.length).toBeGreaterThan(0);
  });

  it('resolves /future to the overview component', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: 'future', children: FUTURE_ROUTES }]),
        {
          provide: AppSettingsRepository,
          useValue: { get: vi.fn().mockResolvedValue({ id: 1 }), setPrivacyMode: vi.fn() },
        },
      ],
    });
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/future');

    expect(router.url).toBe('/future');

    let leaf = router.routerState.snapshot.root;
    while (leaf.firstChild) leaf = leaf.firstChild;

    expect(leaf.routeConfig?.loadComponent).toBeDefined();
    expect(await leaf.routeConfig?.loadComponent?.()).toBe(FutureOverviewComponent);
  });
});
