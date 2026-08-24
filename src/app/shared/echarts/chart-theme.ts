/**
 * Per-theme-style chart styling. Canvas rendering can't consume CSS custom properties, so this is
 * the one place chart-facing hex literals are allowed to live outside the styles.css/theme CSS
 * blocks — every chart-rendering component reads these resolvers rather than hardcoding its own.
 *
 * Both resolvers key off the `data-theme` attribute `ThemeService` sets on `<html>` (one name per
 * theme style, see `core/theme/theme-styles.ts`) — not `prefers-color-scheme` — because canvas
 * must follow the user's explicit choice, which can disagree with the OS preference. Values are
 * read at option-build time, so an already-rendered chart keeps its previous palette until its
 * next data/range-driven rebuild — the same (accepted) staleness the light/dark toggle always had.
 */

/**
 * Deformable UI (default): 6-slot cool-hue (165°–320°) gel/candy categorical palette. Warm hues
 * (red/amber/green) stay reserved for success/warning/error so category color can never be
 * confused with an amount's sign. Only this pair and the v1.5 pair below have been CVD-validated
 * (Machado 2009) — the per-style palettes further down are stylistic choices carried over from
 * their design branches, each explicitly not re-validated there either.
 */
const DEFORMABLE_LIGHT = ['#5fd4a8', '#7c8cf0', '#a07cf0', '#c26fe0', '#e26fc9', '#f0708f'];
const DEFORMABLE_DARK = ['#5cc99e', '#8b99f5', '#ac8ef7', '#cc82ea', '#e884d1', '#f2839c'];

/** v1.5's original CVD-validated palettes — kept for the styles whose design branches never restyled charts (neumorphism, liquid glass, memphis). */
const V15_LIGHT = ['#37b78a', '#028a9b', '#5e9ae7', '#5849b2', '#b473d1', '#9b2673'];
const V15_DARK = ['#36a980', '#0394a6', '#5294e6', '#6353c5', '#b06ace', '#a8347f'];

/** Keyed by `data-theme` name. Missing key → the deformable light palette (also the app default). */
const CHART_CATEGORICAL_COLORS: Record<string, readonly string[]> = {
  deformable: DEFORMABLE_LIGHT,
  'deformable-dark': DEFORMABLE_DARK,
  neumorphism: V15_LIGHT,
  'neumorphism-dark': V15_DARK,
  'liquid-glass': V15_DARK,
  /** Cyberpunk: neon signage hues over the NIGHT CITY grid; slots alternate hue family AND lightness. */
  cyberpunk: ['#00e5ff', '#ff2ec4', '#c3f53c', '#8f7bff', '#ffa02e', '#00ffa3'],
  /** Skeuomorphism: brass, patina copper, garnet, steel, forest green, plum — hardware/material tones. */
  skeuomorphism: ['#dc9e12', '#2ca2a2', '#f14d4c', '#5aa0d0', '#51a556', '#b25e98'],
  /** Anti-polish: deliberately loud and un-harmonized; distinguishability comes from varying lightness across slots, not just hue. */
  'anti-polish': ['#ffe600', '#0033ff', '#ff2d95', '#ff3b00', '#00c2a8', '#7a00ff'],
  memphis: V15_LIGHT,
  /** Retro-Futurism: Atomic Age poster inks — rocket orange, mustard gold, TWA teal, cadet blue, plum, coral red. */
  'retro-futurism': ['#d95d1e', '#c19a1b', '#2e8b74', '#3f78b5', '#8b5ba6', '#c23b5a'],
};

function activeDataTheme(): string {
  return typeof document !== 'undefined'
    ? (document.documentElement.getAttribute('data-theme') ?? 'deformable')
    : 'deformable';
}

/** The active theme style's fixed-order categorical palette — pass as an `EChartsCoreOption`'s top-level `color`, so any series without its own explicit color (e.g. an account/category with no user-assigned color) falls back to a theme-aware cycle instead of ECharts' own default palette. */
export function resolveChartCategoricalColors(): string[] {
  return [...(CHART_CATEGORICAL_COLORS[activeDataTheme()] ?? DEFORMABLE_LIGHT)];
}

/**
 * The categorical slot the Income page's *gross pay* series takes when the user hasn't picked a
 * gross colour (TICKET-SET-08) — slot 1, leaving slot 0 to net, which is the page's established
 * income colour. Not slot 0 for both: gross and net are always drawn together.
 */
const GROSS_FALLBACK_SLOT = 1;

/**
 * Canvas hexes for the gross-pay series, keyed by the same `AccentColorId` presets the accent
 * picker offers (TICKET-SET-08). These duplicate the presets' *hues*, not their OKLCH values:
 * `ACCENT_COLORS` tunes lightness/chroma for a swatch's contrast against `base-100`, while a
 * one-pixel line or a translucent band on a plot needs to read against the plot's own background —
 * so light mode sits darker and slightly more saturated, dark mode brighter. A deliberate second
 * tuning, not a conversion; canvas can't consume the `oklch(...)` strings either way.
 */
const GROSS_SERIES_COLORS = {
  amber: { light: '#9c6600', dark: '#e1af37' },
  sky: { light: '#007fbc', dark: '#35c7ff' },
  violet: { light: '#8451c9', dark: '#c89dff' },
  rose: { light: '#bc3181', dark: '#ff85c7' },
  teal: { light: '#00898b', dark: '#32d0d0' },
  lime: { light: '#448502', dark: '#8fcb6b' },
} satisfies Record<string, { light: string; dark: string }>;

/**
 * The preset ids the gross-series palette offers. Structurally the same union as `core/theme`'s
 * `AccentColorId` — one preset vocabulary across the app — but declared from this map's own keys
 * because `shared/` never imports `@/core`. `chart-theme.spec.ts` asserts the two stay in step, and
 * a preset added to `ACCENT_COLORS` alone fails to compile at every call site until it lands here.
 */
export type GrossSeriesColorId = keyof typeof GROSS_SERIES_COLORS;

/**
 * `data-theme` names whose plot background is dark, so the `dark` half of `GROSS_SERIES_COLORS`
 * applies. Everything else — including an unknown theme — takes `light`.
 */
const DARK_PLOT_THEMES: readonly string[] = [
  'deformable-dark',
  'neumorphism-dark',
  'liquid-glass',
  'cyberpunk',
];

/**
 * The gross-pay series' colour for the active theme: the user's picked preset tuned for this
 * theme's plot background, or — when unset — the theme's own categorical slot reserved for gross,
 * which is exactly the behaviour before the setting existed (TICKET-SET-08). Always a
 * canvas-consumable hex literal, never an `oklch(...)` string or a CSS variable.
 */
export function resolveGrossSeriesColor(id: GrossSeriesColorId | undefined): string {
  const theme = activeDataTheme();
  if (!id) return (CHART_CATEGORICAL_COLORS[theme] ?? DEFORMABLE_LIGHT)[GROSS_FALLBACK_SLOT];

  const preset = GROSS_SERIES_COLORS[id];
  return DARK_PLOT_THEMES.includes(theme) ? preset.dark : preset.light;
}

/** Single source for the "no color assigned" neutral gray (an uncategorised entry, or an account/category predating the color-picker feature) — previously duplicated as a hardcoded hex literal per chart component. Theme-neutral: this hex also leaks into computed stat series (core/stats), so it stays one global value. */
export const CHART_NO_COLOR_FALLBACK = '#9ca3af';

const hexChannels = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16),
  parseInt(hex.slice(3, 5), 16),
  parseInt(hex.slice(5, 7), 16),
];

const toHex = (channel: number): string =>
  Math.round(Math.min(255, Math.max(0, channel)))
    .toString(16)
    .padStart(2, '0');

/** `ratio` 0 keeps `hex`, 1 becomes `toward`. Plain channel lerp — good enough for a ramp, and it keeps this file dependency-free. */
const mixHex = (hex: string, toward: string, ratio: number): string => {
  const from = hexChannels(hex);
  const to = hexChannels(toward);
  return `#${from.map((channel, index) => toHex(channel + (to[index] - channel) * ratio)).join('')}`;
};

/** Whether the active theme's plot sits on a dark background — the one bit of theme a colour ramp needs to know which way "stands out more" points. */
export type ChartPlotMode = 'light' | 'dark';

export function resolveChartPlotMode(): ChartPlotMode {
  return DARK_PLOT_THEMES.includes(activeDataTheme()) ? 'dark' : 'light';
}

/** The slot a heatmap row that is *not* a category shades from — the theme's leading accent. Safe to share with a series palette: a heatmap has no categorical series to collide with. */
const HEATMAP_ACCENT_SLOT = 0;

/**
 * The colour the heatmap's `All` band ramps from (TICKET-STAT-33). The theme's leading accent
 * rather than `CHART_NO_COLOR_FALLBACK`'s grey, which the app reads as "uncategorised" everywhere
 * else and would be a lie on a row that sums every category there is.
 */
export function resolveHeatmapTotalsColor(): string {
  return (CHART_CATEGORICAL_COLORS[activeDataTheme()] ?? DEFORMABLE_LIGHT)[HEATMAP_ACCENT_SLOT];
}

/** One heatmap row's own extent, the scale a cell in it is read against (TICKET-STAT-34). */
export type HeatmapAmountScale = { min: number; average: number; max: number };

/**
 * How far the quietest cell in a row fades into the plot background. High, because a below-average
 * cell is meant to recede — but short of 1, so the row keeps a visible floor rather than dissolving
 * into empty grid.
 */
const TOWARD_BACKGROUND_MAX_MIX = 0.7;

/**
 * How far the heaviest cell moves away from it. Deliberately lower: mixing much past half way into
 * pure white/black washes the hue out, and a row that stops looking like its category defeats the
 * point of shading it in the category's colour at all.
 */
const AWAY_FROM_BACKGROUND_MAX_MIX = 0.5;

/**
 * Where a cell's colour travels, and how far, per side of its row's average — the whole direction
 * rule in four rows rather than a ternary per branch. *Heavier spend always stands out more*: on a
 * dark plot that means toward white, on a light one toward black, and the quiet side is the mirror
 * of it in both.
 */
const HEATMAP_RAMP: Record<
  ChartPlotMode,
  Record<'below' | 'above', { toward: string; mix: number }>
> = {
  light: {
    below: { toward: '#ffffff', mix: TOWARD_BACKGROUND_MAX_MIX },
    above: { toward: '#000000', mix: AWAY_FROM_BACKGROUND_MAX_MIX },
  },
  dark: {
    below: { toward: '#000000', mix: TOWARD_BACKGROUND_MAX_MIX },
    above: { toward: '#ffffff', mix: AWAY_FROM_BACKGROUND_MAX_MIX },
  },
};

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** Anything the colour picker can't have produced (legacy/imported data) falls back rather than reaching `parseInt` and returning `#NaNNaNNaN`. */
const normalizeHex = (hex: string): string =>
  HEX_COLOR.test(hex) ? `#${hex.slice(1).toLowerCase()}` : CHART_NO_COLOR_FALLBACK;

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * One heatmap cell's colour, against whatever `scale` the caller pools it on (TICKET-STAT-34) —
 * replacing TICKET-STAT-29's amount-labelled `visualMap`, which gave the whole chart one ramp and
 * one legend. **Which** amounts make up the scale is the caller's decision, not this function's:
 * the spending heatmap pools every category cell into one and puts its `All` strip on a second
 * (TICKET-STAT-43), so "row" appears nowhere in the contract below.
 *
 * The scale's **average** is the anchor: a cell there draws in the category's configured colour
 * exactly, so the colour most cells sit near is the one on the category's dot everywhere else in
 * the app. Below it the colour moves toward the plot background, above it away from it — stated
 * once as *heavier spend always stands out more*, which on a dark theme means lighter and on a
 * light theme darker, rather than two palettes to keep in sync.
 *
 * The average, not the range's midpoint: a grid with one huge Friday and four quiet days has an
 * average far below its midpoint, and it is "what this usually costs on a day like this" that a
 * cell is read against.
 *
 * Only lightness moves — mixing toward pure white or pure black scales every channel difference
 * uniformly, so the hue survives untouched and a cell stays recognisably *that* category's at
 * every intensity. This is also why depth, not shade, is what compares across categories: two
 * equal amounts in differently-coloured rows land at the same ramp position in their own hues.
 * A scale with no spread (every amount equal, all-zero included) draws flat in the category colour
 * instead of dividing by an empty range.
 */
export function resolveHeatmapCellColor(
  categoryColor: string,
  scale: HeatmapAmountScale,
  amount: number,
  mode: ChartPlotMode,
): string {
  const anchor = normalizeHex(categoryColor);
  const { min, average, max } = scale;
  const above = amount >= average;

  // The scale's own reach on the side the cell falls. Zero on a scale with no spread — including
  // the all-equal and all-zero cases — which draws flat rather than dividing by it.
  const span = above ? max - average : average - min;
  if (span <= 0) return anchor;

  const { toward, mix } = HEATMAP_RAMP[mode][above ? 'above' : 'below'];
  return mixHex(anchor, toward, clamp01(Math.abs(amount - average) / span) * mix);
}

/** Literal union (not `string`) so the spread stays assignable to ECharts' `AnimationEasing`-typed option fields. */
type ChartEasing = 'elasticOut' | 'bounceOut' | 'cubicOut' | 'linear' | 'backOut';

type ChartAnimation = {
  animationDuration: number;
  animationDurationUpdate: number;
  animationEasing: ChartEasing;
  animationEasingUpdate: ChartEasing;
};

/** Deformable UI: spring/overshoot via ECharts' own easings — `elasticOut` on first paint, `bounceOut` on updates; a series visibly overshoots and settles back, like it's made of gel. */
const DEFORMABLE_ANIMATION: ChartAnimation = {
  animationDuration: 600,
  animationDurationUpdate: 400,
  animationEasing: 'elasticOut',
  animationEasingUpdate: 'bounceOut',
};

/** v1.5's restrained ease-out, kept for the styles whose branches never changed chart motion. */
const V15_ANIMATION: ChartAnimation = {
  animationDuration: 500,
  animationDurationUpdate: 350,
  animationEasing: 'cubicOut',
  animationEasingUpdate: 'cubicOut',
};

const CHART_ANIMATIONS: Record<string, ChartAnimation> = {
  deformable: DEFORMABLE_ANIMATION,
  'deformable-dark': DEFORMABLE_ANIMATION,
  neumorphism: V15_ANIMATION,
  'neumorphism-dark': V15_ANIMATION,
  'liquid-glass': V15_ANIMATION,
  cyberpunk: V15_ANIMATION,
  skeuomorphism: V15_ANIMATION,
  memphis: V15_ANIMATION,
  /** Anti-polish: charts snap into place on a hard linear cut rather than easing in. */
  'anti-polish': {
    animationDuration: 200,
    animationDurationUpdate: 150,
    animationEasing: 'linear',
    animationEasingUpdate: 'linear',
  },
  /** Retro-Futurism: `backOut` gives series a little launch-and-settle overshoot, like an analog gauge needle. */
  'retro-futurism': {
    animationDuration: 600,
    animationDurationUpdate: 400,
    animationEasing: 'backOut',
    animationEasingUpdate: 'backOut',
  },
};

/** The active theme style's chart motion — spread into every chart-rendering component's top-level `EChartsCoreOption` (ECharts' own animation engine only, no new dependency). */
export function resolveChartAnimation(): ChartAnimation {
  return CHART_ANIMATIONS[activeDataTheme()] ?? DEFORMABLE_ANIMATION;
}
