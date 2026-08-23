# TICKET-STAT-44 — Category breakdown draws a donut for a single 100% category

- **Area:** Dashboard / Stats
- **Type:** Bug fix
- **Traceability:** UX review (UXR-21); extends FR-STAT-2 (category breakdown)

## User story

As someone glancing at my category breakdown, I want the chart to only appear when there is a breakdown to show, so that a single category does not get drawn as a proportion of itself.

## Current situation (as-is)

The dashboard's Category breakdown renders an ECharts donut regardless of how many categories are present. With a single category — "Salary" at 100% on the seeded income side — the result is a complete ring occupying half the card while conveying exactly one number, which the adjacent list already states.

Related presentation problems in the same panel:

- The Expense donut's slice labels **collide and truncate** ("Groceri…") once several categories are present.
- A "**Show more (1)**" disclosure appears for exactly one additional row — a control costing a click to reveal a single line.
- The `/dashboard` "Category period comparison" renders four cards each showing three grey bars, one red bar, "0%", and "Avg €950.00 / High €950.00 / Low €950.00" — an empty state formatted like data, and one whose red bar reads as an error.

## Desired result (to-be)

- With a single category, the panel shows the figure directly instead of drawing a proportion of itself.
- Slice labels stay legible as the category count grows, or move to the accompanying list.
- A disclosure only appears when it hides enough rows to be worth a click.
- Panels with no meaningful comparison say so, rather than rendering placeholder numbers and a red bar.

## Acceptance criteria

- [ ] With exactly one category, the panel renders a direct figure rather than a full-ring donut.
- [ ] With several categories, no slice label overlaps another or is truncated mid-word at the default dashboard width.
- [ ] The "Show more" disclosure appears only above a stated threshold of hidden rows.
- [ ] "Category period comparison" renders an explanatory empty state when there is no prior period to compare against, and does not use the error colour for a non-error.
- [ ] The accompanying data table remains correct in every case, including the single-category one.
- [ ] Unit tests cover: one category renders the direct figure, not the donut; several categories render the chart; the disclosure threshold; the no-comparison empty state.
- [ ] Verified live in the browser on a single-category range and a multi-category range.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- The "Accounts" dashboard widget has a related shape problem — a full-width card holding two small pills and roughly 500px of empty space. Not scoped here, but the same question applies: does this content justify this container.
- The red bar in the comparison cards may be resolved for free by [TICKET-UI-27](./TICKET-UI-27-separate-money-colours-from-brand-colour.md) if it is the brand/error collision; check before treating it separately.
