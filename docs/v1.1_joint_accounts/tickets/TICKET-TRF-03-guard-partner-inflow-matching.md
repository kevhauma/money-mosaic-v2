# TICKET-TRF-03 — Guard transfer auto-matching against one-sided partner inflows

- **Area:** Transfers
- **Type:** Feature
- **Traceability:** extends FR-TRF-3 / FR-TRF-5; protects [CAT-02](./TICKET-CAT-02-neutral-category-kind.md) + [STAT-03](./TICKET-STAT-03-contribution-net-worth.md)

## User story

As someone with a shared account, I want a partner's one-sided deposit into a joint account to not be mistaken for a transfer between my own accounts, so an unrelated same-amount transaction of mine isn't silently linked to it.

## Description

A partner's deposit into a joint account has no counterpart in the app (the partner's source account isn't imported). It should be recognised as an **external contribution** (CAT-02's `neutral` kind), not paired with an unrelated same-amount transaction of mine. Today the medium-confidence matcher pairs on equal-amount/opposite-sign/in-window alone, so a partner's €500 deposit can be silently linked to a random €500 debit elsewhere. This ticket keeps such one-sided partner/external inflows out of the amount/date matching pool.

## Current situation (as-is)

- [transfer-matching.ts](../../../src/app/core/transfers/transfer-matching.ts) `resolveTransferMatches()` filters to `transferId == null` transactions, runs `findHighConfidenceMatches` (IBAN-corroborated), then `findMediumConfidenceMatches` on the remainder. Medium confidence only requires `isCandidatePair` — `a.amount === -b.amount`, different account, within `windowDays` — with **no IBAN corroboration**. A mutually-unique such pair is auto-linked when `autoLinkMediumConfidence` is on (default true, per `DEFAULT_TRANSFER_SETTINGS`).
- So a partner's `+500` into the joint account and an unrelated `−500` of mine within the window, if mutually unique, get **auto-linked as a transfer** — which then wrongly excludes both from income/expense and corrupts the STAT-03 stake maths.
- `isLikelyTransfer()` already flags a one-sided movement whose `counterpartyIban` is a **known own account** — but a partner's IBAN is **not** an own account, so nothing currently marks a partner deposit as "leave this alone."
- The matcher has no awareness of category kind; a `neutral`-tagged inflow is still a matching candidate.

## Desired result (to-be)

- A one-sided inflow into a joint account is treated as an **external contribution candidate**, not a transfer candidate, when either:
  - its `counterpartyIban` matches a **registered co-owner IBAN** ([ACC-03](./TICKET-ACC-03-multi-owner-coowner-ibans.md)) — a positive "this is a co-owner's money" signal, **or**
  - its `counterpartyIban` is simply **not a known own IBAN** (fallback heuristic for inflows from people not yet registered).
  Such an inflow is:
  - **excluded from the medium-confidence amount/date pool** (so it can't be paired on amount alone),
  - **not** excluded from high-confidence IBAN matching (if its counterparty genuinely is an own account, that path still links it correctly).
- A transaction already classified `neutral` (CAT-02) is **excluded from all auto-matching** — the user has said "this is a contribution," so it must never be re-linked as a transfer.
- Nothing changes for genuine own-account transfers: same-IBAN high-confidence links and legitimate medium-confidence pairs between my own accounts still work.

## Acceptance criteria

- [x] `resolveTransferMatches()` excludes from the **medium-confidence** candidate pool any transaction that is (a) already `neutral`-kind, (b) a one-sided inflow into a `joint` account whose `counterpartyIban` matches a registered co-owner IBAN (ACC-03), or (c) a one-sided inflow into a `joint` account whose counterparty IBAN is not a known own IBAN. High-confidence IBAN matching is left intact for all transactions.
- [x] A co-owner IBAN that (mis)configuration has also listed as an own account IBAN resolves in favour of the **high-confidence own-account** path (real transfer wins over contribution guard), and this precedence is asserted in a test.
- [x] The "own IBAN" set and category-kind lookup are threaded in without breaking the existing signature contract used by callers; if new inputs are needed they are passed explicitly (accounts already flow in; add categories/own-IBAN set as needed) — no reach into `appDb`.
- [x] The exclusion is expressed via a shared predicate (reusing/adjacent to `isLikelyTransfer` and CAT-02's neutral check) rather than a bespoke inline condition, so matching and stats agree on what "external contribution" means.
- [x] A genuine own-account transfer into a joint account (counterparty IBAN = my own account) is **still** linked (high-confidence path unaffected).
- [x] `autoLinkMediumConfidence` semantics are otherwise unchanged for non-joint / non-neutral transactions.
- [x] No Dexie change; no stored data mutated by the matcher beyond the existing linking behaviour (which still goes through the transfers store/repository).
- [x] Unit tests cover: a co-owner `+500` into a joint account (counterparty = a registered co-owner IBAN) + an unrelated own `−500` are **not** auto-linked (previously would be); the same for an inflow from an unregistered non-own IBAN; a `neutral`-tagged inflow is excluded from all matches; a real own-checking→own-joint transfer with matching IBAN **is** still linked (high confidence); two genuine own non-joint accounts still medium-match as before (regression).
- [ ] Verified live in the browser: importing a partner deposit into a joint account leaves it unlinked and taggable as "Partner contribution"; it does not silently consume an unrelated same-amount transaction; a real inter-account transfer still auto-links.

## Notes

- Order of operations matters: this guard should hold **before** a `neutral` tag exists (a fresh import hasn't been categorised yet), which is why the joint + non-own-IBAN heuristic is needed in addition to the `neutral`-kind exclusion. Both conditions are ORed.
- Ties into [CAT-02](./TICKET-CAT-02-neutral-category-kind.md) (the `neutral` kind) and [STAT-03](./TICKET-STAT-03-contribution-net-worth.md) (which relies on partner inflows staying unlinked so they count as 0 to my stake rather than netting a transfer). Share the "is this an external contribution" predicate across all three.
- Keep the high-confidence IBAN path deliberately untouched: the whole point is that a *real* own-account transfer is still recognised; only amount-only guesses are suppressed for suspected partner inflows.
