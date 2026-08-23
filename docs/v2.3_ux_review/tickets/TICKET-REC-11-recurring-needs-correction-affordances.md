# TICKET-REC-11 — Recurring detection can't be corrected, and over-claims

- **Area:** Recurring
- **Type:** Bug fix
- **Traceability:** UX review (UXR-15); FR-REC-* — detection is presented as fact, with no confidence, merge, or dismiss

## User story

As someone reviewing my recurring payments, I want to tell the app when it has guessed wrong, so that a detection I disagree with stops being presented as a fact about my finances.

## Current situation (as-is)

On the seeded dataset `/recurring` reports **"7 recurring payments ≈ €1,202.04/month"** — a figure identical to the month's entire expense total. It has classified 100% of spending as recurring, including a one-off dinner out and a train ticket.

It also lists **"FreshMarket" twice** as two separate monthly payments (€73.15 and €58.40) — same counterparty, same category, two entries.

The page offers no confidence indicator, no way to merge two detections of the same payment, and no way to dismiss one. Detection is presented as settled fact.

This is the clearest breach of the product's own stated principle of **reversible automation** — "helpful defaults the user can always see, inspect, and override" ([PRODUCT.md](../../../PRODUCT.md)). Categorisation honours that principle via `categoryManual`; recurring detection has no equivalent.

The page's copy is otherwise a strength — "Detected across your whole transaction history — a rhythm can't be read from a single month, so this page has no date range" is a genuinely good explanation of why a control is absent. The problem is not that the page fails to explain itself; it is that it gives the user nothing to do when it is wrong.

## Desired result (to-be)

- Each detection shows how confident the app is, so a weak match is not presented like a strong one.
- The user can dismiss a detection that is not really recurring, and that dismissal sticks across re-detection.
- The user can merge two detections that are the same real-world payment.
- The headline total reflects only detections the user has not dismissed.

## Acceptance criteria

- [ ] Each detected payment shows a confidence indicator derived from the existing detection signals.
- [ ] A detection can be dismissed, and stays dismissed when detection re-runs.
- [ ] Two detections of the same payment can be merged, and the merge survives re-detection.
- [ ] The summary total and count exclude dismissed detections.
- [ ] User dismissals and merges are never silently discarded by re-detection — the same guarantee `categoryManual` gives categorisation.
- [ ] Persistence goes through the store/repository layer in `core/data-access/`; any schema change is additive per CLAUDE.md.
- [ ] Unit tests cover: a dismissed detection stays dismissed after re-detection; a merged pair stays merged; the total excludes dismissals; two same-counterparty same-category detections are offered as merge candidates; an undismissed detection is unaffected.
- [ ] Verified live in the browser: dismiss a detection, reload, confirm it is still dismissed and the total dropped.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Whether the detector itself is too loose is a separate question from whether the user can correct it. This ticket delivers the correction affordances; **tightening detection is deliberately out of scope** and wants its own ticket informed by what users actually dismiss.
- A UX review also found `/recurring`'s calendar rendering September's trailing days with full event styling, so a payment appears twice under an "August 2026" heading. Small and separate — worth fixing while the file is open, not required here.
- Related: [TICKET-INC-23](./TICKET-INC-23-replace-the-income-onboarding-wall.md) — same theme of inference the user cannot reach.
