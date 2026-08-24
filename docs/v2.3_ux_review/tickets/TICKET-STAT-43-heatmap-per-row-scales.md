# TICKET-STAT-43 — Heatmap shades each row on its own scale, so cells can't be compared

- **Area:** Dashboard / Stats
- **Type:** Bug fix
- **Traceability:** UX review (UXR-20); extends FR-STAT-* — a per-row scale defeats the one thing a heatmap is for

## User story

As someone reading the spending heatmap, I want one colour to mean one amount, so that comparing two cells tells me something true.

## Current situation (as-is)

[spending-heatmap-panel.component.ts:68](../../../src/app/feature-dashboard/components/spending-heatmap-panel/spending-heatmap-panel.component.ts) states the caption:

> "Shading is relative to your average across these categories — heavier spend stands out more. **The All row has its own scale.**"

and [spending-heatmap-panel.component.html:30](../../../src/app/feature-dashboard/components/spending-heatmap-panel/spending-heatmap-panel.component.html) confirms in a comment: "each row has its own scale now, so no one colour maps to one amount."

The per-row scale was a deliberate choice, and the reasoning behind it is sound — [changelog-entries.ts:854](../../../src/app/feature-changelog/data/changelog-entries.ts) records that the All row is "several times bigger than anything below it", so a single shared scale would flatten every category row into near-identical pale cells.

But the consequence is that a heatmap's core affordance no longer works: a dark cell in one row and a dark cell in another represent unrelated amounts. Cross-row comparison is the primary reason to draw a grid of shaded cells, and the caption admits it does not hold. The app is being honest about a limitation rather than resolving it, and honesty in a caption does not restore the comparison.

## Desired result (to-be)

- Colour is comparable across the rows a user would naturally compare — the category rows at minimum.
- The outlier "All" row is handled so it does not flatten everything else: given its own visual treatment, separated from the grid, or normalised.
- The caption stops having to disclaim the chart's own semantics.

## Acceptance criteria

### Implementation note, 2026-08-24 — the as-is was stale, the caption was the bug

The review read the panel's **caption and a template comment**, both of which still described a
per-row scale. The scale itself had already been changed two weeks earlier: commit `a8bae7a`
(2026-08-09, "render the heatmap again, and rescale it") pooled every category cell onto one scale
and moved `All` out of the grid into its own strip above it, and
`spending-heatmap-panel.component.spec.ts` has asserted both since — *"reads every category row
against the same scale, so equal amounts shade equally"* and *"leaves the category rows' shading
identical to what it is without the band"*.

So the substance of **to-be** bullets 1 and 2 was already shipped; the third — "the caption stops
having to disclaim the chart's own semantics" — was not, and the stale wording is what made the
chart read as broken to a reader who trusted it. This ticket therefore lands as a wording and
naming fix plus the assertions that pin it, not a rescale. The criteria below are ticked against
that: the ones already met carry the commit and spec that met them, so the evidence stays
checkable rather than being quietly inherited.

Convention review caught the first replacement caption over-correcting — *"the same shade means the
same spend in any category row"* is not true either, because the pooled scale sets a cell's **depth**
while its **hue** is still the category's own. The shipped wording says depth, which is the level at
which the claim holds. The same pass turned up three more comments still written in the per-row
vocabulary — on the `shadingCaption` field, on `resolveHeatmapCellColor` in `shared/echarts`, and on
the spec's `HeatmapCellItem` type — plus the now-misleading name `rowScale`/`HeatmapRowScale` for a
helper that pools a whole grid. All are corrected here; `rowScale` → `amountScale` and
`HeatmapRowScale` → `HeatmapAmountScale`.

Not done, deliberately: the per-category hue is unchanged, and the ramp is still anchored on the
pooled average with separate spans either side. Re-opening either is a TICKET-STAT-34 re-decision,
not this ticket.

- [x] Two cells of the same shade in different category rows represent comparable amounts. (Already true since `a8bae7a`: `buildHeatmapChartOption` builds one `categoryScale = amountScale(cells.map(…))` pooled over the whole grid and passes it for every cell — [spending-heatmap-panel.component.ts:172](../../../src/app/feature-dashboard/components/spending-heatmap-panel/spending-heatmap-panel.component.ts). Pinned by the spec case *"reads every category row against the same scale, so equal amounts shade equally"*, which seeds two rows with an equal cell and asserts identical ramp positions. Read precisely: equal amounts land at the same *ramp depth*, each in its own category hue — which is what the shipped caption now claims, no more.)
- [x] The All row no longer compresses the category rows' colour range — whichever treatment is chosen. (Treatment: `All` is not a row at all — it is a separate 22px grid above the categories' grid with its own `bandScale`, so it never enters `categoryScale`. Pinned by *"leaves the category rows' shading identical to what it is without the band"* in the `buildHeatmapChartOption` → *the "All" band* describe.)
- [x] The caption describes what the shading means without disclaiming that a row is exempt. (`HEATMAP_SHADING_CAPTION` now reads *"Every category is read against one scale for the whole grid — within a colour, deeper means more spend, and the same depth means the same amount in any row. The All strip above totals each column, on its own scale."* — the grid's rule stated positively, with the strip named as a summary rather than an exempt row. The stale template comment at [spending-heatmap-panel.component.html:29](../../../src/app/feature-dashboard/components/spending-heatmap-panel/spending-heatmap-panel.component.html) went with it. Spec asserts the new text is present *and* that "The All row has its own scale" is gone.)
- [x] A hovered or focused cell states its actual amount, so the exact value never depends on colour alone. (Tooltip formatter emits `<name> · <column><br/><amount>`; spec *"shows the amount in the tooltip while privacy mode is off"* asserts `€40,00`. Keyboard/AT readers get every figure from the `sr-only` companion table instead — the canvas has no per-cell focus target, so the table is the focus path, not a fallback.)
- [x] The accompanying data table (the app's consistent pattern) remains correct and complete. (Untouched by this change and still driven off the same `heatmap()` signal as the chart; covered by *"renders the chart and its screen-reader table once there is spend"* and *"leads the screen-reader table with an 'All' row of the column totals"*.)
- [x] Unit tests cover: two equal amounts in different category rows resolve to the same shade; an outlier row does not flatten the others; the empty-range case renders no grid rather than a uniform one. (In order: *"reads every category row against the same scale, so equal amounts shade equally"*; *"leaves the category rows' shading identical to what it is without the band"*; *"renders nothing when the selected range holds no spend"* plus *"still renders nothing at all when there is no spend"* — the `hasSpend()` guard drops the whole `mm-paper`, so no uniform grid is drawn. 39/39 pass in `ng test --include 'src/app/feature-dashboard/components/spending-heatmap-panel/*.spec.ts'`.)
- [ ] Verified live in the browser on a populated range, including a range with one dominant category. — **not done, and it could not be.** The panel sits behind `@defer (on viewport)` on the dashboard, and the session's browser pane was never displayed, so the page never composited frames and the `IntersectionObserver` behind that trigger never fired: the panel stayed on its skeleton placeholder through a real `scrollIntoView`, a `window.scrollTo` to the page bottom and a 2400px-tall viewport (all confirmed against the dev server on :4210, 2026-08-24). Nothing about the panel could be observed, dominant category or not. Re-open with the pane visible.
- [x] Verified via the fallow skill and coding-conventions skill. (`npx fallow dead-code --baseline .fallow-baseline.json --fail-on-issues` and `npx fallow health --complexity --max-cognitive 30 --max-cyclomatic 30 --max-crap 1000 --fail-on-issues` both exit 0. `conventions-reviewer` found no structural, Angular, state, Dexie, styling or hard-rule violation; its five accuracy findings — the over-claiming caption, three stale per-row comments, and the `rowScale` name — are all applied above, and its note on the implementation-note heading level is applied here. `ng lint` clean, `ng build --configuration development` compiles.)

## Notes

- Options worth weighing: move All out of the grid into a summary strip; use a perceptually uniform scale with outlier clamping; or offer a shared-scale toggle. The trade-off recorded in the changelog entry is real — do not simply revert to one shared scale without addressing why per-row was introduced.
- Related open ticket: TICKET-STAT-31 (heatmap time views) in [../v2.1_extra_graphs](../v2.1_extra_graphs/overview.md) touches the same panel — coordinate if both are worked.
