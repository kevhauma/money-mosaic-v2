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

- [ ] The mosaic's data table's independent rows' Share values sum to 100% (within rounding) for any populated range.
- [ ] Group subtotals, if shown, are visually distinct from leaf rows so they cannot be misread as additional entries.
- [ ] No change to `spending-mosaic.ts` share arithmetic — the treemap's tiles are correct as-is and must not regress.
- [ ] Rows sharing a display name remain individually identifiable.
- [ ] Unit tests cover: a group with two children sums to the group's share, not double; a flat set of leaves sums to 100%; the empty-range case renders no table rather than a 0% list.
- [ ] Verified live in the browser on `/explore` with a populated range.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- A UX review also flagged the Sankey as double-counting an internal transfer. That was checked and **rejected**: [money-flow-graph.ts:253](../../../src/app/core/stats/money-flow-graph.ts) already draws only the shallower leg of a linked pair, so a transfer produces one ribbon, not two. No ticket was raised.
- "Left over" appearing as two terminal nodes with different meanings is a separate, unticketed observation — worth a look when this panel is next open, but not scoped here.
