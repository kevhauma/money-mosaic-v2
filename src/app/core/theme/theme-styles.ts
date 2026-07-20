export type ThemeMode = 'light' | 'dark';

export type ThemeStyleId =
  | 'deformable'
  | 'neumorphism'
  | 'liquid-glass'
  | 'cyberpunk'
  | 'skeuomorphism'
  | 'anti-polish'
  | 'memphis'
  | 'retro-futurism';

export type ThemeStyle = {
  id: ThemeStyleId;
  label: string;
  /** One-line pitch shown on the settings page's style previews. */
  tagline: string;
  /**
   * daisyUI theme name (styles.css `@plugin 'daisyui/theme'` block) applied as `data-theme` per
   * mode. A key's absence means the style doesn't support that mode and can't be picked for it.
   */
  dataTheme: Partial<Record<ThemeMode, string>>;
};

/**
 * The style catalogue behind the settings page's theme picker. Only "Deformable UI" spans both
 * modes — every other style was designed against one background and is offered only there. Each
 * entry's `dataTheme` names must match a theme block in styles.css AND (for dark ones) appear in
 * styles.css's `dark` custom-variant list.
 */
export const THEME_STYLES: readonly ThemeStyle[] = [
  {
    id: 'deformable',
    label: 'Default',
    tagline: 'Soft gummy material — jelly buttons, gel glows, pill shapes.',
    dataTheme: { light: 'deformable', dark: 'deformable-dark' },
  },
  {
    id: 'anti-polish',
    label: 'Textbook',
    tagline: 'Raw, unstyled honesty — hard edges, system type, zero decoration.',
    dataTheme: { light: 'anti-polish' },
  },
  {
    id: 'memphis',
    label: 'Party',
    tagline: 'Playful 80s geometry — thick borders, offset shadows, loud color.',
    dataTheme: { light: 'memphis' },
  },
  {
    id: 'retro-futurism',
    label: 'Nuclear',
    tagline: 'Yesterday’s tomorrow — atomic-age curves and optimistic chrome.',
    dataTheme: { light: 'retro-futurism' },
  },
  {
    id: 'neumorphism',
    label: 'Clay',
    tagline: 'One soft clay slab — surfaces extrude and carve instead of float.',
    dataTheme: { dark: 'neumorphism' },
  },
  {
    id: 'liquid-glass',
    label: 'Disco',
    tagline: 'Translucent frosted layers floating over a deep backdrop.',
    dataTheme: { dark: 'liquid-glass' },
  },
  {
    id: 'cyberpunk',
    label: 'Tech',
    tagline: 'Neon-on-black terminal — scanlines, glitches, hard grids.',
    dataTheme: { dark: 'cyberpunk' },
  },
  {
    id: 'skeuomorphism',
    label: 'Leather',
    tagline: 'A leather-and-brass ledger — stitched, embossed, tactile.',
    dataTheme: { dark: 'skeuomorphism' },
  },
];

export const DEFAULT_STYLE: Record<ThemeMode, ThemeStyleId> = {
  light: 'deformable',
  dark: 'deformable',
};

export function themeStyleById(id: string | null): ThemeStyle | undefined {
  return THEME_STYLES.find((style) => style.id === id);
}

/** The styles pickable for a given mode, in catalogue order. */
export function themeStylesForMode(mode: ThemeMode): ThemeStyle[] {
  return THEME_STYLES.filter((style) => style.dataTheme[mode] !== undefined);
}
