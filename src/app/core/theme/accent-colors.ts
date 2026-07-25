export type AccentColorId = 'amber' | 'sky' | 'violet' | 'rose' | 'teal' | 'lime';

export type AccentColor = {
  id: AccentColorId;
  label: string;
  /** `--color-primary`/`--color-primary-content` override applied while a Default Light theme is active. */
  light: { primary: string; primaryContent: string };
  /** Same pair for Default Dark — a separately tuned lightness/chroma, not a CSS-computed derivation of `light`. */
  dark: { primary: string; primaryContent: string };
};

/**
 * Fixed preset palette for the Settings page's accent-color picker (TICKET-SET-02) — deliberately
 * not a freeform color input (see the ticket's Notes). Each preset's OKLCH values were chosen by
 * searching lightness/chroma per hue for >=3.2:1 swatch-vs-`base-100` contrast and >=4.3:1
 * `primaryContent`-vs-`primary` contrast in both modes — both comfortably clear the shipped
 * theme's own primary/secondary/accent tokens' contrast against `base-100` (as low as ~1.7:1),
 * used as the calibration floor rather than picked by eye.
 */
export const ACCENT_COLORS: readonly AccentColor[] = [
  {
    id: 'amber',
    label: 'Amber',
    light: { primary: 'oklch(60% 0.15 85)', primaryContent: 'oklch(18% 0.03 85)' },
    dark: { primary: 'oklch(75% 0.1425 85)', primaryContent: 'oklch(18% 0.03 85)' },
  },
  {
    id: 'sky',
    label: 'Sky',
    light: { primary: 'oklch(60% 0.15 230)', primaryContent: 'oklch(18% 0.03 230)' },
    dark: { primary: 'oklch(75% 0.1425 230)', primaryContent: 'oklch(18% 0.03 230)' },
  },
  {
    id: 'violet',
    label: 'Violet',
    light: { primary: 'oklch(60% 0.17 300)', primaryContent: 'oklch(18% 0.03 300)' },
    dark: { primary: 'oklch(75% 0.1615 300)', primaryContent: 'oklch(18% 0.03 300)' },
  },
  {
    id: 'rose',
    label: 'Rose',
    light: { primary: 'oklch(60% 0.18 350)', primaryContent: 'oklch(18% 0.03 350)' },
    dark: { primary: 'oklch(75% 0.171 350)', primaryContent: 'oklch(18% 0.03 350)' },
  },
  {
    id: 'teal',
    label: 'Teal',
    light: { primary: 'oklch(60% 0.13 195)', primaryContent: 'oklch(18% 0.03 195)' },
    dark: { primary: 'oklch(75% 0.1235 195)', primaryContent: 'oklch(18% 0.03 195)' },
  },
  {
    id: 'lime',
    label: 'Lime',
    light: { primary: 'oklch(60% 0.15 135)', primaryContent: 'oklch(18% 0.03 135)' },
    dark: { primary: 'oklch(75% 0.1425 135)', primaryContent: 'oklch(18% 0.03 135)' },
  },
];

export function accentColorById(id: string | null | undefined): AccentColor | undefined {
  return ACCENT_COLORS.find((color) => color.id === id);
}

/**
 * The Default Light/Dark themes' own baked-in `--color-primary` (`styles.css`'s `deformable`/
 * `deformable-dark` blocks) — shown as the "Default" swatch's actual fill on the Settings page
 * instead of an empty placeholder, so it reads as a real color choice like every preset.
 */
export const DEFAULT_THEME_ACCENT: { light: string; dark: string } = {
  light: 'oklch(68% 0.19 25)',
  dark: 'oklch(74% 0.18 25)',
};
