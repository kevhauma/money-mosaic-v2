import { ACCENT_COLORS } from '@/core/theme';
import {
  CHART_NO_COLOR_FALLBACK,
  resolveChartAnimation,
  resolveChartCategoricalColors,
  resolveChartHeatmapColors,
  resolveGrossSeriesColor,
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

describe('resolveChartHeatmapColors (TICKET-STAT-29)', () => {
  const HEX = /^#[0-9a-f]{6}$/;

  it('ramps from a faded tint up to the theme’s own leading accent', () => {
    setDataTheme('deformable');

    const ramp = resolveChartHeatmapColors();

    expect(ramp).toHaveLength(3);
    expect(ramp[2]).toBe(resolveChartCategoricalColors()[0]); // the top of the ramp is the accent itself
    expect(ramp.every((color) => HEX.test(color))).toBe(true);
  });

  it('fades toward white on a light theme and toward black on a dark one', () => {
    setDataTheme('deformable');
    const lightLow = resolveChartHeatmapColors()[0];

    setDataTheme('deformable-dark');
    const darkLow = resolveChartHeatmapColors()[0];

    // Same position in the ramp, opposite ends of the brightness scale.
    const brightness = (hex: string): number =>
      parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
    expect(brightness(lightLow)).toBeGreaterThan(brightness(darkLow));
  });

  it('rises monotonically in saturation from low to high stop', () => {
    setDataTheme('cyberpunk');

    const ramp = resolveChartHeatmapColors();

    const distanceFromBlack = (hex: string): number =>
      parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
    // Cyberpunk is a dark-plot theme, so each stop sits further from the background than the last.
    expect(distanceFromBlack(ramp[0])).toBeLessThan(distanceFromBlack(ramp[1]));
    expect(distanceFromBlack(ramp[1])).toBeLessThan(distanceFromBlack(ramp[2]));
  });

  it('gives every theme in the catalogue a valid three-stop ramp, unknown themes included', () => {
    for (const theme of [
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
    ]) {
      setDataTheme(theme);

      const ramp = resolveChartHeatmapColors();

      expect(ramp, theme).toHaveLength(3);
      expect(
        ramp.every((color) => HEX.test(color)),
        theme,
      ).toBe(true);
    }
  });
});
