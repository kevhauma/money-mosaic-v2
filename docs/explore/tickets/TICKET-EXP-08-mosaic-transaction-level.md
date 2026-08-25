# TICKET-EXP-08 — Spending mosaic: drill from a category into its individual transactions

- **Area:** Explore
- **Released in:** [v2.1 Extra graphs](../../releases/v2.1_extra_graphs/overview.md)
- **Type:** Feature
- **Traceability:** extends **FR-EXP-4** ([TICKET-EXP-07](./TICKET-EXP-07-spending-mosaic-treemap.md),
  shipped 2026-08-11). From feedback on that mosaic, the day it landed.

## User story

As someone reading the mosaic, I want to open a category and see its individual payments as tiles,
so I can tell at a glance whether €300 of Groceries was one big shop or thirty small ones — the
question a category total can never answer.

## Description

Adds a third level to the mosaic: group → category → **transaction**. Clicking a category drills
into it the same way clicking a group already does, and its box fills with one tile per payment,
sized by amount. The texture of the drilled-in box *is* the answer — a few large rectangles, or a
mosaic of slivers.

## Current situation (as-is)

- [computeSpendingMosaic](../../../src/app/core/stats/spending-mosaic.ts) folds
  `computeCategoryBreakdown().expenseByCategory` into two levels only: group tiles and category
  tiles. Its input carries per-category *totals* (`CategoryBreakdownEntry`), so nothing below a
  category exists in the data at all.
- The panel renders with `leafDepth: 1` ([spending-mosaic-panel.component.ts](../../../src/app/feature-explore/components/spending-mosaic-panel/spending-mosaic-panel.component.ts)),
  so a click on a tile with children already re-roots the chart and the breadcrumb walks back —
  **the interaction this ticket needs already works**; only the third level of data is missing.
  A category tile today has no children, so it is a dead end.
- The one place a transaction's *classified* contribution is decided is
  [classifyForStats](../../../src/app/core/stats/classify-for-stats.ts), the shared pipeline
  `computeCategoryBreakdown` itself routes every transaction through.

## Desired result (to-be)

> **Revised during the build, 2026-08-11.** This ticket was written as a *drill-down* — click a
> category, see its payments. On the user's instruction, and with echarts' disk-usage and
> Obama-budget treemaps as the reference, it ships as a **fully nested** picture instead: all three
> levels drawn at once, no click, no breadcrumb. Each parent keeps a thin strip carrying its **share
> only** — its name would cost more room than the strip is worth, and the name stays available in
> the tooltip and the figure table. Payments inherit their category's hue with echarts varying the
> saturation, the Obama treemap's third-level treatment. Every clause below still holds except the
> drill-down one, which is struck in the criteria.

- A new pure aggregate in `core/stats/` grouping a range's expense transactions by category —
  `{ categoryId, transactions: { id, name, value, date }[] }` — built **through
  `classifyForStats`**, not through a second sign/exclusion rule of its own, so a transaction tile
  and the category tile above it can never disagree about what counts.
- `computeSpendingMosaic` takes that map as an optional third argument and hangs the tiles under
  their category node. Called without it, it behaves exactly as it does today (EXP-07's specs stay
  green untouched).
- A transaction tile is labelled with its counterparty/description and drawn in its category's
  colour, so a drilled-in box reads as one category's worth of payments rather than a new palette.
- **Refunds do not become tiles.** A negative classified contribution is money coming back; it has
  no honest area. Where a category's positive payments exceed its refund-netted total, the
  difference is stated rather than silently dropped.
- **A bounded number of tiles per category.** Past a cap, the smallest payments fold into one
  explicitly-labelled remainder tile (`N smaller payments`) whose value is exactly their sum — a
  drilled-in box of 800 unreadable slivers answers the question worse than 40 tiles plus a
  labelled remainder, and it bounds the DOM the `sr-only` table has to mirror.
- The `sr-only` figure table gains the transaction rows, under their category.

## Acceptance criteria

- [x] Expense transactions per category come from a pure `core/stats` function routed through
      `classifyForStats` (no second exclusion/sign rule), exported from
      [core/stats/index.ts](../../../src/app/core/stats/index.ts).
      (`core/stats/category-expense-transactions.ts` — one `classifyForStats` call per transaction
      and no rule of its own; asserted by `category-expense-transactions.spec.ts` → "inherits every
      exclusion from classifyForStats rather than repeating them", which feeds an out-of-range row, a
      `nullified` one, a linked transfer leg, a savings movement, income and a zero amount and gets
      one payment back.)
- [x] ~~Clicking a category in the mosaic drills into its transactions; the breadcrumb returns to
      the category's parent and then to the whole mosaic.~~ **Revised mid-build, 2026-08-11, on the
      user's instruction ("make the subdivisions visible without zooming in", pointing at echarts'
      own disk-usage and Obama-budget treemaps): every level is drawn at once, and there is no
      drill-down to click into.** `leafDepth` is unset, `nodeClick` is `false` and the breadcrumb is
      hidden — with the payments already on screen a click had nothing to reveal, and `zoomToNode` is
      a viewport transform, not a re-layout, so it left the mosaic half outside its own box (observed
      live with `roam` both off and on). What the criterion was protecting — being able to see a
      category's payments — is now true without any interaction at all.
      (Live, all-time range: Housing shows its four Vesta Rentals payments and Groceries its seven
      FreshMarket ones, side by side, with no clicking. A category too small for its payments to be
      legible draws solid instead, via `childrenVisibleMin`.)
- [x] Transaction tiles are sized by their classified amount, labelled with counterparty or
      description, and drawn in their category's colour.
      (`spending-mosaic.spec.ts` → "hangs a category payments under it, in its own colour"; the name
      falls back from `counterpartyName` to `rawDescription`, asserted in
      `category-expense-transactions.spec.ts` → "groups a range payments by category, heaviest first,
      named by counterparty". Live: seven tiles at €73.15/€58.40 inside Groceries, four at €950.00
      inside Housing, all in the category's own colour.)
- [x] Refunds produce no tile, and a category whose payments exceed its netted total says so rather
      than showing children that silently outweigh their parent.
      (`computeCategoryExpenseTransactions` sums negative contributions into `refunded` instead of
      emitting a tile — "counts a refund as money back rather than as a tile with negative area" —
      and the panel states the total under the chart, asserted by "says what refunds took out, rather
      than showing tiles that outweigh their category". Under privacy mode the sentence keeps its
      meaning and drops the figure.)
- [x] Past the per-category cap, the remaining smallest payments appear as one labelled remainder
      tile whose value equals their sum exactly.
      (`MAX_TRANSACTION_TILES = 40`; "folds everything past the cap into one labelled remainder worth
      exactly their sum" checks 45 payments → 41 tiles, the last named "5 smaller payments" and the
      children still summing to the category total, plus "names a single folded payment in the
      singular".)
- [x] `computeSpendingMosaic` called without the new argument produces byte-identical output to
      today (EXP-07's spec passes unchanged).
      ("produces exactly today two-level output when no payments are passed at all" compares the
      two-argument and three-argument calls directly; EXP-07's six specs are untouched and green.)
- [x] The `sr-only` figure table lists each transaction tile under its category, with amount and
      share, and withholds amounts under privacy mode.
      (`spendingMosaicRows` is recursive now and its first column became **"Inside"** — what a tile
      sits in, since at three levels that is a group *or* a category. "descends into a category
      payments, naming what each one sits inside" covers it, including two same-named payments
      keeping distinct track keys; the privacy row test is unchanged and still passes. Live: the
      table listed all seven Groceries payments under `Groceries`, summing to €453.05.)
- [x] Unit tests cover: the per-category transaction grouping (in range, out of range, refund,
      transfer/savings exclusion); the cap and its remainder tile; the mosaic fold with and without
      transactions; the panel rendering a drilled category.
      (36 tests across the four affected spec files — 4 new in
      `category-expense-transactions.spec.ts`, 6 new in `spending-mosaic.spec.ts`, 3 new in the
      panel's.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass.
      (Run end-to-end by the `verifier` subagent on the final tree — lint clean, **248 files / 2722
      tests** green, dev build clean with both workers emitted.)
- [x] Verified via the fallow skill and coding-conventions skill.
      (`fallow audit --base HEAD`: verdict **pass** — 0 dead code, 0 duplication, 0 complexity. Three
      rounds of findings were fixed rather than suppressed: the two aggregate call sites collapsed
      into one shared `statsInput` tuple, and `computeCategoryExpenseTransactions` /
      `computeSpendingMosaic` decomposed into named helpers. The `conventions-reviewer` subagent
      found no hard-rule or structural violations; its substantive findings are all fixed — the
      refund note now blurs a real figure via `mm-privacy-blur` instead of inventing a per-chart
      privacy euphemism, an unsaved `Transaction` is skipped rather than defaulted to `txn:0`, the
      `sr-only`/aria wording and the panel doc comments name all three levels, `CategoryExpenseTransaction`
      is used instead of an indexed-access type, and `categoryTileId` is built in one place. Its one
      deliberate non-fix: the `counterpartyName || rawDescription` label rule now appears in three
      `core/stats` files — pre-existing duplication, and folding it into a shared helper touches two
      shipped aggregates, so it belongs in its own ticket.)
- [x] Verified live in the browser: a real category shows its payments, and a
      many-small category is visibly distinguishable from a few-large one.
      (2026-08-11, all-time range on the real dataset, **without clicking anything**: Housing shows
      **four equal €950.00 rectangles** while Groceries beside it shows **seven smaller tiles** at
      two sizes — the two textures are unmistakably different at a glance, which is the whole point
      of the ticket. Utilities shows four, Eating Out three. Payment tooltips
      read e.g. "Vesta Rentals · 08/03/2026 · €950.00 · 20.2% of all spending"; the date was added
      during this check, because four tiles all reading "Vesta Rentals" are otherwise
      indistinguishable. Single-payment categories stay leaves, also found during this check.)

## Notes

- **Why this is not just "show more levels".** EXP-07 deliberately shows one level at a time
  (`leafDepth: 1`) because echarts only re-roots on click when the children are not already drawn.
  That decision is what makes this ticket cheap: the third level costs data, not interaction.
- Income is still out of scope, for EXP-07's reason — a mixed-sign treemap has no honest area
  semantics.
- **Needs [TICKET-EXP-07](./TICKET-EXP-07-spending-mosaic-treemap.md)** (shipped). Independent of
  every other open ticket in this version.
- **Two rules the build added to the to-be**, both from what the data actually looked like:
  a category with **fewer than two** payments stays a leaf (drilling into one payment redraws the
  same rectangle under a new breadcrumb, and doubles its figure-table row); and a payment tile's
  tooltip carries its **date**, because a category's tiles all read "FreshMarket" otherwise.
- A payment tile deliberately does **not** navigate to `/transactions` on click — a click is how you
  drill down here, and `MosaicNode` would have to carry a transaction id into the option builder to
  do both. If the appetite for "open this payment" appears, it is its own ticket.
