# TICKET-TXN-12 — Transactions is unusable on a phone

- **Area:** Transactions
- **Type:** Bug fix
- **Traceability:** UX review (UXR-9); FR-TXN-2 — a 750px table inside a 375px viewport, with 20px checkboxes and 24px icon buttons

## User story

As someone checking a transaction on my phone, I want the amount and row actions to be on screen, so that I do not have to scroll sideways to read the one column I came for.

## Current situation (as-is)

At the mobile preset (375×812), `/transactions` renders its table **750px wide** inside a horizontal-scroll wrapper. The Amount column and both row action buttons sit off-screen at rest. There is no card fallback — the desktop table is simply scrolled.

Touch targets in the same view:

| Element | Rendered size | Minimum |
|---|---|---|
| Row checkbox | 20 × 20px | 44 × 44px |
| Row icon buttons (edit, unlink) | 24 × 24px | 44 × 44px |

KPI values elsewhere in the app stay at 36px with 12px sub-labels on a 375px screen — there is no responsive type scale.

The mobile top bar (64px) shows only a hamburger and the wordmark, with no page title, so scrolling loses all context.

## Desired result (to-be)

- On a phone, a transaction's date, description, category and **amount** are all readable without horizontal scrolling.
- Row-level interactive targets meet a 44px minimum touch size.
- The user can tell which page they are on after scrolling.

## Acceptance criteria

### Implementation note, 2026-08-24 — a card list below `md`, and why the top bar was left alone

The page now renders **one** of two row presentations, chosen by `isCompactViewport()`
(`shared/utils/compact-viewport.ts`, new): the existing table at `md` and above, and
`app-transaction-card` — one card per row, same `TransactionRowVm`, same four outputs — below it.

A signal rather than `hidden md:block` on both, deliberately: the page renders 50 rows and each
carries a `<select>` with an `<option>` per category, so a CSS-hidden second copy would be a few
thousand dead DOM nodes on every page and filter change. The breakpoint is `md` (768px), not the
shell's `lg`, because the table measures ~750–800px — a tablet still reads it whole and only a
phone does not.

**Criterion 5 diverges, on evidence.** The ticket asks for the mobile top bar to name the page; it
is not built, because the need it exists for is already met and building it would put two titles on
a 375px screen. TICKET-UI-25 made `mm-page-header` `sticky top-0`: measured on the dev server at
375px, scrolled to y=1500, the shell's mobile navbar has scrolled away (`top: -1500`) and the page
header is pinned at `top: 0` reading "Transactions". The review's as-is described the shell bar and
did not account for the sticky header below it. Adding the title to the shell bar as well would also
breach TICKET-UI-22's one-header rule. Recorded rather than silently skipped — reopen it if the
sticky header is ever dropped.

- [x] At 375px, `/transactions` produces no horizontal scrolling to read date, description, category and amount. (Measured live on :4210 at 375×812: `document.documentElement.scrollWidth === clientWidth === 375`, and a sweep of every visible element under `<main>` for `scrollWidth > clientWidth` returns an empty list. A card measures 343px wide with all four fields in it — e.g. `18/08/2026 · −€15,80 · Train ticket · NS Rail · Everyday Checking` plus its category picker.)
- [x] Row checkboxes and row action buttons each present at least a 44×44px touch target at 375px (visual size may stay smaller if the hit area does not). (Measured: the checkbox's wrapping `<label>` is exactly 44×44 while the checkbox inside stays `checkbox-sm`; "Unlink transfer" and "Edit transaction" are 44×44 each; the category `<select>` is 265×44 — `select-sm`'s 32px would have been under the floor, so the card density drops it. 44px per the ticket's own guideline, unchanged. `transaction-card.component.spec.ts` → *"gives every row-level target a 44px hit area"* holds the classes so none can be removed without a failure.)
- [x] Row actions are reachable without horizontal scrolling. (Both buttons sit on the card's last line, inside the 343px card; same measurement as above.)
- [x] The desktop table layout at ≥1024px is unchanged. (Loaded at 1120×900: 41 `app-transaction-row`, zero cards, the table at 799px with its seven columns — checkbox, Date, Description, Account, Category, Amount, actions — and 7 `<td>` per row, exactly as before. The table branch's markup is untouched; the only edit inside it is the `@if`/`@else` around it. Pinned by *"renders the table, and no cards, at desktop width"*.)
- [ ] The mobile top bar communicates the current page. — **not built, deliberately; see the implementation note above.** The sticky `mm-page-header` already keeps "Transactions" on screen at every scroll position (measured), and a second title in the shell bar would breach TICKET-UI-22 and cost a phone a line of chrome for nothing.
- [x] Unit tests cover the mobile presentation branch rendering the same row data as the table branch (no field silently dropped). (`transaction-card.component.spec.ts` → describe *"the same row data as the table (TICKET-TXN-12)"*: renders one VM through **both** components and asserts date, description, counterparty, account and amount appear in each, for a plain row and for a flagged+linked one — so a field added to the row later fails here until the card carries it. Plus four cases in `transactions-overview.component.spec.ts` for the swap itself, including that select-all survives losing the `<thead>` it hung off. 199/199 pass across `feature-transactions`.)
- [x] Verified live in the browser at 375px and at 1120px. (Both widths above, against the dev server on :4210, 2026-08-24. One caveat, and it is the harness not the code: with the browser pane hidden the page composites no frames, and a CDP viewport change fires **no** `matchMedia` `change` event at all — verified by attaching a bare listener in the page and resizing, which recorded zero events — so the *live crossing* of the breakpoint could not be observed, only each width loaded fresh. The listener path itself is unit-tested in `compact-viewport.spec.ts` → *"follows the query as the viewport crosses the breakpoint"*.)
- [x] Verified via the fallow skill and coding-conventions skill. (Both fallow CI gates exit 0. `conventions-reviewer` returned four findings, all applied: the card now renders on `mm-paper` rather than a hand-rolled `rounded-box border bg-base-100` — which would have left the phone layout unthemed on the five themes that restyle `.mm-table-wrap`, confirmed live as `bg-(--mm-surface-raised) border border-base-300 card mm-elev-raised`; the spec brackets both describes with `withCleanFormatSettings()`, which it needed the moment it started asserting `€` amounts; the amount uses `mm-text`'s `weight` input instead of a raw `font-medium`; and the duplicated six-binding `@for` in the two branches is now both commented and covered by a wiring test that drives selection, edit and the category quick-set through a card. `ng lint` clean, `ng build --configuration development` compiles, 3436/3436 unit tests pass.)

## Notes

- A card-per-row presentation below the table breakpoint is the conventional answer and matches how the rest of the app stacks on mobile; confirm against the actual row content before committing to it.
- The 44px minimum is the common touch guideline; if a different figure is chosen, record why.
- Responsive type scaling for KPI values is related but broader than this page — worth its own ticket rather than being folded in here.
- Related: [TICKET-TXN-11](./TICKET-TXN-11-filter-bar-controls-overlap.md) fixes the same page at desktop widths.
