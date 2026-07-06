# TICKET-ACC-03 — Multi-owner joint accounts with per-contributor IBANs

- **Area:** Accounts
- **Type:** Feature
- **Traceability:** extends FR-ACC-1 / FR-ACC-4; feeds [CAT-02](./TICKET-CAT-02-neutral-category-kind.md), [TRF-03](./TICKET-TRF-03-guard-partner-inflow-matching.md), [STAT-03](./TICKET-STAT-03-contribution-net-worth.md)
- **Source story:** user-stories.md §1 — *"As someone sharing an account with one or more other people, I want to register each co-owner and the IBAN(s) they pay in from, so the app can tell each person's contributions apart from mine and from external money."*

## Description

A joint account can be shared with **more than one** other person. Let the user register a list of **co-owners**, each with a name and one or more **IBANs** they pay in from (and, optionally, that person's share). This is the identity layer the rest of v1.5 keys off: an inflow whose counterparty IBAN belongs to a registered co-owner is *their* contribution (0% to my net-worth stake, tagged `neutral`), an inflow from one of my own accounts is *mine* (100%), and everything else is external/unknown. Without this registry the app can only guess "not my own IBAN" — this makes co-owner money positively identifiable and attributable per person.

## Current situation (as-is)

- `Account` in [app-db.ts](../../../src/app/core/data-access/app-db.ts) has a single optional `iban?: string` (the account's *own* number) and no notion of who else is on the account. A `joint` account is indistinguishable from a solo one beyond the `type` label.
- [ACC-02](./TICKET-ACC-02-joint-ownership-share.md) adds a single scalar `ownershipShare` (my share) but nothing about the *other* owners — so a partner's inflow can't be told apart from my own income into the pot except by the STAT-03 "positive non-transfer ⇒ mine" heuristic, which mis-attributes a partner's deposit that hasn't been hand-tagged.
- Transfer detection already matches on `counterpartyIban` against **own** account IBANs ([transfer-matching.ts](../../../src/app/core/transfers/transfer-matching.ts) `isLikelyTransfer`, `ibanConfirms`), and rules already match on `counterpartyIban` ([rule-matching.ts](../../../src/app/core/categorisation/rule-matching.ts)) — but there is no per-account set of *co-owner* IBANs for either to consult.
- The account form ([account-form.component.ts](../../../src/app/feature-accounts/components/account-form/account-form.component.ts)) is a fixed flat group with a single `iban` control and no repeatable sub-form.

## Desired result (to-be)

- `Account` gains an optional `coOwners?: JointOwner[]`, where each `JointOwner` carries `{ name: string; ibans: string[]; share?: number }`. Only meaningful for `joint` accounts; `undefined`/empty means "no co-owners registered" (behaves as today). Optional, non-indexed ⇒ **no migration needed**.
- The account form, when `type === 'joint'`, shows a **repeatable co-owner section**: add/remove any number of co-owners, each with a name, one or more IBANs, and an optional share. Each IBAN is validated with the existing `ibanValidator`.
- A single derived helper exposes, per joint account, the flat set of co-owner IBANs and a reverse map `iban → co-owner`, so CAT-02 (tag + attribute contributions), TRF-03 (exclude from amount-only matching), and STAT-03 (classify inflows) all resolve a counterparty IBAN to a specific co-owner the same way.
- No number on screen changes from this ticket alone — it is the data + form; the consumers (CAT-02/TRF-03/STAT-03) light it up.

## Acceptance criteria

- [ ] `JointOwner` type (`{ name: string; ibans: string[]; share?: number }`) and `Account.coOwners?: JointOwner[]` are added to [app-db.ts](../../../src/app/core/data-access/app-db.ts) with a doc comment: co-owners only apply to `joint` accounts; each `ibans` entry is a counterparty account the person pays in from; `share` is optional `[0,1]` metadata (not required for net worth, which only needs *my* `ownershipShare`).
- [ ] **No Dexie version bump** for this field (optional, non-indexed); it is confirmed to round-trip through IndexedDB unchanged. If STAT-03/CAT-02 already introduce `.version(6)`, this field still needs no upgrade block (nothing to backfill).
- [ ] The account form renders a **repeatable** co-owner sub-form **only** for `type === 'joint'`, supporting **≥ 2 co-owners** and **≥ 2 IBANs per co-owner**, with add/remove for both levels; switching type away from `joint` clears `coOwners`.
- [ ] Each co-owner IBAN uses the shared `ibanValidator`; a co-owner with a blank name or zero valid IBANs blocks submit with an inline error; duplicate IBANs (across co-owners or equal to the account's own `iban`) are rejected with a clear message, since a duplicate would make attribution ambiguous.
- [ ] A shared, tested helper resolves a `counterpartyIban` to its `JointOwner` for a given account (and exposes the flat co-owner-IBAN set), living where CAT-02/TRF-03/STAT-03 can all import it — no three parallel copies of the lookup.
- [ ] Saving goes through `AccountsStore.addAccount` / `updateAccount` (repository-backed), never a direct `appDb.accounts` write; `coOwners` round-trips on add→hydrate and on edit.
- [ ] A non-joint account never stores `coOwners`; an existing joint account with no co-owners is valid and behaves exactly as before.
- [ ] Unit tests cover: add/remove multiple co-owners and multiple IBANs; per-IBAN validation and duplicate-IBAN rejection (including collision with own `iban`); `iban → co-owner` resolution returns the right person and `undefined` for an unknown IBAN; switching type to non-joint clears co-owners; round-trip persistence.
- [ ] Verified live in the browser: a joint account can be created with two co-owners each having a distinct IBAN, saved, reopened with both intact; adding/removing rows works; invalid/duplicate IBANs are blocked.

## Notes

- **Why not derive co-owners from imported transactions?** Counterparty names/IBANs on statements are noisy and one-off payees would pollute the list. An explicit, user-curated registry is the reliable identity source; auto-suggesting from frequent counterparties is a possible later nicety, not this ticket.
- **Per-person `share` is optional metadata**, not load-bearing for net worth: the app only tracks *my* stake, which needs only my `ownershipShare` (ACC-02). Others' shares are for the optional per-contributor breakdown (see STAT-03) and future spend-splitting — validate `0–1` if entered but don't require the set to sum to 1 (the user may not know everyone's share, and it isn't needed).
- **Relationship to ACC-02:** ACC-02 = my share of spending; ACC-03 = who else is on the account and how to recognise their money. They are separate concerns and can merge in either order, but STAT-03 wants both.
- A person may pay in from several accounts over time (old + new bank), hence `ibans` is a list per co-owner, not a single value.
- Privacy: co-owner IBANs are personal data but stay in local IndexedDB like everything else (NFR-PRIV-1) — no new network surface.
