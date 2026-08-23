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

- [ ] At 375px, `/transactions` produces no horizontal scrolling to read date, description, category and amount.
- [ ] Row checkboxes and row action buttons each present at least a 44×44px touch target at 375px (visual size may stay smaller if the hit area does not).
- [ ] Row actions are reachable without horizontal scrolling.
- [ ] The desktop table layout at ≥1024px is unchanged.
- [ ] The mobile top bar communicates the current page.
- [ ] Unit tests cover the mobile presentation branch rendering the same row data as the table branch (no field silently dropped).
- [ ] Verified live in the browser at 375px and at 1120px.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- A card-per-row presentation below the table breakpoint is the conventional answer and matches how the rest of the app stacks on mobile; confirm against the actual row content before committing to it.
- The 44px minimum is the common touch guideline; if a different figure is chosen, record why.
- Responsive type scaling for KPI values is related but broader than this page — worth its own ticket rather than being folded in here.
- Related: [TICKET-TXN-11](./TICKET-TXN-11-filter-bar-controls-overlap.md) fixes the same page at desktop widths.
