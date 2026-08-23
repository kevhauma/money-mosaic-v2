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

Shipped shape: `lg:grid-cols-4` (not six), with the DOM reordered so Search sits before the amount
group — that is what lets the two rows fill exactly with no hole. Row 1 is Account / Date range /
Category / Search, one ~187px track each; row 2 is the amount group over three tracks and the button
pair in the fourth, stacked one per line. Two smaller defects surfaced during measurement and are
fixed here too: the `Make rule from filter` label wrapped to a second line its own button height then
clipped, and the daisyUI tooltip's centred pseudo-element — wider than its trigger, on the form's
right edge — pushed the form's `scrollWidth` 5px past its `clientWidth` on its own, so it now opens
`tooltip-left`.

- [x] At 1120px, no filter control's bounding box intersects another's. (Pairwise intersection test over the form's six grid children in the live page: `overlaps: []`. Also `[]` at 1440px, 800px and the mobile preset.)
- [x] `documentElement.scrollWidth` equals `clientWidth` on `/transactions` at 1120px — no horizontal scrollbar. (`1105 === 1105`. Was `1124` vs `1105`.)
- [x] The form's `scrollWidth` does not exceed its `clientWidth`. (`799 === 799`; was `828` vs `784`. The last 5px of it were the tooltip, isolated by toggling the `tooltip` class live — `804 → 799` — and fixed with `tooltip-left` rather than left in place.)
- [x] All three "Amount type" segments render fully and are individually clickable. (At 1120px each is 62px wide with `clientWidth === scrollWidth === 60`, and `document.elementFromPoint` at each segment's centre returns that segment's own button — `All`, `Income`, `Expenses`.)
- [x] "Make rule from filter" reads as a complete label, and "Clear" sits inside the form's right edge. (Both buttons render 183px wide at 1120px with `clientHeight === scrollHeight === 30` — one line, nothing clipped; the label needs 139px on one line, which is why the pair stacks. The rightmost edge is 1064, exactly the form's content-box right.)
- [x] Behaviour at the `grid-cols-2` and `sm:grid-cols-3` breakpoints is unchanged or improved — verified, not assumed. (Measured at 800px and at the 375px mobile preset: no overlaps, `documentElement.scrollWidth === clientWidth` at both, and the button pair is now a full-width row of two rather than one cramped 1-of-3 cell — an improvement, not a regression.)
- [x] Unit tests cover the filter form's rendered structure at the changed breakpoint (or a documented reason why this is browser-verified only). (`transaction-filters.component.spec.ts` → "lays the lg grid out in four tracks, with spans that fill both rows" and "stacks the action buttons once they share one lg track". jsdom has no layout, so these hold the *class contract* the fix rests on; the pixel measurements are the browser evidence above.)
- [x] Verified live in the browser at 1120px, 1440px, and the mobile preset. (Plus 800px, to cover the `sm` breakpoint the criterion above asks about. Numbers on each criterion.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow dead-code` and `fallow health --complexity` both exit 0; `ng lint` clean. `FlexComponent` became unused in this component when the button row turned into a grid and was removed from its `imports`.)

## Notes

- Suggested shape: `lg:grid-cols-4` with `col-span-2` and `min-w-0` on the amount-type fieldset and the button pair. Confirm against the real control widths rather than adopting it blind.
- Two buttons labelled "Clear" sit roughly 200px apart in this region — one clears filters, one clears the row selection. Worth disambiguating while the file is open, though it is not required by this ticket's criteria. **Deliberately not done here** — it is a copy decision, and this ticket's diff is layout only.
- Related: [TICKET-TXN-12](./TICKET-TXN-12-mobile-transactions-table.md) covers the same page at mobile widths.
