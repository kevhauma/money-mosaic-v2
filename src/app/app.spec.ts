import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router, provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { RangeStore, resolvePresetRange } from '@/core/stats';
import { STAT_QUERY_PARAMS } from '@/shared/utils';
import { App } from './app';

// Mirrors RangeStore's own default state (this-month/month) so the ActivatedRoute mock can be
// set up *before* any TestBed.inject call — overrideProvider must run before the testing module
// is instantiated, so we can't read the default off an injected RangeStore first.
const defaultQueryParams = (): Record<string, string> => {
  const todayIso = new Date().toISOString().slice(0, 10);
  const { from, to } = resolvePresetRange('this-month', todayIso);
  return {
    [STAT_QUERY_PARAMS.from]: from,
    [STAT_QUERY_PARAMS.to]: to,
    [STAT_QUERY_PARAMS.groupBy]: 'month',
  };
};

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('does not navigate when the URL already mirrors the range store state', async () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { queryParamMap: convertToParamMap(defaultQueryParams()) } },
    });
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('navigates exactly once when groupBy changes', async () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { queryParamMap: convertToParamMap(defaultQueryParams()) } },
    });
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigate');

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(navigateSpy).not.toHaveBeenCalled();

    const rangeStore = TestBed.inject(RangeStore);
    rangeStore.setGroupBy('week');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(
      [],
      expect.objectContaining({
        queryParams: expect.objectContaining({ [STAT_QUERY_PARAMS.groupBy]: 'week' }),
      }),
    );
  });
});
