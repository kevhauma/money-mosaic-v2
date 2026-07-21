# Money Mosaic — v1.9 Deformable UI Redesign (Overview)

Replaces [v1.5_redesign](../v1.5_redesign/overview.md)'s Bento/Aurora/Swiss-Modernism visual
identity with a Deformable UI aesthetic — soft gummy/candy color, big uniform pill-like radii, one
decorative morphing "blob" shape, spring/overshoot motion on presses and chart renders, and soft
blurred gel-glow depth instead of flat or hard shadows. `v1.5_redesign/design-language.md` is
superseded; **this** [design-language.md](./design-language.md) is what future work should
reference for token values and direction.

**Why a token/primitive swap, not a re-architecture.** Same reasoning as
[v1.9_y2k_redesign](../v1.9_y2k_redesign/overview.md): v1.5's Phase A already extracted every
recurring visual pattern into `shared/ui/` primitives, each driven by daisyUI theme CSS variables
plus a handful of baked-in arbitrary values. This redesign only changes those *values* — same
primitives, same architecture, new palette/shape/depth/type/motion. No new requirement family or
extraction phase needed.

**Theme names unchanged.** `moneymosaic` / `moneymosaic-dark` keep their existing names — only
token values changed — so `core/theme/theme.service.ts` and `chart-theme.ts`'s `DARK_DATA_THEME`
string needed no edits.

## What changed

- `src/styles.css` — both daisyUI theme blocks: new OKLCH gummy/candy color tokens, pill-shaped
  `--radius-field`, chunky-but-soft `--radius-box`/`--radius-selector`, a new `mm-blob` utility
  (asymmetric animated blob shape, decorative surfaces only), and a self-hosted `Baloo 2 Variable`
  display face wired up as the `font-display` Tailwind utility for headings.
- `shared/utils/deform.ts` (new) — `DEFORM_SQUISH_CLASSES` (spring-eased press/hover scale
  transform) and `DEFORM_GLOW_CLASSES` (soft blurred tinted shadow), shared by `mm-button`,
  `mm-paper`, and `mm-badge`.
- `shared/ui/typography` (`mm-text`) — `display`/`heading` variants move to `font-display`; sizes
  and weights otherwise unchanged from v1.5's scale.
- `shared/ui/paper` (`mm-paper`) — `ELEVATION_SHADOW_CLASSES` becomes `DEFORM_GLOW_CLASSES`; `glow`
  becomes a soft mint halo instead of a thin ring; `link` variant gets a gentle press-squish.
- `shared/ui/button` (`mm-button`) — `DEFORM_SQUISH_CLASSES` on every variant except `link`.
- `shared/ui/badge` (`mm-badge`) — `DEFORM_GLOW_CLASSES` on `solid` variant.
- `shared/echarts/chart-theme.ts` — new 6-hue cool-only categorical palette (mint→periwinkle→
  lavender→orchid→bubblegum→coral-pink); animation easing swapped to `elasticOut` (first paint) /
  `bounceOut` (updates) — the theme's most literal "deformable" moment.
- `src/app/app.html` / `app.ts` — nav active-state becomes a soft `bg-primary/15` pill (no border);
  title uses `font-display`.
- `net-worth-header.component.html` — gets a low-opacity, primary-tinted `mm-blob` decorative wash
  behind its content, the app's one hero surface.

## Not touched (inherits automatically)

Dashboard/bento grid layout, and every daisyUI-class-only primitive (`mm-table`, `mm-tabs`,
`mm-dropdown`, `mm-modal`, `mm-input`, `mm-select`, `mm-alert`, etc.) pick up the new palette/shape/
border via daisyUI's theme CSS variables without direct edits. Only the Dashboard got a bespoke
layout rework in v1.5 and that layout is unchanged here; every other routed feature inherits the
new look the same way it inherited v1.5's.

## Tickets — theme-picker feedback follow-ups

Direct user feedback on the unified theme picker (8 themes, one settings page) after all branches
landed. Each links to a `tickets/TICKET-*.md` file with its own user story, as-is/to-be, and
acceptance criteria — this section is only the index.

- [x] [TICKET-UI-16](./tickets/TICKET-UI-16-theme-icon-separator.md) — Per-theme brand icon &
      separator glyph (adds FR-UI-16) — restores Retro-Futurism's atom icon and Cyberpunk's `//`
      slash wordmark, extends the pattern to all 8 themes
- [x] [TICKET-UI-17](./tickets/TICKET-UI-17-single-theme-selector.md) — Collapse to a single theme
      selector, remove the navbar light/dark toggle (adds FR-UI-17) — do this first, the next two
      tickets build on its flattened picker list
- [x] [TICKET-UI-18](./tickets/TICKET-UI-18-full-tile-theme-preview.md) — Full-tile live theme
      preview (adds FR-UI-18) — needs UI-17's tile template
- [x] [TICKET-UI-19](./tickets/TICKET-UI-19-no-hover-zoom-rule.md) — Remove intense hover-zoom, add
      a no-hover-scale design rule — independent, audit-and-prevent
- [x] [TICKET-UI-20](./tickets/TICKET-UI-20-neumorphism-light-variant.md) — Neumorphism: use its
      light-mode clay variant instead of the dark port — independent
- [x] [TICKET-UI-21](./tickets/TICKET-UI-21-default-theme-polish.md) — Default theme polish: safer
      shadows/borders, wider `mm-blob` use, no pill radius on fields/nav (adds FR-UI-21) —
      independent, default theme only

## Considered, not done

- **`mm-blob` on more surfaces** (empty states, every floating card) — kept to one hero surface per
  §2/§7's restraint rule; broader use is a reasonable follow-up once this reads well in practice,
  not part of this pass.
- **Squish on `mm-badge`** — badges aren't pressable, so a press-squish has nothing to trigger it;
  they get the glow treatment only, not the motion treatment.
- **New animation dependency** for spring physics — skipped; ECharts' own `elasticOut`/`bounceOut`
  and CSS `cubic-bezier` overshoot cover it for free, per the standing bundle-budget rule.
- **CVD re-validation of the new chart palette** — not run for this experimental branch (neither
  prior theme branch ran it either); flag before merging any of these branches past an experiment.
