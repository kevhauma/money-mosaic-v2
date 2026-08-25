import { ACCENT_COLORS } from '@/core/theme';
import {
  CHART_NO_COLOR_FALLBACK,
  resolveChartAnimation,
  resolveChartCategoricalColors,
  resolveChartPlotMode,
  resolveChartPrimaryColor,
  resolveGrossSeriesColor,
  resolveHeatmapCellColor,
  type GrossSeriesColorId,
} from './chart-theme';

const setDataTheme = (theme: string | null): void => {
  if (theme) document.documentElement.setAttribute('data-theme', theme);
  else document.documentElement.removeAttribute('data-theme');
};

afterEach(() => {
  setDataTheme(null);
});

describe('resolveChartCategoricalColors', () => {
  it('returns the deformable light palette for the default light theme', () => {
    setDataTheme('deformable');

    const colors = resolveChartCategoricalColors();

    expect(colors).toEqual(['#5fd4a8', '#7c8cf0', '#a07cf0', '#c26fe0', '#e26fc9', '#f0708f']);
  });

  it('returns the deformable dark palette for the default dark theme', () => {
    setDataTheme('deformable-dark');

    const colors = resolveChartCategoricalColors();

    expect(colors).toEqual(['#5cc99e', '#8b99f5', '#ac8ef7', '#cc82ea', '#e884d1', '#f2839c']);
  });

  it('returns a style-specific palette for a non-default theme style', () => {
    setDataTheme('cyberpunk');

    const colors = resolveChartCategoricalColors();

    expect(colors).toEqual(['#00e5ff', '#ff2ec4', '#c3f53c', '#8f7bff', '#ffa02e', '#00ffa3']);
  });

  it('defaults to the deformable light palette when no data-theme is set', () => {
    setDataTheme(null);

    const colors = resolveChartCategoricalColors();

    expect(colors).toEqual(['#5fd4a8', '#7c8cf0', '#a07cf0', '#c26fe0', '#e26fc9', '#f0708f']);
  });

  it('falls back to the deformable light palette for an unknown data-theme', () => {
    setDataTheme('not-a-theme');

    const colors = resolveChartCategoricalColors();

    expect(colors).toEqual(['#5fd4a8', '#7c8cf0', '#a07cf0', '#c26fe0', '#e26fc9', '#f0708f']);
  });

  it('returns a fresh array each call, safe for a caller to mutate', () => {
    setDataTheme('deformable');

    expect(resolveChartCategoricalColors()).not.toBe(resolveChartCategoricalColors());
  });
});

describe('resolveChartAnimation', () => {
  it("returns deformable's spring/overshoot timings for the default theme", () => {
    setDataTheme('deformable');

    expect(resolveChartAnimation()).toEqual({
      animationDuration: 600,
      animationDurationUpdate: 400,
      animationEasing: 'elasticOut',
      animationEasingUpdate: 'bounceOut',
    });
  });

  it('returns the style-specific motion for a non-default theme style', () => {
    setDataTheme('anti-polish');

    expect(resolveChartAnimation()).toEqual({
      animationDuration: 200,
      animationDurationUpdate: 150,
      animationEasing: 'linear',
      animationEasingUpdate: 'linear',
    });
  });
});

describe('resolveGrossSeriesColor (TICKET-SET-08)', () => {
  const HEX = /^#[0-9a-f]{6}$/;

  it("returns the picked preset's light-mode hex under a light theme", () => {
    setDataTheme('deformable');

    expect(resolveGrossSeriesColor('violet')).toBe('#8451c9');
  });

  it("returns the picked preset's dark-mode hex under a dark theme", () => {
    setDataTheme('deformable-dark');

    expect(resolveGrossSeriesColor('violet')).toBe('#c89dff');
  });

  it("falls back to the theme's own categorical slot when no color is picked", () => {
    setDataTheme('deformable');

    expect(resolveGrossSeriesColor(undefined)).toBe('#7c8cf0');
  });

  it("falls back to a non-default theme's own categorical slot when no color is picked", () => {
    setDataTheme('cyberpunk');

    expect(resolveGrossSeriesColor(undefined)).toBe('#ff2ec4');
  });

  it('treats an unknown data-theme as light, and its unset fallback as the deformable palette', () => {
    setDataTheme('not-a-theme');

    expect(resolveGrossSeriesColor('violet')).toBe('#8451c9');
    expect(resolveGrossSeriesColor(undefined)).toBe('#7c8cf0');
  });

  it("offers exactly the accent picker's presets — one color vocabulary across the app", () => {
    // `shared/` can't import `@/core` in shipped code, so this spec is what keeps
    // `GrossSeriesColorId` in step with `core/theme`'s `AccentColorId`.
    const ids = ACCENT_COLORS.map((color) => color.id as GrossSeriesColorId);

    for (const id of ids) {
      setDataTheme('deformable');
      expect(resolveGrossSeriesColor(id)).toMatch(HEX);
      setDataTheme('deformable-dark');
      expect(resolveGrossSeriesColor(id)).toMatch(HEX);
    }
  });

  it('never emits an oklch()/CSS-variable string an echarts canvas option could not consume', () => {
    for (const theme of ['deformable', 'deformable-dark', 'cyberpunk', 'not-a-theme']) {
      setDataTheme(theme);
      for (const color of ACCENT_COLORS) {
        expect(resolveGrossSeriesColor(color.id as GrossSeriesColorId)).toMatch(HEX);
      }
      expect(resolveGrossSeriesColor(undefined)).toMatch(HEX);
    }
  });
});

describe('CHART_NO_COLOR_FALLBACK', () => {
  it('is the single shared neutral gray for entities without a user-assigned color', () => {
    expect(CHART_NO_COLOR_FALLBACK).toBe('#9ca3af');
  });
});

const ALL_THEMES = [
  'deformable',
  'deformable-dark',
  'neumorphism',
  'neumorphism-dark',
  'liquid-glass',
  'cyberpunk',
  'skeuomorphism',
  'anti-polish',
  'memphis',
  'retro-futurism',
  'not-a-real-theme',
];

describe('resolveChartPlotMode (TICKET-STAT-34)', () => {
  it('reports dark for a theme whose plot sits on a dark background', () => {
    setDataTheme('deformable-dark');
    expect(resolveChartPlotMode()).toBe('dark');

    setDataTheme('cyberpunk');
    expect(resolveChartPlotMode()).toBe('dark');
  });

  it('reports light for a light theme, an unset one and an unknown one', () => {
    setDataTheme('deformable');
    expect(resolveChartPlotMode()).toBe('light');

    setDataTheme(null);
    expect(resolveChartPlotMode()).toBe('light');

    setDataTheme('not-a-theme');
    expect(resolveChartPlotMode()).toBe('light');
  });
});

describe('resolveChartPrimaryColor (TICKET-STAT-45)', () => {
  const HEX = /^#[0-9a-f]{6}$/;

  /** `--color-primary` as the accent effect sets it: an inline custom property on `<html>`. */
  const setPrimary = (value: string | null): void => {
    if (value) document.documentElement.style.setProperty('--color-primary', value);
    else document.documentElement.style.removeProperty('--color-primary');
  };

  afterEach(() => setPrimary(null));

  it('converts the theme’s OKLCH primary to a canvas-consumable hex', () => {
    setPrimary('oklch(68% 0.19 25)'); // deformable's own

    expect(resolveChartPrimaryColor()).toBe('#f75d59');
  });

  it('follows the accent override the user picked, whatever the theme', () => {
    setDataTheme('deformable-dark');
    setPrimary('oklch(75% 0.1235 195)'); // the teal preset's dark pair

    const teal = resolveChartPrimaryColor();

    expect(teal).toMatch(HEX);
    // Teal, not the theme's baked-in coral: green and blue lead, red trails.
    const [red, green, blue] = [1, 3, 5].map((at) => parseInt(teal.slice(at, at + 2), 16));
    expect(green).toBeGreaterThan(red);
    expect(blue).toBeGreaterThan(red);
  });

  it('accepts a 0–1 lightness as well as a percentage', () => {
    setPrimary('oklch(0.68 0.19 25)');

    expect(resolveChartPrimaryColor()).toBe('#f75d59');
  });

  it('falls back rather than handing echarts something it cannot parse', () => {
    // A theme that aliases primary to a var(), one that declares it as a hex — which
    // `theme-palette.spec.ts` does not allow — and one that declares nothing at all.
    for (const declared of ['var(--color-brand)', '#123abc', null]) {
      setPrimary(declared);
      expect(resolveChartPrimaryColor(), `${declared}`).toMatch(HEX);
    }
  });
});

describe('resolveHeatmapCellColor (TICKET-STAT-34, TICKET-STAT-45)', () => {
  const HEX = /^#[0-9a-f]{6}$/;

  /** A scale with a genuine spread on both sides of its average. */
  const scale = { min: 0, average: 40, max: 100 };
  /** The one hue the whole grid ramps from (TICKET-STAT-45) — the theme's primary. */
  const PRIMARY = '#3366cc';

  const brightness = (hex: string): number =>
    parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);

  /** Hue in degrees — the thing that must survive a move along the ramp. */
  const hue = (hex: string): number => {
    const [red, green, blue] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255);
    const max = Math.max(red, green, blue);
    const spread = max - Math.min(red, green, blue);
    if (spread === 0) return 0;
    const sixths =
      max === red
        ? (green - blue) / spread
        : max === green
          ? (blue - red) / spread + 2
          : (red - green) / spread + 4;
    return (sixths * 60 + 360) % 360;
  };

  it('draws a cell at the scale’s average in the ramp colour exactly, in either mode', () => {
    expect(resolveHeatmapCellColor(PRIMARY, scale, 40, 'light')).toBe(PRIMARY);
    expect(resolveHeatmapCellColor(PRIMARY, scale, 40, 'dark')).toBe(PRIMARY);
  });

  it('on a dark theme, draws below average darker and above average lighter', () => {
    setDataTheme('deformable-dark');
    const mode = resolveChartPlotMode();

    const quiet = resolveHeatmapCellColor(PRIMARY, scale, 0, mode);
    const heavy = resolveHeatmapCellColor(PRIMARY, scale, 100, mode);

    expect(brightness(quiet)).toBeLessThan(brightness(PRIMARY));
    expect(brightness(heavy)).toBeGreaterThan(brightness(PRIMARY));
  });

  it('on a light theme, reverses both directions — heavier spend still stands out more', () => {
    setDataTheme('deformable');
    const mode = resolveChartPlotMode();

    const quiet = resolveHeatmapCellColor(PRIMARY, scale, 0, mode);
    const heavy = resolveHeatmapCellColor(PRIMARY, scale, 100, mode);

    expect(brightness(quiet)).toBeGreaterThan(brightness(PRIMARY));
    expect(brightness(heavy)).toBeLessThan(brightness(PRIMARY));
  });

  it('moves lightness only, keeping the theme’s hue at every intensity', () => {
    const anchorHue = hue(PRIMARY);

    for (const mode of ['light', 'dark'] as const) {
      for (const amount of [0, 10, 40, 70, 100]) {
        // Under a degree of channel-rounding wobble; the hue itself is preserved by mixing toward
        // pure white/black, which scales every channel difference uniformly.
        const drift = Math.abs(
          hue(resolveHeatmapCellColor(PRIMARY, scale, amount, mode)) - anchorHue,
        );
        expect(drift, `${mode} @ ${amount}`).toBeLessThan(1);
      }
    }
  });

  it('draws a scale with no spread flat in the ramp colour, all-zero included', () => {
    const flat = { min: 25, average: 25, max: 25 };
    const empty = { min: 0, average: 0, max: 0 };

    for (const mode of ['light', 'dark'] as const) {
      expect(resolveHeatmapCellColor(PRIMARY, flat, 25, mode)).toBe(PRIMARY);
      expect(resolveHeatmapCellColor(PRIMARY, empty, 0, mode)).toBe(PRIMARY);
    }
  });

  it('reads a cell against the scale it was given, so absolute amounts never leak in', () => {
    // Same shape, amounts 100x apart: a cell at the same position on its own scale draws identically.
    const small = { min: 0, average: 4, max: 10 };
    const large = { min: 0, average: 400, max: 1000 };

    expect(resolveHeatmapCellColor(PRIMARY, small, 10, 'light')).toBe(
      resolveHeatmapCellColor(PRIMARY, large, 1000, 'light'),
    );
    expect(resolveHeatmapCellColor(PRIMARY, small, 0, 'dark')).toBe(
      resolveHeatmapCellColor(PRIMARY, large, 0, 'dark'),
    );
  });

  it('ramps from the neutral gray when that is what it is handed', () => {
    // The fallback `resolveChartPrimaryColor` never returns, but `normalizeHex` still lands on.
    const heavy = resolveHeatmapCellColor(CHART_NO_COLOR_FALLBACK, scale, 100, 'light');

    expect(resolveHeatmapCellColor(CHART_NO_COLOR_FALLBACK, scale, 40, 'light')).toBe(
      CHART_NO_COLOR_FALLBACK,
    );
    expect(heavy).toMatch(HEX);
    expect(brightness(heavy)).toBeLessThan(brightness(CHART_NO_COLOR_FALLBACK));
  });

  it('never emits NaN, a division by zero or a non-hex string an echarts canvas could not consume', () => {
    const anchors = [PRIMARY, '#FFAA00', CHART_NO_COLOR_FALLBACK, 'oklch(0.7 0.1 200)', ''];
    const scales = [scale, { min: 0, average: 0, max: 0 }, { min: 5, average: 5, max: 5 }];

    for (const theme of ALL_THEMES) {
      setDataTheme(theme);
      const mode = resolveChartPlotMode();
      for (const anchor of anchors) {
        for (const amountScale of scales) {
          for (const amount of [0, amountScale.average, amountScale.max, 999]) {
            expect(
              resolveHeatmapCellColor(anchor, amountScale, amount, mode),
              `${theme} ${anchor}`,
            ).toMatch(HEX);
          }
        }
      }
    }
  });
});
