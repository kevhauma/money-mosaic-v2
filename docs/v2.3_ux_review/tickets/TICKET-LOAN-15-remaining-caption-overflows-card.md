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

Shipped shape: the row keeps `justify-between` and gains `flex-wrap`, `gap-2`, and `min-w-0
break-words` on the amount. Small balances still sit side by side with a gap; from about €1,250 up,
"remaining" drops to its own line rather than being pushed past the border; and `break-words` is the
last resort that keeps even a seven-figure amount inside a narrow card.

- [x] At 1120px, the caption's right edge sits inside the card's right border for balances of €125, €12,500, €248,392.10 and €1,248,392.10. (Card right edge 541.3 throughout. Caption right: 516.3 at €125 — same line — and 362.8 at all three larger values, where it has wrapped to its own line. `€1.250,00` was measured too, as the ticket's own sweep names it as the first overflowing value.)
- [x] The row's `scrollWidth` does not exceed its `clientWidth` at any of those values. (`211 === 211` at every one of the five. Was 240/201 at €248,392.10 and 261/201 at €1,248,392.10.)
- [x] A visible gap separates the amount from the caption. (`gap-2` on the row; at €125, where they share a line, the measured gap is 34px — `justify-between` spreads them beyond the 8px minimum. Above that they are on separate lines, which is separation by construction.)
- [x] Nothing in the loans list causes a page-level horizontal scrollbar at 1120px or at the mobile preset. (`documentElement.scrollWidth === clientWidth`: 1120 at 1120px, 375 at the mobile preset, 1024 at 1024px — checked at all three balances at each width.)
- [x] Unit tests cover the card rendering a long balance without the caption and amount sharing a line when there is insufficient room (or a documented reason this is browser-verified only). (`loan-card.component.spec.ts` → "lets the balance row wrap, gap and shrink rather than overflow the card". jsdom has no layout engine, so the spec holds the class contract — `flex-wrap`, `gap-2`, `min-w-0`, `break-words` — that produced the measurements above; the pixel evidence is browser-only, and the spec says so.)
- [x] Verified live in the browser with at least one six-figure loan balance present. (A €260,000 / 3.5% / 300-month mortgage created through the app's own Add-loan form, balance `€259.440,30`. Balance strings were then swept across the ticket's five test values by substituting the rendered label, so the real CSS was measured at each.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow dead-code` and `fallow health --complexity` both exit 0; `ng lint` clean.)

## Notes

- Likely fix is `gap-2` plus `min-w-0` with the amount allowed to shrink, or stacking the caption beneath the amount. Either is acceptable if the criteria hold.
- The dev seed creates no loans ([dev-seed.ts](../../../src/app/dev-seed/dev-seed.ts) has no loan rows), so verifying this needs a loan created by hand. Worth considering whether the seed should include one — that would be its own ticket. **Confirmed:** verifying this ticket meant creating a mortgage through the UI first, and it is still sitting in the dev profile.
- **Card width, not just the row.** At exactly 1024px — the narrowest the `lg:grid-cols-3` loans grid ever makes a card, 179px of content — a six- or seven-figure amount takes `break-words` and wraps across two lines. That is the graceful degradation this ticket asked for rather than an overflow, and it clears every criterion above, but it is worth its own ticket: a 36px `display` figure does not fit a 179px card, so the real question is whether that grid should be three-up below `xl` at all.
- A UX review also reported the loan card's "30 months behind schedule" / "−€8,685.84 extra interest so far" badge as an unexplained, actionless emotional low point, and a payoff date disagreeing with itself across two surfaces (`07/01/2046` on the card vs "August 2046" in What-if). Neither was independently reproduced — the reviewing session had loan data that a later session did not. **Both need confirming before they are ticketed.**
