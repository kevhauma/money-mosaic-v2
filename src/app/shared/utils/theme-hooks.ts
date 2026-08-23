/**
 * Theme-style hook markers (styles.css) shared by `mm-button` (all variants except `link`, which
 * has no fill for a squish to read against), `mm-paper`'s `link` variant, and `mm-badge`'s `solid`
 * variant. The classes themselves are inert — each theme style's daisyUI block supplies the
 * `--mm-*` custom properties that give them a look. The default Deformable UI theme reads them as
 * a jelly press-squish and a soft primary-tinted gel glow
 * (docs/v1.9_deformable_ui_redesign/design-language.md §3/§4); other theme styles reinterpret or
 * ignore them.
 */
export const MM_SQUISH_CLASS = 'mm-squish';

export const MM_GLOW_CLASS = 'mm-glow';

/**
 * Marks a figure `mm-privacy-blur` is currently hiding (TICKET-PRIV-01). Unlike the two above it
 * carries its own working treatment (Tailwind's `blur-sm`) rather than relying on a theme to supply
 * one — privacy has to hold under every theme, including one that sets no `--mm-*` at all. The hook
 * exists so a theme can *restyle* the treatment (styles.css reads `--mm-privacy-blur`) and so specs
 * have a stable thing to assert on.
 */
export const MM_PRIVACY_BLURRED_CLASS = 'mm-privacy-blurred';

/**
 * The two hooks a money figure's sign resolves to (TICKET-UI-27), reading each theme's own
 * `--mm-money-*` tokens. Like `MM_PRIVACY_BLURRED_CLASS` these carry a working fallback rather than
 * being inert — money has to stay legible under a theme that sets no `--mm-*` at all.
 *
 * Bound through `mm-text`'s `color` input in almost every case; the constants exist so the one
 * mapping (`HOOK_COLOR_CLASSES` in `typography.component.ts`) and every spec that asserts on the
 * rendered class name agree on one spelling.
 */
export const MM_MONEY_POSITIVE_CLASS = 'mm-money-positive';

export const MM_MONEY_NEGATIVE_CLASS = 'mm-money-negative';
