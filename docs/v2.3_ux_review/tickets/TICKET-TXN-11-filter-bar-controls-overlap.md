# TICKET-TXN-11 — Transactions filter controls overlap each other

- **Area:** Transactions
- **Type:** Bug fix
- **Traceability:** UX review (UXR-6); FR-TXN-2 (filtering) — a six-column grid gives 115px cells to controls needing 176–180px

## User story

As someone filtering my transactions, I want the filter controls to sit in their own space, so that the app's most-used screen does not look broken.

## Current situation (as-is)

[transaction-filters.component.html:2](../../../src/app/feature-transactions/components/transaction-filters/transaction-filters.component.html) lays the filter form out as:

```html
<form [formGroup]="filterForm" class="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6">
```

At a 1120px viewport that resolves to six **115.33px** columns, while two of the controls need far more. Measured:

| Element | Cell | Needs | Result |
|---|---|---|---|
| "Amount type" `mm-fieldset` (line ~37) | 115.33px | 180px | Overruns its cell by 65px; **overlaps the Min amount input by 53px** |
| "Make rule from filter" / "Clear" pair (lines ~96, ~107) | 115.33px | 176px | Escapes on **both** sides; right edge 1076 passes the form's 1064 |

Form: `scrollWidth 828` vs `clientWidth 784`. Page: `documentElement.scrollWidth 1124` vs `clientWidth 1105`, so `/transactions` gains a horizontal scrollbar.

No ancestor sets a non-visible `overflow` — every element in the chain is `overflow-x: visible`. So the third segment ("Expenses") is **not clipped**; it paints on top of the neighbouring field. The symptom is collision, not truncation.

## Desired result (to-be)

- Every filter control renders inside its own cell at every supported width, with no overlap and no page-level horizontal scrollbar.
- The two wide controls get the width they need rather than being squeezed into a track sized for short inputs.
- The existing responsive behaviour at `grid-cols-2` / `sm:grid-cols-3` is preserved.

## Acceptance criteria

- [ ] At 1120px, no filter control's bounding box intersects another's.
- [ ] `documentElement.scrollWidth` equals `clientWidth` on `/transactions` at 1120px — no horizontal scrollbar.
- [ ] The form's `scrollWidth` does not exceed its `clientWidth`.
- [ ] All three "Amount type" segments render fully and are individually clickable.
- [ ] "Make rule from filter" reads as a complete label, and "Clear" sits inside the form's right edge.
- [ ] Behaviour at the `grid-cols-2` and `sm:grid-cols-3` breakpoints is unchanged or improved — verified, not assumed.
- [ ] Unit tests cover the filter form's rendered structure at the changed breakpoint (or a documented reason why this is browser-verified only).
- [ ] Verified live in the browser at 1120px, 1440px, and the mobile preset.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Suggested shape: `lg:grid-cols-4` with `col-span-2` and `min-w-0` on the amount-type fieldset and the button pair. Confirm against the real control widths rather than adopting it blind.
- Two buttons labelled "Clear" sit roughly 200px apart in this region — one clears filters, one clears the row selection. Worth disambiguating while the file is open, though it is not required by this ticket's criteria.
- Related: [TICKET-TXN-12](./TICKET-TXN-12-mobile-transactions-table.md) covers the same page at mobile widths.
