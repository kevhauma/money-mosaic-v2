/**
 * design-language.md §2 — 6-slot categorical chart palette, CVD-safety validated (Machado 2009
 * protan/deutan/tritan) in a fixed order; don't reorder/reshuffle without re-running that
 * validation. Canvas rendering can't consume CSS custom properties directly, so these are the one
 * place a chart-facing hex literal is allowed to live outside `styles.css`'s theme block — every
 * chart-rendering component reads this array rather than hardcoding its own.
 */
const CHART_CATEGORICAL_COLORS_LIGHT = [
  '#37b78a',
  '#028a9b',
  '#5e9ae7',
  '#5849b2',
  '#b473d1',
  '#9b2673',
] as const;

const CHART_CATEGORICAL_COLORS_DARK = [
  '#36a980',
  '#0394a6',
  '#5294e6',
  '#6353c5',
  '#b06ace',
  '#a8347f',
] as const;

/** Must match `core/theme/theme.service.ts`'s `DATA_THEME.dark` value. Reads the actual `data-theme` attribute `ThemeService` sets, not `prefers-color-scheme` directly — canvas can't react to CSS, but it must still follow the user's explicit toggle rather than just the OS preference, which can disagree with it. */
const DARK_DATA_THEME = 'moneymosaic-dark';

function isDarkThemeActive(): boolean {
  return (
    typeof document !== 'undefined' &&
    document.documentElement.getAttribute('data-theme') === DARK_DATA_THEME
  );
}

/** The current theme's fixed-order categorical palette — pass as an `EChartsCoreOption`'s top-level `color`, so any series without its own explicit color (e.g. an account/category with no user-assigned color) falls back to a CVD-safe, theme-aware cycle instead of ECharts' own default palette. */
export function resolveChartCategoricalColors(): string[] {
  return [
    ...(isDarkThemeActive() ? CHART_CATEGORICAL_COLORS_DARK : CHART_CATEGORICAL_COLORS_LIGHT),
  ];
}

/** Single source for the "no color assigned" neutral gray (an uncategorised entry, or an account/category predating the color-picker feature) — previously duplicated as a hardcoded hex literal per chart component. */
export const CHART_NO_COLOR_FALLBACK = '#9ca3af';

/** design-language.md §6 — "Motion-Driven" via ECharts' own animation engine only, no new dependency. Spread into every chart-rendering component's top-level `EChartsCoreOption`. */
export const CHART_ANIMATION = {
  animationDuration: 500,
  animationDurationUpdate: 350,
  animationEasing: 'cubicOut',
  animationEasingUpdate: 'cubicOut',
} as const;
