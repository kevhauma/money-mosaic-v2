# TICKET-EXP-09 — Mosaic data table sums its Share column past 100%

- **Area:** Explore
- **Type:** Bug fix
- **Traceability:** UX review (UXR-3); extends FR-STAT-6 — the mosaic's accompanying table lists group and child rows flat, so their shares double-count

## User story

As someone reading the spending mosaic's data table, I want its Share column to add up to 100%, so that I can trust the breakdown instead of wondering which rows overlap.

## Current situation (as-is)

[spending-mosaic.ts:21-22](../../../src/app/core/stats/spending-mosaic.ts) defines `share` as "Share of the range's whole expense total, 0..1 — **a group's is the sum of its children's**". That is correct for the treemap, where a group tile visually contains its children.

The accompanying data table in [spending-mosaic-panel.component.html](../../../src/app/feature-explore/components/spending-mosaic-panel/spending-mosaic-panel.component.html) renders group rows and child rows **flat in one list** under an "Inside" column. Because a group's share already includes its children's, listing both means the same money is counted twice:

```
All Groceries   10.9%
  FreshMarket    6.1%
  FreshMarket    4.9%
```

A UX review observed the column summing to **110.6%**. The data is right; the table's flattening is what breaks the arithmetic.

The table is otherwise a genuine strength — every chart in this app ships one, which is what makes the charts survive screen readers and canvas failure. This is a defect in one table, not a reason to drop the pattern.

## Desired result (to-be)

- The Share column reads as a coherent breakdown: either only leaf rows carry a share (and groups show a subtotal that is visibly a subtotal), or group and child rows are visually nested so it is obvious the child shares are *inside* the parent's.
- Whatever the presentation, a user adding up the column's independent rows arrives at 100%.
- The same two categories that share a display name ("FreshMarket" twice) remain distinguishable — see the module's note on name collisions.

## Acceptance criteria

- [x] The mosaic's data table's independent rows' Share values sum to 100% (within rounding) for any populated range. (Live on `/explore` with the dev seed: the flat column still reads **110.9%** — the reported defect, reproduced — while the rows not marked as subtotals sum to **100.0%**. Specs: *sums every independent row to 100% across the whole tree*, *still sums to 100% three levels deep*, *leaves a flat set of leaves entirely unmarked* in [spending-mosaic-panel.component.spec.ts](../../../src/app/feature-explore/components/spending-mosaic-panel/spending-mosaic-panel.component.spec.ts).)
- [x] Group subtotals, if shown, are visually distinct from leaf rows so they cannot be misread as additional entries. (Said in the cell rather than shown, because this table is `sr-only` and read aloud, where indentation and italics carry nothing: a parent's share cell reads `10,9% — subtotal of the rows inside it`, and the caption states the rule. Row VMs carry `isSubtotal` so the distinction is data, not styling. Observed live: `['Ungrouped', 'All Groceries', '€131,55', '10,9% — subtotal of the rows inside it']`.)
- [x] No change to `spending-mosaic.ts` share arithmetic — the treemap's tiles are correct as-is and must not regress. (`git diff` touches only the panel component, its template and its spec; `src/app/core/stats/spending-mosaic.ts` is untouched. Every pre-existing tile/tooltip/option spec passes unmodified.)
- [x] Rows sharing a display name remain individually identifiable. (Unchanged: rows key on the namespaced `id`, never on display text. Live on `/explore` the two colliding categories render as `['Groceries', 'FreshMarket', '€73,15', '6,1%']` and `['Groceries', 'FreshMarket', '€58,40', '4,9%']` — same name, different figures. Spec: *keeps two categories sharing a display name individually identifiable*, which also asserts the `@for` track keys stay unique. **Note:** they are told apart by amount, not by name — giving a colliding category a disambiguating label is a separate job this ticket does not take on.)
- [x] Unit tests cover: a group with two children sums to the group's share, not double; a flat set of leaves sums to 100%; the empty-range case renders no table rather than a 0% list. (Six specs under `describe('spendingMosaicRows share column adds up (TICKET-EXP-09)')`, plus the pre-existing component spec *renders nothing at all when the range holds no expenses* which covers the empty range end to end — the whole `mm-paper` is absent, so there is no table to list 0% rows in. `ng test`: 287 files / 3355 tests, up from 3349.)
- [x] Verified live in the browser on `/explore` with a populated range. (Dev server on `localhost:4210`, 8 rows: flat sum 110.9%, independent sum 100.0%, caption as written. Read out of the live DOM rather than screenshotted — the Browser pane was not displayed this session, so no frames were composited; this table is `sr-only` and invisible on screen anyway.)
- [x] Verified via the fallow skill and coding-conventions skill. (Both fallow CI gates exit `0`. Conventions: the qualifier is joined onto the row view-model in the class, so the template still only iterates and states facts — no ternary in a binding.)

## Notes

- A UX review also flagged the Sankey as double-counting an internal transfer. That was checked and **rejected**: [money-flow-graph.ts:253](../../../src/app/core/stats/money-flow-graph.ts) already draws only the shallower leg of a linked pair, so a transfer produces one ribbon, not two. No ticket was raised.
- "Left over" appearing as two terminal nodes with different meanings is a separate, unticketed observation — worth a look when this panel is next open, but not scoped here.
