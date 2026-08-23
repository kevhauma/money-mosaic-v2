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

- [ ] Two cells of the same shade in different category rows represent comparable amounts.
- [ ] The All row no longer compresses the category rows' colour range — whichever treatment is chosen.
- [ ] The caption describes what the shading means without disclaiming that a row is exempt.
- [ ] A hovered or focused cell states its actual amount, so the exact value never depends on colour alone.
- [ ] The accompanying data table (the app's consistent pattern) remains correct and complete.
- [ ] Unit tests cover: two equal amounts in different category rows resolve to the same shade; an outlier row does not flatten the others; the empty-range case renders no grid rather than a uniform one.
- [ ] Verified live in the browser on a populated range, including a range with one dominant category.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Options worth weighing: move All out of the grid into a summary strip; use a perceptually uniform scale with outlier clamping; or offer a shared-scale toggle. The trade-off recorded in the changelog entry is real — do not simply revert to one shared scale without addressing why per-row was introduced.
- Related open ticket: TICKET-STAT-31 (heatmap time views) in [../v2.1_extra_graphs](../v2.1_extra_graphs/overview.md) touches the same panel — coordinate if both are worked.
