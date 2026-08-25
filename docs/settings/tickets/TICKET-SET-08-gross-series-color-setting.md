# TICKET-SET-08 — Gross series color setting

- **Area:** ~~Settings~~ Income
- **Released in:** [v1.6 Income & growth](../../releases/v1.6_income_growth/overview.md)
- **Type:** Feature
- **Traceability:** ~~extends FR-SET (settings page)~~ extends FR-INC-3/4/12's Income settings popup —
  consumed by FR-INC-11/FR-INC-13

## User story

As a user, I want to pick the color used for the gross-pay series on the Income page's charts, so gross
and net are told apart by a color I chose rather than by whichever slot the theme palette happened to hand
out.

## Description

A new preset color picker ~~in Settings' Theme section, alongside the existing accent-color row~~ **in the
Income page's settings popup, alongside the category filter and career-start controls**, whose value drives
every gross-pay series on the Income page — the take-home band's "withheld" area (TICKET-INC-14) and the
gross line on all three gross-vs-net growth charts (TICKET-INC-16). Persisted like every other setting, and
unset means "use the theme's own palette", so nothing changes for anyone who ignores it.

> **Relocated 2026-08-01, during implementation, at the user's direction.** The picker was built into
> Settings' Theme section as written, then moved to the Income settings popup before commit. It belongs
> with the other page-level choices that change what the Income page *means* (which categories count,
> where the career starts, what gets smoothed) rather than with app-wide appearance: it is only
> meaningful while looking at the charts it colours, and it is the one "theme" control that has no effect
> anywhere else in the app. TICKET-INC-18 later moves that popup to its own routed page, and this control
> rides along with it for free. Only the *placement* moved — the setting, its persistence, and the
> resolver are exactly as specified below.

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
- [income-settings.component.html](../../../src/app/feature-income/components/income-settings/income-settings.component.html)
  is the Income page's one settings popup (TICKET-INC-04): a career-start field and two category
  checklists, divider-separated, each reading and writing through `IncomeStore`. This is where the picker
  actually landed — see the Description's relocation note.
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
- ~~Settings' Theme section gains a "Gross pay color" row under the accent row~~ **The Income settings
  popup gains a "Gross pay color" fieldset under the two category checklists**: the same six preset
  swatches plus a "Default" option, same selected-state markup and keyboard/ARIA treatment as the accent
  picker. Reads and writes through `IncomeStore` (which delegates to `AppSettingsStore`), like every other
  control in that popup. Applies under **every** theme style — it colors canvas, not daisyUI tokens, so
  nothing gates it on a Default Light/Dark theme the way the accent row's copy is.
- Consumers read the resolver, never the raw setting: TICKET-INC-14's withheld band and TICKET-INC-16's
  three gross lines.

## Acceptance criteria

> **Implementation note, 2026-08-01.** Two criteria below were amended while building, per
> `work-ticket`'s "record the divergence at the moment you pivot" rule:
> - **The resolver's parameter type.** `shared/` never imports `@/core` anywhere in the codebase, and
>   inverting that would be the app's first shared→core edge. So the signature takes a
>   `GrossSeriesColorId` declared from `GROSS_SERIES_COLORS`' own keys — structurally the identical
>   union to `AccentColorId`, so every call site still passes an `AccentColorId` unchanged — and
>   `chart-theme.spec.ts` (which *can* import core, being excluded from `tsconfig.app.json`) asserts
>   the two vocabularies stay in step.
> - **Where the row lives.** Relocated from Settings' Theme section to the Income settings popup — see
>   the Description's relocation note. The last two UI criteria are amended to the popup. (The original
>   criterion's premise was also wrong on its own terms: the accent row is never hidden under a
>   non-default style — it renders inside the theme grid under every style and merely *says* it applies
>   to the Default pair.)

- [x] `grossColor` added to `AppSettings` and `DEFAULT_APP_SETTINGS` as `undefined`; **no** new
      `.version(n)` block and no edit to any shipped one — the diff touches no `.stores()` call.
      (`app-db.ts`'s `AppSettings`/`DEFAULT_APP_SETTINGS`; `git diff` over `app-db.ts` shows only the
      two additions, no `.version(`/`.stores(` line touched.)
- [x] Persisted through `AppSettingsRepository.setGrossColor()` (read-merge-put) and read through
      `AppSettingsStore` — no component or store touches `appDb.appSettings` directly; repository spec
      covers set → read-back and covers not clobbering the other `appSettings` fields.
      (`app-settings.repository.ts:setGrossColor`, `app-settings.store.ts:setGrossColor`, re-exposed as
      `IncomeStore.grossColor`/`setGrossColor` so the page's charts and its picker read one signal; specs
      "setGrossColor writes the singleton row without one existing yet (TICKET-SET-08)",
      "setGrossColor preserves unrelated settings and stays a single row", "setGrossColor(undefined)
      clears the color without touching the rest of the row".)
- [x] The value round-trips through data-management export → import intact (the same spec
      `smoothedBonusCategoryIds` is asserted in). (`data-management.repository.spec.ts` →
      "non-indexed appSettings fields > round-trips through export → import intact", now also
      asserting `restored?.grossColor === 'violet'`.)
- [x] `resolveGrossSeriesColor()` returns the picked preset's hex for the active `data-theme`'s light/dark
      variant, and the theme's fallback for `undefined`; unit test over both modes and an unknown theme.
      (`chart-theme.ts:resolveGrossSeriesColor`; `chart-theme.spec.ts` → "returns the picked preset's
      light-mode hex under a light theme", "…dark-mode hex under a dark theme", "falls back to the
      theme's own categorical slot when no color is picked", "…a non-default theme's own categorical
      slot…", "treats an unknown data-theme as light, and its unset fallback as the deformable
      palette".)
- [x] Every returned value is a canvas-consumable hex literal — no `oklch(...)`/CSS-variable string reaches
      an echarts option; unit test asserting the format across all presets. (`chart-theme.spec.ts` →
      "never emits an oklch()/CSS-variable string an echarts canvas option could not consume", which
      matches `/^#[0-9a-f]{6}$/` for all six presets plus the unset case across four `data-theme`s.)
- [x] ~~The Settings Theme section~~ **The Income settings popup** renders a "Gross pay color" row of six
      presets plus "Default", marks the stored value selected, and persists a click; component spec covers
      selecting a preset and clearing back to Default. (New
      `feature-income/components/income-gross-color/` component, hung off
      `income-settings.component.html` under the two checklists; specs "renders a swatch for every preset
      plus a Default option", "marks the stored color selected", "persists a picked preset through the
      store", "clearing back to Default persists undefined", "starts on Default when nothing is stored",
      plus `income-settings.component.spec.ts` → "hosts every settings section behind one trigger".)
- [x] The picker applies under **every** theme style, not only Default Light/Dark — nothing gates it on
      the active style, and the swatches render the resolver's own canvas hex per theme rather than an
      OKLCH accent value. (`income-gross-color.component.ts:swatch()` calls `resolveGrossSeriesColor`
      with no style condition anywhere in the component or template; spec "shows each swatch in the
      canvas hex the charts will draw, not the accent picker's OKLCH" asserts `rgb(132, 81, 201)` —
      `#8451c9`, the resolver's light-mode violet — rather than `ACCENT_COLORS`' `oklch(60% 0.17 300)`.)
- [x] Picking a color changes what TICKET-INC-14's / TICKET-INC-16's option builders emit for their gross
      series; covered by those tickets' specs against this resolver. (Ticked when INC-14 landed:
      `income-gross-net-panel.component.spec.ts` → "takes the withheld band's color from the gross-series
      resolver, not a literal" and "colors the withheld band with the picked gross color (TICKET-SET-08)".
      INC-16's three gross lines add their own coverage on the same resolver.)
- [x] `angular.json` bundle budgets not raised. (`git diff` touches no `angular.json`;
      `ng build --configuration development` completes with no budget warning.)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill. (`fallow audit --base HEAD` →
      `verdict: pass`, `complexity_introduced: 0`, `dead_code_introduced: 0` after splitting the
      resolver's fallback branch out of the ternary chain; conventions followed for the additive
      `AppSettings` field, the read-merge-put setter, and the settings section's swatch-row markup,
      copied from the accent row it sits under.)
- [ ] Verified live in the browser: pick a gross color in ~~Settings~~ **the Income settings popup**, confirm the
      withheld band and the gross lines all take it, and that it survives a reload. — **skipped at the
      user's request** ("skip the browser check"), not verified. Also partly unverifiable today: the
      withheld band and gross lines land in INC-14/INC-16.

## Notes

- Reuses `AccentColorId` rather than minting a second color-id union: one preset vocabulary across the app
  keeps the two pickers visually consistent, and a freeform hex input would let the user pick something
  invisible against the plot background — the same reasoning TICKET-SET-02's Notes give.
- Only the *gross* series is settable, not net: net already carries the page's established categorical
  color, and one picker answers the actual complaint (telling the pair apart) without opening a
  per-series theming surface.
- The unset fallback is the theme's categorical **slot 1**, not slot 0 — net keeps slot 0 as the page's
  established income color, and gross and net are always drawn together, so both defaulting to the same
  slot would be the exact confusion this ticket exists to fix.
- The hex map duplicates the presets' hues, not their exact OKLCH values — canvas colors are tuned against
  the plot background rather than against `base-100`, so they are a deliberate second tuning rather than a
  conversion. Document that in the map's comment.
