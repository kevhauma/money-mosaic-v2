# Money Mosaic — v1.5 Design Language

This turns [prepare.md](./prepare.md)'s six feelings, four terms, and eight named styles into
actual values: color tokens, a type scale, an elevation scale, a categorical chart palette, motion
timings, and a bento-grid sizing plan. Phase A (the `shared/ui/` extraction) is done — every
recurring visual pattern now has a primitive with typed inputs. This document is what fills those
inputs in Phase B. It doesn't change any ticket's scope; it answers the question each Phase B
ticket currently leaves open ("what color", "what scale", "what shadow").

Every color below was generated in OKLCH and machine-validated with the `dataviz` skill's
CVD/contrast/chroma checks (`scripts/validate_palette.js`), not eyeballed — see "How these were
derived" at the end for the exact commands, so a future palette change can be re-validated the same
way.

## How to read this document

Each section names the primitive(s) and ticket(s) it feeds. Nothing here is final pixel-locked
code — it's the spec [TICKET-UI-11](./tickets/TICKET-UI-11-design-tokens-theme.md) through
[TICKET-UI-14](./tickets/TICKET-UI-14-app-shell-visual-pass.md) implement. Two decisions below are
flagged as **open** because they add a new dependency or fall outside every existing ticket's
scope — don't act on those without a go-ahead.

## 1. Color system

### 1.1 Semantic tokens (daisyUI theme)

Two named themes: a light default and a dark theme, per TICKET-UI-11. Both are built from the same
six hue families so the two themes read as one identity, not a re-skin. Primary, secondary, and
accent are three members of the categorical chart family (§2) — the brand color *is* a chart
color, which is what makes "the charts are the hero" and "the UI has a consistent identity" the
same design decision instead of two.

> **Superseded (post-launch user feedback):** this table originally specified an OLED-tuned
> (near-black, `base-100` at `oklch(12%)`) dark theme. Direct user feedback called it "too dark" in
> practice, so the dark column below reflects the corrected, lighter values actually shipped in
> `styles.css` — a conventional dark-gray theme at the same hue (285) rather than near-black. The
> `base-100 → base-200 → base-300` stepping direction and every other section of this document are
> unaffected.

| Token | Hue role | Light | Dark |
|---|---|---|---|
| `--color-base-100` | page/surface | `oklch(98.5% 0.004 90)` `#fbfaf7` | `oklch(21% 0.006 285)` |
| `--color-base-200` | raised surface | `oklch(96% 0.005 90)` `#f3f2ee` | `oklch(27% 0.008 285)` |
| `--color-base-300` | border / most-elevated | `oklch(91% 0.006 90)` `#e3e1dd` | `oklch(35% 0.01 285)` |
| `--color-base-content` | body text | `oklch(19% 0.01 285)` `#131318` | `oklch(94% 0.004 285)` |
| `--color-primary` (violet) | brand, primary actions | `oklch(48% 0.16 285)` `#5849b2` | `oklch(60% 0.17 285)` `#6353c5` |
| `--color-secondary` (sky) | secondary actions, links | `oklch(58% 0.10 210)` `#028a9b` | `oklch(61% 0.105 210)` `#0394a6` |
| `--color-accent` (pink) | rare highlight, gradient stop | `oklch(48% 0.17 345)` `#9b2673` | `oklch(52% 0.17 345)` `#a8347f` |
| `--color-info` (indigo) | informational | `oklch(68% 0.13 255)` `#5e9ae7` | `oklch(66% 0.14 255)` `#5294e6` |
| `--color-success` (green) | positive amounts, confirmations | `oklch(58% 0.15 145)` `#33903c` | `oklch(68% 0.15 145)` `#54b05a` |
| `--color-warning` (amber) | caution | `oklch(78% 0.16 85)` `#e6ad00` | `oklch(80% 0.16 85)` `#edb417` |
| `--color-error` (red) | negative amounts, destructive | `oklch(58% 0.19 25)` `#d33a3c` | `oklch(68% 0.17 25)` `#ef6661` |

Base tones carry a deliberate hue tint rather than pure gray: warm off-white (`hue 90`) in light
mode, violet-tinted dark gray (`hue 285`, matching primary) in dark mode — the same "intentional,
branded dark" idea as the original OLED approach (Premium, not "gray inverted to `#000`"), just at
a lighter, more conventional lightness level.

`*-content` pairs (`--color-primary-content`, etc.) aren't finalized here — each needs a real WCAG
contrast check against its own background at implementation time; default to near-white
(`oklch(98% 0.01 <hue>)`) for primary/secondary/accent/error and verify info/warning/success
per-swatch since those sit lighter.

**No hardcoded hex outside `styles.css`'s theme block** — every consumer keeps referencing
`bg-primary`, `text-success`, etc., per the existing styling rule. This table is the one place raw
values live.

### 1.2 Gradient Mesh / Aurora accent

The "Gradient Mesh / Aurora Evolved" style is a background *wash*, not a UI element treatment — it
never appears on a button, badge, border, or anything text-sized. Overusing it is the single
easiest way to make this feel dated instead of premium, so the rule is: **one soft, low-opacity,
multi-stop radial gradient, used only behind hero content, everywhere else stays flat.**

```css
.mm-aurora-wash {
  background:
    radial-gradient(120% 120% at 15% 20%, oklch(75% 0.10 285 / 0.10), transparent 55%),
    radial-gradient(120% 120% at 85% 30%, oklch(75% 0.09 210 / 0.08), transparent 55%),
    radial-gradient(140% 140% at 60% 90%, oklch(75% 0.10 345 / 0.07), transparent 60%);
}
```

Three soft blobs at primary/secondary/accent hues, each under 10% opacity — reads as atmosphere,
not decoration. Approved surfaces for this wash:

- The dashboard's `net-worth-header` panel background (TICKET-UI-12) — the single most "hero"
  surface in the app.
- Optionally, a very faint (≤4% opacity) version behind `trend-chart-panel`'s plot area, never
  overlapping the data lines' contrast zone.
- Empty-state illustration backdrops (`mm-empty-state`).

**Never** on: buttons (`mm-button primary` stays a solid violet fill), form fields, tables, badges,
the nav sidebar (TICKET-UI-14's accent treatment is a solid left-border/tint, not a gradient), or
any status color.

### 1.3 Dark mode ("Dimensional Layering" without shadows)

Box-shadows barely read against a dark surface regardless of exactly how dark — dark mode's
"Dimensional Layering" comes from stepping `base-100 → base-200 → base-300` instead. See §3
(elevation) for how this maps onto `mm-paper`'s `elevation` input concretely. (This section
originally specified a near-black OLED surface; see §1.1's superseded note — the stepping
mechanism itself is unchanged, only the absolute lightness of the three base tones.)

## 2. Categorical chart palette

Six hues, fixed order, validated against `dataviz`'s CVD-safety checks (Machado 2009 protan/deutan/tritan
transforms) for both themes. All six pass every check with **no WARN** in dark mode; light mode has
two contrast WARNs (below), which is why the existing sr-only accessible-numbers table pattern
([TICKET-STAT-20](../v1.3_code_review/tickets/TICKET-STAT-20-trend-chart-accessible-numbers.md))
stays mandatory — color is never the only channel.

| Slot | Name | Light | Dark | Notes |
|---|---|---|---|---|
| 1 | Teal-green | `#37b78a` | `#36a980` | contrast WARN in light — pair with a label |
| 2 | Sky (= secondary) | `#028a9b` | `#0394a6` | |
| 3 | Indigo (= info) | `#5e9ae7` | `#5294e6` | contrast WARN in light — pair with a label |
| 4 | Violet (= primary) | `#5849b2` | `#6353c5` | |
| 5 | Purple | `#b473d1` | `#b06ace` | |
| 6 | Pink (= accent) | `#9b2673` | `#a8347f` | |

Order is the CVD-safety mechanism (worst adjacent ΔE 21.0 protan in light, 16.2 in dark — both well
clear of the 12.0 target) — **don't reorder or reshuffle** without re-running the validator. All
six hues live in the cool half of the wheel (165°–345°) by design: warm hues (red/amber/green,
25°/85°/145°) are reserved for success/warning/error status meaning and deliberately excluded from
the categorical set, so a category color can never be mistaken for an amount's sign. If a chart
needs a 7th+ series, fold the smallest into "Other" per the dataviz skill's rule rather than adding
a 7th hue.

This feeds [TICKET-UI-13](./tickets/TICKET-UI-13-chart-visual-language.md)'s shared
`chart-theme.ts` palette utility directly.

### Sequential / single-magnitude charts

Use the primary (violet) hue as a single light→dark ramp; if a second sequential context appears
in the same view, use the secondary (sky) hue as its own independent ramp. Don't build a shared
0–100 ramp across two metrics — that's a dual-axis mistake in disguise.

### Diverging (e.g. income vs. expense delta)

Use `success` ↔ `error` (green ↔ red) directly, not the categorical hues — this is polarity, which
is what the status colors exist for, with a neutral gray midpoint (`base-300`).

## 3. Elevation ("Dimensional Layering") — `mm-paper`

`PaperElevation` is `'flat' | 'raised' | 'floating'`. Light mode uses shadows; dark mode steps the
surface instead, since shadows are invisible on `#050608`.

| Elevation | Light | Dark (OLED) |
|---|---|---|
| `flat` | `border border-base-300`, `bg-base-100` | `border border-base-300`, `bg-base-100` |
| `raised` | `bg-base-100` + `box-shadow: 0 1px 2px rgba(11,11,17,.06), 0 1px 3px rgba(11,11,17,.08)` | `bg-base-200` (no shadow) |
| `floating` | `bg-base-100` + `box-shadow: 0 4px 12px rgba(11,11,17,.10), 0 2px 4px rgba(11,11,17,.06)` | `bg-base-300` + optional 1px ring at `oklch(60% 0.17 285 / 0.15)` (a restrained aurora-violet glow, reserved for modals and the dashboard's hero panel only — not every floating card) |

This is a direct swap for `paper.component.ts`'s `ELEVATION_SHADOW_CLASSES` map and its
`flat`/`background` inputs — the component's shape doesn't change, only the values it resolves to
once dark-mode-aware classes exist (today it's one static class per elevation regardless of theme;
TICKET-UI-11 needs the raised/floating classes to become theme-aware, e.g. `dark:bg-base-200
dark:shadow-none`).

## 4. Typography ("Swiss Modernism 2.0") — `mm-text`

High-contrast size jumps between hierarchy levels, tight tracking on large text, generous line
height on body copy, tabular figures on anything monetary. Maps onto `TypographyComponent`'s
existing `TextVariant` union — no new variants needed, only new values for the existing six.

| Variant | Size | Weight | Tracking | Line-height | Used for |
|---|---|---|---|---|---|
| `display` | `2.25rem` (36px) | 700 | `-0.02em` | 1.1 | Hero numbers: net-worth header, big dashboard stat |
| `heading` | `1.5rem` (24px) | 600 | `-0.01em` | 1.25 | Panel/page titles |
| `subheading` | `1.0625rem` (17px) | 500 | normal | 1.4 | Section headers, panel subtitles |
| `body` | `1rem` (16px) | 400 | normal | 1.6 | Default paragraph/table text |
| `caption` | `0.8125rem` (13px) | 400 | normal | 1.5 | Muted/secondary text, timestamps |
| `label` | `0.75rem` (12px) | 600 | `0.06em`, uppercase | 1.4 | Form labels, category tags |

**Tabular figures rule**: every monetary amount and any numeric table column should render with
`font-variant-numeric: tabular-nums` so digits align vertically — this doesn't exist on
`mm-text` today. Worth adding as a `numeric` boolean input during TICKET-UI-11's implementation
(e.g. `<mm-text numeric>`), not scope for this document to decide unilaterally.

**Open decision — typeface.** The scale above assumes the current Tailwind default sans stack
(system UI fonts). A true "Swiss Modernism 2.0" feel benefits from a single deliberate grotesque
(Inter is the standard modern choice — free, variable-weight, built-in tabular figures, ~60-70KB
self-hosted subsetted woff2 via `@fontsource-variable/inter`). This is a **new dependency** and
touches the bundle-budget-sensitive part of the stack, so it's flagged rather than assumed — decide
explicitly before TICKET-UI-11 starts, don't let it slide in as a side effect of the color/type
values above. Self-hosted (not a Google Fonts CDN link) fits this app's local-first/offline-capable
posture better than a runtime font fetch.

## 5. Bento grid — dashboard hero sizing (`mm-bento-grid` / `mm-bento-item`)

`BentoColumns` is `'2'|'3'|'4'`, `BentoSpan` is `'1'|'2'|'3'|'4'`. On a 3-column grid, suggested
sizing for the eight `dashboard-overview` panels — the trend chart and net-worth header get the
"hero" treatment ("make the charts the hero"), everything else is a compact tile:

| Panel | `colSpan` | `rowSpan` | Rationale |
|---|---|---|---|
| `net-worth-header` | 2 | 1 | Hero banner; carries the aurora wash (§1.2) |
| `trend-chart-panel` | 2 | 2 | The actual hero — biggest surface in the grid |
| `account-balance-strip` | 1 | 1 | Compact stat |
| `action-queue-panel` | 1 | 1 | Compact |
| `category-breakdown-panel` | 1 | 2 | Chart, taller to match the trend chart's row |
| `category-comparison-panel` | 1 | 1 | Compact |
| `top-transactions-panel` | 1 | 1 | List, compact |
| `weekday-weekend-split-panel` | 1 | 1 | Compact stat |

This is a starting arrangement for [TICKET-UI-12](./tickets/TICKET-UI-12-dashboard-bento-layout.md)
to implement, not a pixel-final layout — it must stay compatible with `dashboard-customize-panel`'s
existing reorder/toggle mechanism per that ticket's acceptance criteria (this table sizes a panel
*type*, it doesn't override the user's saved order).

## 6. Motion ("Motion-Driven")

No new animation dependency (ECharts' own engine + CSS transitions only, per the hard rule against
raising bundle budgets):

| Context | Duration | Easing |
|---|---|---|
| ECharts initial render (`animationDuration`) | 500ms | `cubicOut` |
| ECharts data update (`animationDurationUpdate`) | 350ms | `cubicOut` |
| `mm-paper` link/hover transition | 150ms | `ease-out` |
| Panel entrance (CSS only: opacity + 4px translate-y) | 200ms | `ease-out` |

Deliberately no bounce/spring easing anywhere — "Playful" is expressed through color (the aurora
wash, the categorical palette) and layout (bento asymmetry), not through literal bouncy motion on
monetary figures, which reads as unserious for a finance app. This is a judgment call, flagged as
such rather than asserted as the only valid reading of "Playful."

## 7. App shell accent (`app.html`, TICKET-UI-14)

Sidebar nav active-item state: `3px` solid left border in `primary` + `bg-primary/8` tint, icon and
label text in `text-primary`. Inactive items stay `base-content` at reduced opacity. No gradient —
per §1.2, the shell is a flat surface, accent is conveyed by the primary color alone.

## How these were derived

Every hex above came from `oklch(L C H)` → sRGB conversion, then validated with the `dataviz`
skill's `scripts/validate_palette.js` against both the light surface (`#fcfcfb`-equivalent,
`base-100`) and the dark surface (`#050608`, `base-100` dark). The categorical set in §2 passes all
four computable checks (lightness band, chroma floor, CVD adjacent-pair separation, WCAG contrast)
in dark mode with zero warnings, and in light mode with two contrast WARNs mitigated by the
existing accessible-numbers-table pattern. Re-run the same validator against any future palette
change — don't eyeball a replacement hue.

## Traceability

| Section | Feeds ticket |
|---|---|
| §1.1 Semantic tokens | TICKET-UI-11 |
| §1.2 Aurora wash | TICKET-UI-11 (defines it), TICKET-UI-12 (net-worth-header), TICKET-UI-13 (optional chart backdrop) |
| §1.3 OLED approach | TICKET-UI-11 |
| §2 Categorical palette | TICKET-UI-13 |
| §3 Elevation | TICKET-UI-11 (theme-aware shadow classes), consumed by `mm-paper` everywhere |
| §4 Typography | TICKET-UI-11 (values), consumed by `mm-text` everywhere |
| §5 Bento sizing | TICKET-UI-12 |
| §6 Motion | TICKET-UI-13 (charts), TICKET-UI-12/14 (CSS transitions) |
| §7 Shell accent | TICKET-UI-14 |
