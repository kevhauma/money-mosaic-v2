import {
  CHART_ANIMATION,
  CHART_NO_COLOR_FALLBACK,
  resolveChartCategoricalColors,
} from './chart-theme';

describe('resolveChartCategoricalColors', () => {
  // jsdom has no real `matchMedia` implementation — stub it for each test rather than relying on
  // a spy target that doesn't exist yet.
  const stubPrefersDark = (matches: boolean): void => {
    window.matchMedia = vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the 6-slot light-theme palette when the system prefers light', () => {
    stubPrefersDark(false);

    const colors = resolveChartCategoricalColors();

    expect(colors).toEqual(['#37b78a', '#028a9b', '#5e9ae7', '#5849b2', '#b473d1', '#9b2673']);
  });

  it('returns the 6-slot dark-theme palette when the system prefers dark', () => {
    stubPrefersDark(true);

    const colors = resolveChartCategoricalColors();

    expect(colors).toEqual(['#36a980', '#0394a6', '#5294e6', '#6353c5', '#b06ace', '#a8347f']);
  });

  it('returns a fresh array each call, safe for a caller to mutate', () => {
    stubPrefersDark(false);

    expect(resolveChartCategoricalColors()).not.toBe(resolveChartCategoricalColors());
  });
});

describe('CHART_ANIMATION', () => {
  it("matches design-language.md §6's subtle, no-bounce transition timings", () => {
    expect(CHART_ANIMATION).toEqual({
      animationDuration: 500,
      animationDurationUpdate: 350,
      animationEasing: 'cubicOut',
      animationEasingUpdate: 'cubicOut',
    });
  });
});

describe('CHART_NO_COLOR_FALLBACK', () => {
  it('is the single shared neutral gray for entities without a user-assigned color', () => {
    expect(CHART_NO_COLOR_FALLBACK).toBe('#9ca3af');
  });
});
