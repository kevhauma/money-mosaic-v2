# TICKET-SET-08 — Gross series color setting

- **Area:** Settings
- **Type:** Feature
- **Traceability:** extends FR-SET (settings page) — consumed by FR-INC-11/FR-INC-13

## User story

As a user, I want to pick the color used for the gross-pay series on the Income page's charts, so gross
and net are told apart by a color I chose rather than by whichever slot the theme palette happened to hand
out.

## Description

A new preset color picker in Settings' Theme section, alongside the existing accent-color row, whose value
drives every gross-pay series on the Income page — the take-home band's "withheld" area (TICKET-INC-14) and
the gross line on all three gross-vs-net growth charts (TICKET-INC-16). Persisted like every other setting,
and unset means "use the theme's own palette", so nothing changes for anyone who ignores it.

## Current situation (as-is)

- `AppSettings` ([app-db.ts](../../../src/app/core/data-access/app-db.ts)) carries `primaryColor:
  AccentColorId | undefined` (TICKET-SET-02) — a fixed palette key, not a freeform hex — plus the
  currency/locale/income fields. No chart-series color is user-settable anywhere.
- [accent-colors.ts](../../../src/app/core/theme/accent-colors.ts) holds `ACCENT_COLORS`, six presets whose
  OKLCH lightness/chroma were chosen for contrast against `base-100`, with `accentSwatchColor()` picking
  the light or dark pair for the active style. These values are **CSS custom property** values, applied to
  `--color-primary`.
- [chart-theme.ts](../../../src/app/shared/echarts/chart-theme.ts) is the documented single home for
  chart-facing hex literals ("canvas rendering can't consume CSS custom properties"), exposing
  `resolveChartCategoricalColors()` per `data-theme`. Every Income chart currently takes its colors from
  there.
- [settings-theme-section.component.ts](../../../src/app/feature-settings/components/settings-theme-section/settings-theme-section.component.ts)
  renders the accent row inside the theme grid via `isAccentSelected`/`onSelectAccent`/`accentSwatch` — the
  exact shape this ticket copies.
- The gross series doesn't exist yet: today the only gross-derived visual is the take-home *ratio* line,
  which uses the categorical palette's first slot.

## Desired result (to-be)

- New additive `AppSettings` field `grossColor: AccentColorId | undefined` — same fixed-palette-key type as
  `primaryColor`, required-but-possibly-`undefined` (the `withState` accessor-optionality pitfall the
  existing fields' comments describe), `undefined` in `DEFAULT_APP_SETTINGS`. **No Dexie version bump** —
  non-indexed field, same reasoning as `careerStartDate`/`smoothedBonusCategoryIds`.
- `AppSettingsRepository` gains a `setGrossColor()` read-merge-put setter and `AppSettingsStore` a
  `grossColor()` signal + `setGrossColor()` method, mirroring `primaryColor` exactly.
- New `resolveGrossSeriesColor(id: AccentColorId | undefined): string` in `chart-theme.ts`, backed by a new
  `GROSS_SERIES_COLORS: Record<AccentColorId, { light: string; dark: string }>` **hex** map alongside the
  existing palettes: canvas can't take the OKLCH strings `ACCENT_COLORS` stores, and `chart-theme.ts` is
  where chart-facing hex belongs. Keyed light/dark off the same `data-theme` attribute the existing
  resolvers read. `undefined` falls back to the active theme's categorical palette slot reserved for gross,
  so an unset setting is today's behaviour.
- Settings' Theme section gains a "Gross pay color" row under the accent row: the same six preset swatches
  plus a "Default" option, same selected-state markup and keyboard/ARIA treatment as the accent picker.
  Renders unconditionally — unlike the accent row it is **not** gated on a Default Light/Dark theme, since
  it colors canvas, not daisyUI tokens.
- Consumers read the resolver, never the raw setting: TICKET-INC-14's withheld band and TICKET-INC-16's
  three gross lines.

## Acceptance criteria

- [ ] `grossColor` added to `AppSettings` and `DEFAULT_APP_SETTINGS` as `undefined`; **no** new
      `.version(n)` block and no edit to any shipped one — the diff touches no `.stores()` call.
- [ ] Persisted through `AppSettingsRepository.setGrossColor()` (read-merge-put) and read through
      `AppSettingsStore` — no component or store touches `appDb.appSettings` directly; repository spec
      covers set → read-back and covers not clobbering the other `appSettings` fields.
- [ ] The value round-trips through data-management export → import intact (the same spec
      `smoothedBonusCategoryIds` is asserted in).
- [ ] `resolveGrossSeriesColor()` returns the picked preset's hex for the active `data-theme`'s light/dark
      variant, and the theme's fallback for `undefined`; unit test over both modes and an unknown theme.
- [ ] Every returned value is a canvas-consumable hex literal — no `oklch(...)`/CSS-variable string reaches
      an echarts option; unit test asserting the format across all presets.
- [ ] The Settings Theme section renders a "Gross pay color" row of six presets plus "Default", marks the
      stored value selected, and persists a click; component spec covers selecting a preset and clearing
      back to Default.
- [ ] The row renders for **every** theme style, not only Default Light/Dark; component spec asserts it is
      present under a non-default style where the accent row is hidden.
- [ ] Picking a color changes what TICKET-INC-14's / TICKET-INC-16's option builders emit for their gross
      series; covered by those tickets' specs against this resolver.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified via the `fallow` skill and the `coding-conventions` skill.
- [ ] Verified live in the browser: pick a gross color in Settings, return to `/income`, confirm the
      withheld band and the gross lines all take it, and that it survives a reload.

## Notes

- Reuses `AccentColorId` rather than minting a second color-id union: one preset vocabulary across the app
  keeps the two pickers visually consistent, and a freeform hex input would let the user pick something
  invisible against the plot background — the same reasoning TICKET-SET-02's Notes give.
- Only the *gross* series is settable, not net: net already carries the page's established categorical
  color, and one picker answers the actual complaint (telling the pair apart) without opening a
  per-series theming surface.
- The hex map duplicates the presets' hues, not their exact OKLCH values — canvas colors are tuned against
  the plot background rather than against `base-100`, so they are a deliberate second tuning rather than a
  conversion. Document that in the map's comment.
