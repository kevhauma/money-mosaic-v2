export type ThemeStyleId =
  | 'deformable'
  | 'deformable-dark'
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
  /** daisyUI theme name (styles.css `@plugin 'daisyui/theme'` block, or a `src/themes/*.css` block) applied as `data-theme`. Must match a theme block AND (if dark) appear in styles.css's `dark` custom-variant list. */
  dataTheme: string;
};

/**
 * The style catalogue behind the settings page's theme picker. Each entry is one selectable
 * theme with a single fixed `data-theme` value — a theme's own light/dark identity is baked into
 * its CSS block (`color-scheme`), not chosen separately by the user. "Default Light"/"Default
 * Dark" are two catalogue entries rather than one style spanning both modes, consistent with every
 * other entry here mapping to exactly one `data-theme` value.
 */
export const THEME_STYLES: readonly ThemeStyle[] = [
  {
    id: 'deformable',
    label: 'Default Light',
    tagline: 'Soft gummy material — jelly buttons, gel glows, pill shapes.',
    dataTheme: 'deformable',
  },
  {
    id: 'deformable-dark',
    label: 'Default Dark',
    tagline: 'Soft gummy material on a dark plum backdrop.',
    dataTheme: 'deformable-dark',
  },
  {
    id: 'anti-polish',
    label: 'Textbook',
    tagline: 'Raw, unstyled honesty — hard edges, system type, zero decoration.',
    dataTheme: 'anti-polish',
  },
  {
    id: 'memphis',
    label: 'Party',
    tagline: 'Playful 80s geometry — thick borders, offset shadows, loud color.',
    dataTheme: 'memphis',
  },
  {
    id: 'retro-futurism',
    label: 'Nuclear',
    tagline: 'Yesterday’s tomorrow — atomic-age curves and optimistic chrome.',
    dataTheme: 'retro-futurism',
  },
  {
    id: 'neumorphism',
    label: 'Clay',
    tagline: 'One soft clay slab — surfaces extrude and carve instead of float.',
    dataTheme: 'neumorphism',
  },
  {
    id: 'liquid-glass',
    label: 'Disco',
    tagline: 'Translucent frosted layers floating over a deep backdrop.',
    dataTheme: 'liquid-glass',
  },
  {
    id: 'cyberpunk',
    label: 'Tech',
    tagline: 'Neon-on-black terminal — scanlines, glitches, hard grids.',
    dataTheme: 'cyberpunk',
  },
  {
    id: 'skeuomorphism',
    label: 'Leather',
    tagline: 'A leather-and-brass ledger — stitched, embossed, tactile.',
    dataTheme: 'skeuomorphism',
  },
];

export const DEFAULT_STYLE: ThemeStyleId = 'deformable';

export function themeStyleById(id: string | null): ThemeStyle | undefined {
  return THEME_STYLES.find((style) => style.id === id);
}
