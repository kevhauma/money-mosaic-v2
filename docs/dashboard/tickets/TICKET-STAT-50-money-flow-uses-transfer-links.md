# TICKET-STAT-50 — The money-flow diagram honours confirmed transfer links

- **Area:** Statistics (core/stats) — Explore money-flow diagram
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR5-17 (extended to links with no IBAN on either leg); fixes FR-EXP-2 ([TICKET-EXP-02](../../explore/tickets/TICKET-EXP-02-money-flow-sankey.md), [TICKET-EXP-06](../../explore/tickets/TICKET-EXP-06-money-flow-account-balance-tiers.md)) against FR-TRF-1/FR-TRF-2 transfer links

## User story

As a user who moves money from checking to savings, I want the money-flow diagram to draw that move once, as a checking → savings ribbon, so savings doesn't show twice the money arriving and a fake "Uncategorised income" source.

## Description

The diagram recognises a transfer only by the counterparty IBAN and never reads `transferId`. Transfer matching links pairs where only one leg (or neither) carries an IBAN, so the leg without one is drawn as income or expense next to the transfer ribbon. `saving-velocity.ts` already solves this: the linked sibling wins over the IBAN.

## Current situation (as-is)

- [money-flow-graph.ts:236-266](../../../src/app/core/stats/money-flow-graph.ts) — `classifyMovement` looks up `ownAccounts.get(normalizeIban(transaction.counterpartyIban))` (line 247) and falls through to `income`/`expense` when it misses.
- One-sided link: checking −250 names the savings IBAN; savings +250 has none. Checking draws checking → savings 250; savings +250 draws "Uncategorised income → savings" 250. Savings shows 500 arriving.
- Link with no IBAN on either leg: checking −250 becomes an expense to its category (or "Uncategorised"), savings +250 becomes income. No ribbon between the accounts at all.
- Transfer matching does link one-sided pairs ([transfer-matching.ts](../../../src/app/core/transfers/transfer-matching.ts)); manual links need no IBAN.
- [saving-velocity.ts:103-125](../../../src/app/core/stats/saving-velocity.ts) — `legsByTransfer` + `counterpartOf`: "the linked sibling wins over the IBAN … a confirmed transfer link is the stronger fact".
- [money-flow-graph.spec.ts](../../../src/app/core/stats/money-flow-graph.spec.ts) only covers pairs where both legs carry IBANs.

## Desired result (to-be)

- The counterparty account of a leg is its linked sibling's account when `transferId` is set and the sibling is in the input, else the IBAN lookup — the same rule as `counterpartOf`. The existing same-tier and "draw only the shallower leg" logic then applies unchanged.
- `legsByTransfer`/`counterpartOf` live in one `core/stats` module used by both `saving-velocity.ts` and `money-flow-graph.ts`, not copied.

## Acceptance criteria

- [ ] One-sided link (checking −250 with the savings IBAN, savings +250 without, same `transferId`): one checking → savings link of 250, no "Uncategorised income" node, savings inflow 250.
- [ ] Link with no IBAN on either leg: one checking → savings link of 250, no income or expense flows from either leg.
- [ ] Link between two accounts on the same tier: counted in `sameTierTransferCount`, not drawn as income/expense.
- [ ] An unlinked row whose IBAN names an own account still draws a transfer (current behaviour kept).
- [ ] A leg whose sibling falls outside `[from, to]` is still classified by the sibling's account (the sibling is looked up in the full input, not the in-range subset).
- [ ] `saving-velocity` specs pass unchanged after the helper move.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Live browser check: on Explore, a linked checking → savings move with one IBAN shows one ribbon and no extra income into savings.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Ticketed under STAT (core/stats) though the panel lives in `feature-explore`.
- Nullified legs stay skipped before the lookup, as today.
