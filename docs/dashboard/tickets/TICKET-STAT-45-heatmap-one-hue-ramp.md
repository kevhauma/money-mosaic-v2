# TICKET-STAT-45 — The heatmap's six category hues make the grid unreadable

- **Area:** Dashboard / Stats
- **Released in:** [v2.3 UX review](../../releases/v2.3_ux_review/overview.md)
- **Type:** Bug fix
- **Traceability:** Follow-up to [TICKET-STAT-43](./TICKET-STAT-43-heatmap-per-row-scales.md), which fixed the caption and deferred this explicitly: *"Not done, deliberately: the per-category hue is unchanged… Re-opening either is a TICKET-STAT-34 re-decision, not this ticket."* Re-decides the hue half of [TICKET-STAT-34](./TICKET-STAT-34-heatmap-per-category-colour-scales.md).

## User story

As someone reading the spending heatmap, I want the grid to read as one picture, so that I can see *when* money goes out without decoding six colours at six intensities first.

## Current situation (as-is)

Every cell carries **two variables in one channel**: hue says which category the row is, lightness says how much was spent. With up to five rows plus the `All` band, that is six hues each drawn at every intensity from near-background to near-black — and TICKET-STAT-43 had to hedge the caption to match, telling the reader that only *depth within a colour* is comparable, never shade itself.

The hue is also redundant. The row's own y-axis label already names the category, and clicking a cell drills down to it. Nothing in the grid depends on hue to be identifiable.

Reported directly: the heatmap "is too messy to read easily".

## Desired result (to-be)

- One hue for the whole grid — the theme's **primary** colour, so the chart belongs to the app's palette instead of introducing a sixth of its own.
- The ramp runs **light → dark on a light theme and dark → light on a dark theme**: heavier spend always stands out more against the plot it sits on.
- The colour encodes amount and nothing else, so the caption can say "the same shade means the same amount" without hedging.
- The primary follows whatever the app's primary actually is right now — including the accent preset picked in Settings, not just the theme's baked-in value.

## Acceptance criteria

- [x] Every category cell and every `All` band cell is drawn from one colour, the app's live `--color-primary` — `buildHeatmapChartOption` takes a single `rampColor` (was `bandColor` + a per-row `rows[i].color`), asserted by *"colours every cell from the theme's primary, against the shared scale"* in `spending-heatmap-panel.component.spec.ts`.
- [x] Light themes ramp pale → deep, dark themes deep → bright — the existing `HEATMAP_RAMP` direction rule, now pinned at both ends in both modes by *"flips the direction with the theme's mode"*.
- [x] The two ends of the ramp are far enough apart to be told apart by lightness alone, now that hue no longer helps: `TOWARD_BACKGROUND_MAX_MIX` 0.7 → 0.82, `AWAY_FROM_BACKGROUND_MAX_MIX` 0.5 → 0.55.
- [x] The colour follows the accent preset the user picked in Settings — `resolveChartPrimaryColor` reads `--color-primary` off `<html>` (where `AppSettingsStore`'s accent effect writes it) and converts the OKLCH value to a canvas-consumable hex, asserted by *"follows the accent override the user picked, whatever the theme"*.
- [x] An unparseable or absent `--color-primary` falls back to a hex rather than handing echarts a string it cannot draw — *"falls back rather than handing echarts something it cannot parse"*.
- [x] The caption states the rule without hedging: *"the stronger the colour, the more spend, and the same shade means the same amount in any row"*, with the panel spec asserting the old *"within a colour"* wording is gone.
- [x] The two scales are unchanged — one pooled scale for the grid, the `All` band on its own (TICKET-STAT-43). *"leaves the category rows' shading identical to what it is without the band"* still passes untouched.
- [x] Live browser check across a light and a dark theme (2026-08-25, dev server on :4210, seeded data). Sampling the rendered canvas inside the category grid: **Default Light** paints `#fee2e1` (pale) → `#f75d59` (the anchor, the theme's own primary) → `#6f2a28` (deep); **Default Dark** paints `#2e1514` (deep) → `#ff756f` (anchor) → `#ffc1be` (bright). One hue in both, mirrored ends, no second colour family anywhere in the grid.

## Notes

**Why read the DOM instead of a per-theme table.** `chart-theme.ts` keys its categorical palettes off the `data-theme` name, and the first draft of this did the same for primary. It would have gone stale immediately: primary is the one token a *user setting* moves (TICKET-SET-02's accent picker writes it as an inline custom property on `<html>`), so a table keyed by theme would have shown the theme's baked-in coral to someone who had picked teal. Reading the live value costs one `getComputedStyle` per option build and an OKLCH→sRGB conversion, and it cannot drift.

**`HeatmapRow.color` is gone.** With no per-row hue, the aggregate's `color` field had no reader; `core/stats/category-cycle-heatmap.ts` no longer resolves it, and its local `NO_COLOR_FALLBACK` duplicate went with it. `money-flow-graph.ts` keeps its own copy — that chart still colours by category.

**Not done:** the ramp is still anchored on the scale's *average* with separate spans either side, not on the midpoint. That is TICKET-STAT-34's decision and it survives the hue change intact — a grid with one huge Friday still reads against "what a day like this usually costs".
