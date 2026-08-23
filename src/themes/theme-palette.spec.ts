import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  MIN_BRAND_ERROR_HUE_DISTANCE,
  collidingThemes,
  hueDistance,
  oklchHue,
  parseThemePalettes,
  type ThemePalette,
} from './theme-palette.testing';

/**
 * The guard TICKET-UI-27 asked for: an automated check, not a review convention. A theme whose brand
 * colour and error colour are within `MIN_BRAND_ERROR_HUE_DISTANCE` fails here, so the defect that
 * made a positive Net worth render in the loss red cannot be reintroduced by a new theme.
 *
 * Reads the real stylesheets off disk rather than a fixture: a check that passes against a copy of
 * the palette is exactly the check that let this ship.
 */
const readCss = (): { file: string; css: string }[] => [
  { file: 'src/styles.css', css: readFileSync('src/styles.css', 'utf8') },
  ...readdirSync('src/themes')
    .filter((entry) => entry.endsWith('.css'))
    .map((entry) => ({
      file: `src/themes/${entry}`,
      css: readFileSync(join('src/themes', entry), 'utf8'),
    })),
];

const allPalettes = (): ThemePalette[] => readCss().flatMap(({ css }) => parseThemePalettes(css));

describe('hueDistance', () => {
  it('takes the shortest way round the wheel', () => {
    expect(hueDistance(25, 20)).toBe(5);
    // memphis: 350 vs 25 is 35 apart, not the 325 a plain subtraction gives.
    expect(hueDistance(350, 25)).toBe(35);
    expect(hueDistance(0, 180)).toBe(180);
    expect(hueDistance(370, 10)).toBe(0);
  });
});

describe('oklchHue', () => {
  it('reads the third channel of an oklch triple', () => {
    expect(oklchHue('oklch(68% 0.19 25)')).toBe(25);
    expect(oklchHue('oklch(62% 0.22 0)')).toBe(0);
  });

  it('is undefined for anything that is not a literal oklch colour', () => {
    // A theme aliasing rather than stating a colour is not something this guard can judge.
    expect(oklchHue('var(--color-error)')).toBeUndefined();
    expect(oklchHue('#ff3366')).toBeUndefined();
  });
});

describe('theme palettes: brand and error stay tellable apart (TICKET-UI-27)', () => {
  it('parses every shipped theme — ten of them, across styles.css and src/themes', () => {
    const names = allPalettes().map((palette) => palette.name);

    // Asserted as a set, not a count alone: a theme that stops parsing (renamed property, reformatted
    // block) would otherwise drop out silently and take its own guard with it.
    expect(names.sort()).toEqual([
      'anti-polish',
      'cyberpunk',
      'deformable',
      'deformable-dark',
      'liquid-glass',
      'memphis',
      'neumorphism',
      'neumorphism-dark',
      'retro-futurism',
      'skeuomorphism',
    ]);
  });

  it(`keeps every theme's primary at least ${MIN_BRAND_ERROR_HUE_DISTANCE}° from its error`, () => {
    // Both defaults were at 5° and retro-futurism at 14° before this ticket; the message names the
    // offender and its distance so the failure is actionable without re-deriving anything.
    expect(collidingThemes(allPalettes())).toEqual([]);
  });

  it('fails a deliberately-colliding fixture theme', () => {
    const colliding = `
      @plugin 'daisyui/theme' {
        name: 'regression';
        --color-primary: oklch(68% 0.19 25);
        --color-error: oklch(64% 0.21 20);
      }
    `;

    const palettes = parseThemePalettes(colliding);

    expect(palettes).toEqual([{ name: 'regression', primaryHue: 25, errorHue: 20 }]);
    // The exact palette both default themes shipped with — the guard has to reject it, or it is
    // asserting nothing.
    expect(collidingThemes(palettes)).toEqual([{ name: 'regression', distance: 5 }]);
  });

  it('every theme states its own money tokens rather than inheriting another theme’s', () => {
    // `--mm-money-*` resolves from the nearest `[data-theme]` ancestor, which is what makes the
    // settings page's nested theme previews render in their own colours — a theme that omits them
    // would silently borrow whatever the page root is set to.
    for (const { file, css } of readCss()) {
      const themeBlocks = (css.match(/@plugin\s+'daisyui\/theme'/g) ?? []).length;

      expect({ file, positive: (css.match(/--mm-money-positive:/g) ?? []).length }).toEqual({
        file,
        positive: themeBlocks,
      });
      expect({ file, negative: (css.match(/--mm-money-negative:/g) ?? []).length }).toEqual({
        file,
        negative: themeBlocks,
      });
    }
  });
});
