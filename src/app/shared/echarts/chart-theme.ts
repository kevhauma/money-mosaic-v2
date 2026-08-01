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
