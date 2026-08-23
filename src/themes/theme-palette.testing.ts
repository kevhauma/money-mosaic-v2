/**
 * Parses the app's daisyUI theme blocks so a spec can hold every theme's palette to a rule that no
 * amount of review discipline enforces on its own (TICKET-UI-27).
 *
 * The rule: a theme's **brand** colour and its **error** colour must be far enough apart in hue to
 * be told apart at a glance. Both default themes shipped five degrees apart, so the Net worth
 * tile's `color="primary"` painted a positive €16,898.26 in the loss red — beside a green "Net cash
 * flow", two positive numbers with opposite colour semantics. Money figures now read their own
 * `--mm-money-*` tokens, which each theme aliases to its success/error pair, so holding error clear
 * of primary is what keeps that aliasing safe for every theme added later.
 *
 * Testing-only (`*.testing.ts`, excluded from `tsconfig.app.json`): this parses CSS off disk at test
 * time and must never reach the bundle.
 */

/** Degrees. 20 was the UX reviewer's suggestion and is kept as the floor: `memphis` (35°) is the
 * closest theme that was already fine, and `retro-futurism` (14°) is the one this forced a re-hue on,
 * so the number sits in the gap between "clearly distinct" and "clearly not". Raising it is a design
 * decision that re-opens several palettes; lowering it puts the original bug back in reach. */
export const MIN_BRAND_ERROR_HUE_DISTANCE = 20;

export type ThemePalette = {
  name: string;
  primaryHue: number;
  errorHue: number;
};

/** Shortest way round the 360° wheel — 350 and 25 are 35 apart, not 325. */
export const hueDistance = (a: number, b: number): number => {
  const raw = Math.abs((((a % 360) + 360) % 360) - (((b % 360) + 360) % 360));
  return Math.min(raw, 360 - raw);
};

/** The hue channel of an `oklch(L C H)` value, or `undefined` for anything else (a `var()` alias, a hex). */
export const oklchHue = (value: string): number | undefined => {
  const match = /^\s*oklch\(\s*[\d.]+%?\s+[\d.]+\s+([\d.]+)/.exec(value);
  return match ? Number(match[1]) : undefined;
};

/** daisyUI theme blocks are flat declaration lists with no nested rules, so "up to the next `}`" is
 * the whole block — and does not depend on how the closing brace happens to be indented. */
const THEME_BLOCK = /@plugin\s+'daisyui\/theme'\s*\{([^}]*)\}/g;

const declaration = (block: string, property: string): string | undefined =>
  new RegExp(`${property}:\\s*([^;]+);`).exec(block)?.[1]?.trim();

/**
 * Every `@plugin 'daisyui/theme' { … }` block in one stylesheet, as name + the two hues the guard
 * cares about. A block missing a name, a primary or an error is skipped rather than guessed at — the
 * caller asserts on the *count* it found, so a theme that stops parsing fails loudly instead of
 * quietly passing.
 */
export const parseThemePalettes = (css: string): ThemePalette[] => {
  const palettes: ThemePalette[] = [];

  for (const [, block] of css.matchAll(THEME_BLOCK)) {
    const name = /name:\s*'([^']+)'/.exec(block)?.[1];
    const primaryHue = oklchHue(declaration(block, '--color-primary') ?? '');
    const errorHue = oklchHue(declaration(block, '--color-error') ?? '');
    if (!name || primaryHue === undefined || errorHue === undefined) continue;

    palettes.push({ name, primaryHue, errorHue });
  }

  return palettes;
};

/** The themes whose brand and error colours are too close to tell apart — empty is the passing state. */
export const collidingThemes = (
  palettes: readonly ThemePalette[],
  minimum = MIN_BRAND_ERROR_HUE_DISTANCE,
): { name: string; distance: number }[] =>
  palettes
    .map(({ name, primaryHue, errorHue }) => ({
      name,
      distance: hueDistance(primaryHue, errorHue),
    }))
    .filter(({ distance }) => distance < minimum);
