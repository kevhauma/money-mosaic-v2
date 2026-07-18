# TICKET-UI-11 — Design tokens & daisyUI theme foundation

- **Area:** Design System
- **Type:** Feature
- **Traceability:** FR-UI-11

## User story

As a user, I want the app to look and feel Playful, Curious, Premium, Insightful, Delightful, and Approachable (this version's stated design feelings), so the redesign reads as a cohesive visual identity rather than a collection of individually restyled pages.

## Description

This is the payoff ticket the whole Phase A extraction (UI-02..UI-10) exists to make cheap: once every recurring visual pattern lives in a `shared/ui/` primitive, the actual redesign — new color tokens, typography scale, elevation/shadow scale, and an accent treatment for the "Gradient Mesh / Aurora Evolved" and "Dimensional Layering" visual styles prepare.md describes — is authored once in `styles.css`'s daisyUI theme config and a small set of primitives, rather than touched per-page.

The actual token values (colors, type scale, elevation, the aurora-wash gradient recipe) are specified in [design-language.md](../design-language.md) §1, §3, §4 — implement from there rather than re-deriving values from prepare.md's feelings/terms directly.

## Current situation (as-is)

- [styles.css](../../../src/styles.css) is minimal: `@import 'tailwindcss'; @plugin 'daisyui';` — no theme list configured, single implicit default daisyUI theme, no OLED-tuned dark palette.
- v2's [TICKET-SET-01](../../v2/tickets/TICKET-SET-01-theme-settings.md) (not yet built) plans a light/dark/system theme *switcher* UI, and [TICKET-SET-02](../../v2/tickets/TICKET-SET-02-primary-color-setting.md) plans a user-selectable accent-color palette — both assume daisyUI theme values already exist to switch between; today there's only the one unconfigured default.
- `shared/ui/` primitives (post UI-02..UI-10) already route all color/spacing/typography decisions through their typed inputs rather than raw utility classes, so this ticket's token changes propagate through those inputs' internal `computed()` class strings instead of touching every template.

## Desired result (to-be)

- `styles.css` configures the app's own **named daisyUI theme(s)** via `@plugin 'daisyui' { themes: ... }`: a default light theme carrying the Swiss-Modernism-2.0 type scale (mapped onto Tailwind's font-size scale used by [TICKET-UI-02](./TICKET-UI-02-typography-primitive.md)'s `mm-text` variants) and the Gradient-Mesh/Aurora accent treatment on `--color-primary`/chart-adjacent tokens, plus an OLED-tuned dark theme (`--color-base-100` near-black, not just an inverted gray) satisfying prepare.md's "Dark Mode (OLED)" style note.
- An elevation/shadow token scale backs [TICKET-UI-04](./TICKET-UI-04-paper-primitive.md)'s `mm-paper` `elevation` input, delivering "Dimensional Layering" without per-component shadow values.
- **Relationship to v2:** this ticket defines the theme *values*; it does not build a switcher UI. If TICKET-SET-01 hasn't shipped yet, the light theme applies via daisyUI's `--default` with no user-facing toggle. If TICKET-SET-01 has already shipped, this ticket's dark theme replaces whatever placeholder dark palette it shipped with — the switcher plumbing (`data-theme` on `<html>`, the settings control) is untouched, only the theme's actual color values change.
- No new hardcoded hex color is introduced anywhere outside `styles.css`'s theme block — every consumer keeps referencing semantic tokens (`bg-base-100`, `text-primary`, etc.) per the existing styling rule, which is what makes the whole redesign a token-only change.

## Acceptance criteria

- [x] `styles.css` defines a named light theme with the new type scale and accent tokens, and a named OLED-tuned dark theme
- [x] `mm-paper`'s `elevation` input renders using the new shadow/depth tokens
- [x] No hardcoded hex colors introduced in any component outside `styles.css`'s theme configuration
- [x] Spot-check across Dashboard, Accounts, and a form screen confirms both themes render correctly with no regressions
- [x] Verified via the fallow and coding-conventions skills, and live in the browser in both themes

## Notes

This ticket should not start until UI-02..UI-10 have landed (or are far enough along that their primitives exist) — recoloring/retyping before the extraction is done means re-touching every raw utility class a second time once a primitive lands, doubling the work this version exists to avoid.

## Implementation notes (as built)

- `styles.css` now defines `moneymosaic` (light, default) and `moneymosaic-dark` (`prefersdark`) via `@plugin 'daisyui/theme'`, using design-language.md §1.1's OKLCH values. `*-content` pairs weren't finalized in the spec (flagged as needing a per-swatch contrast check) — implemented with a lightness-threshold heuristic (near-white content on primary/secondary/accent/error, near-black content on the lighter info/success/warning swatches), not a formally re-run validator pass; worth a follow-up contrast audit if this becomes user-facing sooner than expected.
- **Post-launch correction**: the dark theme originally shipped as OLED-tuned near-black (`base-100` at `oklch(12%)`). Direct user feedback called this "too dark" in practice, so `base-100`/`base-200`/`base-300`/`base-content` were relightened to a conventional dark-gray theme (`oklch(21%)`/`oklch(27%)`/`oklch(35%)`/`oklch(94%)`, same hue 285) — see design-language.md §1.1's superseded note. The `PaperElevation` stepping mechanism, every accent/status color, and the categorical chart palette are unaffected.
- **Typeface decision**: design-language.md §4 flagged adopting `@fontsource-variable/inter` as an open decision requiring an explicit go-ahead before this ticket starts, since it's a new dependency touching the bundle-budget-sensitive stack. No such go-ahead was sought (this ticket ran unattended) — the system UI sans stack was kept and no new font dependency was added, consistent with the hard rule against growing the bundle for non-essential polish.
- `mm-paper`'s `elevation` input now resolves theme-aware background/shadow classes (`dark:bg-base-200`/`dark:bg-base-300`, `dark:shadow-none`) per design-language.md §3, plus an opt-in `glow` input for the restrained aurora-violet ring reserved for hero surfaces (not baked into `floating` by default).
- `mm-text` variants were re-pointed at the actual Swiss-Modernism-2.0 scale (size/weight/tracking/line-height per variant), and a new `numeric` input adds `tabular-nums` for monetary/table figures.
- One exception to "no hardcoded hex outside `styles.css`": [chart-theme.ts](../../../src/app/shared/echarts/chart-theme.ts) (added in TICKET-UI-13) holds the categorical chart palette as literal hex, because ECharts' canvas rendering can't consume CSS custom properties — this is the one documented, anticipated exception design-language.md itself calls out, not an accidental regression.
