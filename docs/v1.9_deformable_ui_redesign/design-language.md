# Money Mosaic — Deformable UI Design Language

Supersedes [v1.5_redesign/design-language.md](../v1.5_redesign/design-language.md) wholesale, the
same way [v1.9_y2k_redesign](../v1.9_y2k_redesign/design-language.md) and Gen Z Chaos did on their
own branches — see [prepare.md](../v1.5_redesign/prepare.md)'s design-language experiment
checklist. This is not an extension of the Swiss-Modernism/Aurora identity; every token below is a
full replacement.

## Concept

UI elements read as soft, pliable material — gel, dough, jelly — rather than flat glass or hard
plastic. Three mechanisms carry the identity, applied consistently everywhere Phase A's `shared/ui/`
primitives already centralize styling:

1. **Shape** — big, soft, uniform corners as the baseline (pill-ish fields, chunky rounded cards),
   plus one decorative asymmetric "blob" shape reserved for hero surfaces only.
2. **Motion** — spring/overshoot easing wherever motion already exists: buttons squish on press,
   surfaces settle with elastic overshoot, chart series visibly stretch into place.
3. **Depth** — big, soft, blurred, tinted shadows (a gel glow), never a hard edge.

Same restraint principle both prior theme branches and the original v1.5 doc used for their signature
effect (aurora wash / gloss sheen / hard shadow): the *loud* version of the effect (the `mm-blob`
morphing shape) is opt-in and rare; the *quiet* version (soft radii, soft shadows, spring easing) is
everywhere.

## 1. Color system

A gummy/candy pastel-saturated palette — distinct from both v1.5's muted violet/sky/pink and
v1.9-y2k's chrome/neon. Same three-tier `base-100 → base-200 → base-300` stepping mechanism as every
prior theme; `PaperElevation`'s dark-mode surface-step logic is unaffected.

| Token | Light | Dark |
|---|---|---|
| `--color-base-100` | `oklch(97% 0.015 95)` — warm cream | `oklch(19% 0.02 300)` — soft plum-black |
| `--color-base-200` | `oklch(93% 0.02 95)` | `oklch(25% 0.025 300)` |
| `--color-base-300` | `oklch(87% 0.025 95)` | `oklch(32% 0.03 300)` |
| `--color-base-content` | `oklch(24% 0.03 320)` | `oklch(95% 0.01 300)` |
| `--color-primary` (gummy coral) | `oklch(68% 0.19 25)` | `oklch(74% 0.18 25)` |
| `--color-secondary` (gel periwinkle) | `oklch(62% 0.17 275)` | `oklch(70% 0.16 275)` |
| `--color-accent` (mint jelly) | `oklch(78% 0.16 165)` | `oklch(80% 0.15 165)` |
| `--color-neutral` | `oklch(32% 0.03 300)` | `oklch(88% 0.015 300)` |
| `--color-info` | `oklch(70% 0.14 230)` | `oklch(74% 0.14 230)` |
| `--color-success` | `oklch(74% 0.17 145)` | `oklch(78% 0.16 145)` |
| `--color-warning` | `oklch(82% 0.17 85)` | `oklch(84% 0.16 85)` |
| `--color-error` | `oklch(64% 0.21 20)` | `oklch(70% 0.19 20)` |

`*-content` pairs default to near-white/near-black per swatch as in every prior theme — same
implementation-time contrast-check note applies, not re-derived here.

## 2. Shape — `--radius-*` and `mm-blob`

Soft and uniform as the baseline (daisyUI tokens are single scalar values, so true per-corner
asymmetry can't live here):

| Token | Value | Effect |
|---|---|---|
| `--radius-selector` | `1.75rem` | Checkboxes/toggles/radios read as soft pebbles |
| `--radius-field` | `9999px` | Inputs/selects are full pills |
| `--radius-box` | `1.5rem` | Cards/modals/tables get a big soft rounded-box, no hard corners anywhere |
| `--border` | `1px` | Unchanged from v1.5 — depth comes from shadow/blur, not a chunky outline (that's genZ's territory) |

**`mm-blob`** (new `@utility` in `styles.css`) is the one loud, asymmetric shape in the system: a
4-corner `border-radius` (`60% 40% 30% 70% / 60% 30% 70% 40%`) animated between two blob
configurations on an 8s ease-in-out loop, evoking a slow lava-lamp morph. Reserved for decorative
backdrop washes only — never on an interactive element or anything with legible content on top of
its edge. Approved surfaces: the net-worth header's backdrop (§7), empty-state illustration
backdrops. **Never** on buttons, form fields, tables, or badges — those stay on the quiet, uniform
radius tokens above.

## 3. Motion — squish and glow (`shared/utils/deform.ts`)

No new animation dependency (CSS transitions + ECharts' own engine, per the hard rule against
raising bundle budgets).

`DEFORM_SQUISH_CLASSES` — the jelly-button press: `active:scale-x-95 active:scale-y-105` (squash
wider/shorter on press, the inverse of a real jelly's volume-preserving deformation) transitioning
back out via a spring `cubic-bezier(0.34, 1.56, 0.64, 1)` (a Penner-style "back" ease with overshoot)
over 300ms. Applied to `mm-button` (all variants except `link`, which has no fill for a squish to
read against) and `mm-paper`'s `link` variant.

`DEFORM_GLOW_CLASSES` — soft, large, blurred, primary-tinted shadow (`shadow-[0_8px_24px_-4px_oklch(68%_0.19_25_/_0.35)]`),
replacing v1.5's neutral shadow and both prior themes' harder-edged shadows. Applied to `mm-paper`'s
`raised`/`floating` elevations and `mm-badge`'s `solid` variant.

| Context | Duration | Easing |
|---|---|---|
| Button/paper press-and-release | 300ms | `cubic-bezier(0.34, 1.56, 0.64, 1)` (spring overshoot) |
| `mm-blob` idle morph | 8s, infinite | `ease-in-out` |
| ECharts initial render | 600ms | `elasticOut` |
| ECharts data update | 400ms | `bounceOut` |

Unlike v1.5's deliberate no-bounce rule ("reads as unserious for a finance app"), this theme leans
into overshoot on purpose — that's the entire point of "Deformable UI." The charts are where it
reads most literally: a bar visibly overshoots past its final height and settles back, like it's
made of the same gel as everything else.

## 4. Depth — `mm-paper`

| Elevation | Light | Dark |
|---|---|---|
| `flat` | `border border-base-300`, `bg-base-100` | same |
| `raised` | `bg-base-100` + `DEFORM_GLOW_CLASSES` (primary-tinted soft blur) | `bg-base-200` (no shadow, steps instead — same reasoning as every prior theme: a blurred shadow barely reads on a dark surface) |
| `floating` | `bg-base-100` + a larger `DEFORM_GLOW_CLASSES` variant | `bg-base-300` + optional soft `glow` halo |

`glow` input (opt-in, `floating` only) becomes a soft radial halo (`shadow-[0_0_32px_oklch(78%_0.16_165_/_0.4)]`,
mint-tinted) instead of v1.5's thin ring — reserved for modals and the net-worth header only.

## 5. Typography — `mm-text`

Same six variants, same sizes as v1.5's scale (no reason to relitigate a working type scale) —
only `display`/`heading` change face and weight:

| Variant | Change from v1.5 |
|---|---|
| `display` | `font-display` (Baloo 2 Variable), weight unchanged at 700 |
| `heading` | `font-display`, weight unchanged at 600 |
| `subheading`/`body`/`caption`/`label` | unchanged — a bubbly face at paragraph/label sizes reads worse than the system stack, same call both prior themes made |

**New dependency**: `@fontsource-variable/baloo-2`, self-hosted (no CDN font request — this app is
local-first/offline-capable), same negligible-bundle-impact profile as v1.9-y2k's Fredoka addition.

```css
@import '@fontsource-variable/baloo-2/wght.css';

@theme {
  --font-display: 'Baloo 2 Variable', 'Trebuchet MS', sans-serif;
}
```

## 6. Categorical chart palette

Six cool hues (165°–320°), warm hues (red/amber/green) reserved for success/warning/error per the
standing rule every theme has kept — a category color must never be confused with an amount's sign.
Not re-run through the `dataviz` CVD validator (same as both prior theme branches); flagged here so
a future formal merge re-validates before shipping past this experimental branch.

| Slot | Light | Dark |
|---|---|---|
| 1 — mint | `#5fd4a8` | `#5cc99e` |
| 2 — periwinkle | `#7c8cf0` | `#8b99f5` |
| 3 — lavender | `#a07cf0` | `#ac8ef7` |
| 4 — orchid | `#c26fe0` | `#cc82ea` |
| 5 — bubblegum | `#e26fc9` | `#e884d1` |
| 6 — coral-pink | `#f0708f` | `#f2839c` |

Sequential/diverging rules unchanged from v1.5 (§2 there): primary hue for a single ramp,
success↔error for polarity.

## 7. App shell accent

Nav active-item: full pill (`rounded-full`), soft primary tint background (`bg-primary/15`), bold
`text-primary` — no border, no gradient, matching the "soft everywhere, one loud blob elsewhere"
rule. Navbar/sidebar title uses `font-display`.

The net-worth header — the app's one true hero surface (small as it is, it's the first thing a user
sees) — gets an `mm-blob` decorative wash behind its content, at low opacity (~8%), primary-tinted,
slowly morphing. Nowhere else in the shell gets `mm-blob`.

## Traceability

| Section | Feeds |
|---|---|
| §1 Color | `styles.css` theme blocks |
| §2 Shape | `styles.css` theme blocks + new `mm-blob` utility |
| §3 Motion | `shared/utils/deform.ts` (new), consumed by `mm-button`/`mm-paper`/`mm-badge` |
| §4 Depth | `mm-paper` |
| §5 Typography | `mm-text`, `styles.css` font block, new `@fontsource-variable/baloo-2` dependency |
| §6 Chart palette | `shared/echarts/chart-theme.ts` |
| §7 Shell accent | `app.html`/`app.ts`, `net-worth-header.component.html` |
