# TICKET-LOAN-15 — Loan card's "remaining" caption escapes the card border

- **Area:** Loans
- **Type:** Bug fix
- **Traceability:** UX review (UXR-7); FR-LOAN-6 (loans overview cards) — a `justify-between` row with no `min-w-0` or gap overflows once the balance exceeds ~€1,250

## User story

As someone glancing at my loans, I want the balance and its caption to sit inside the card, so that the headline figure of the feature does not render broken.

## Current situation (as-is)

The balance row in [loan-card.component.html](../../../src/app/feature-loans/components/loan-card/loan-card.component.html) is an `<mm-flex justify="between" align="baseline">` with no `min-w-0`, no `gap`, and no truncation, inside a content box only **201px** wide.

Measured at a 1120px viewport, for a balance of `€248,392.10`:

```
.card             x 295.0 → 546.3
row               clientWidth 201, scrollWidth 240   (overflow +39)
amount            x 320.0 → 501.9
caption "remaining"  x 501.9 → 559.7
```

So there is **zero gap** between the number and the word, and the caption sits **13.4px outside the card's right border**.

This is systematic, not one unlucky record. Sweeping balance sizes:

| Balance | Amount width | Row sw/cw | Caption right vs card right (546.3) |
|---|---|---|---|
| €125.00 | 119.4 | 201 / 201 | 521.3 — fits |
| €1,250.00 | 147.1 | 205 / 201 | 524.9 — row overflows, caption still inside |
| €12,500.00 | 168.6 | 226 / 201 | 546.4 — **escapes card** |
| €248,392.10 | 181.9 | 240 / 201 | 559.7 — **escapes by 13.4** |
| €1,248,392.10 | 203.3 | 261 / 201 | 1115.7 — **escapes card by 34.7 and the viewport by 10.7** |

The row overflows its content box once the amount exceeds roughly 143px — i.e. from about €1,250 upward. Any five-figure balance pushes the caption outside the border, which for a mortgage tracker is the normal case, not the edge case.

## Desired result (to-be)

- The balance and its caption both render inside the card at every realistic balance, up to and beyond seven figures.
- There is visible separation between the number and the word.
- The layout degrades predictably for very long values (wrap or stack) rather than overflowing.

## Acceptance criteria

- [ ] At 1120px, the caption's right edge sits inside the card's right border for balances of €125, €12,500, €248,392.10 and €1,248,392.10.
- [ ] The row's `scrollWidth` does not exceed its `clientWidth` at any of those values.
- [ ] A visible gap separates the amount from the caption.
- [ ] Nothing in the loans list causes a page-level horizontal scrollbar at 1120px or at the mobile preset.
- [ ] Unit tests cover the card rendering a long balance without the caption and amount sharing a line when there is insufficient room (or a documented reason this is browser-verified only).
- [ ] Verified live in the browser with at least one six-figure loan balance present.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Likely fix is `gap-2` plus `min-w-0` with the amount allowed to shrink, or stacking the caption beneath the amount. Either is acceptable if the criteria hold.
- The dev seed creates no loans ([dev-seed.ts](../../../src/app/dev-seed/dev-seed.ts) has no loan rows), so verifying this needs a loan created by hand. Worth considering whether the seed should include one — that would be its own ticket.
- A UX review also reported the loan card's "30 months behind schedule" / "−€8,685.84 extra interest so far" badge as an unexplained, actionless emotional low point, and a payoff date disagreeing with itself across two surfaces (`07/01/2046` on the card vs "August 2046" in What-if). Neither was independently reproduced — the reviewing session had loan data that a later session did not. **Both need confirming before they are ticketed.**
