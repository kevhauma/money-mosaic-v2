# TICKET-ACC-02 — Ownership/contribution share on joint accounts

- **Area:** Accounts
- **Type:** Feature
- **Traceability:** extends FR-ACC-1; consumed by [STAT-03](./TICKET-STAT-03-contribution-net-worth.md)
- **Source story:** user-stories.md §1 — *"As someone with a shared account, I want to set my ownership/contribution share on a joint account, so the app has the input it needs to count only my part of the shared money."*

## Description

Give each account an optional `ownershipShare` (0–1, default = whole). It is only meaningful for **joint** accounts and represents *my* share of joint spending (and of the pre-existing opening balance). This ticket adds the field and its form control **only** — it deliberately does not change any number on screen yet. The net-worth and stats consumption lives in [STAT-03](./TICKET-STAT-03-contribution-net-worth.md), which reads this field.

## Current situation (as-is)

- `Account` in [app-db.ts](../../../src/app/core/data-access/app-db.ts) has `type: 'checking' | 'savings' | 'joint' | 'invest'` but no ownership concept — a `joint` account is just a label with no numeric effect anywhere.
- The account create/edit form ([account-form.component.ts](../../../src/app/feature-accounts/components/account-form/account-form.component.ts) + its template) builds a fixed `nonNullable` group (`name`, `type`, `iban`, `openingBalance`, `openingBalanceDate`, `color`, `icon`) and emits `AccountFormValue = Omit<Account, 'id' | 'archived'>`. There is no share control.
- Persistence goes through [accounts.store.ts](../../../src/app/feature-accounts/accounts.store.ts) (`addAccount` / `updateAccount` → `AccountsRepository`), which spreads the whole `Account` — so a new optional field flows through without store changes.
- Current shipped Dexie schema is **version 5** in [app-db.ts](../../../src/app/core/data-access/app-db.ts) (the `data-model` skill doc still says "version 3" — stale).

## Desired result (to-be)

- `Account` gains `ownershipShare?: number` — a fraction in `[0, 1]`. `undefined` means "whole account is mine" (i.e. behaves exactly as today) so **no migration and no backfill are needed**; every existing account and every non-joint account reads as `1`.
- The account form shows a **share input** (percentage, e.g. `50` → stored `0.5`) that is **only visible/relevant when `type === 'joint'`**. For non-joint types the control is hidden and the value left `undefined`.
- A one-line helper text under the control explains what it drives, and warns that changing it later re-computes historical net worth (no date-effective history — see Notes).
- No visible number changes yet: balances, net worth, and stats are untouched until STAT-03 lands.

## Acceptance criteria

- [ ] `Account.ownershipShare?: number` is added to [app-db.ts](../../../src/app/core/data-access/app-db.ts) with a doc comment stating the `[0,1]` range, the "undefined ⇒ 1 (whole)" convention, and that it only applies to `joint` accounts.
- [ ] **No Dexie version bump** is introduced for this field (it is non-indexed and optional); a version block is added only if STAT-03 or CAT-02 needs one, and if so it stays additive (next is version 6). The field is confirmed to round-trip through IndexedDB without a schema change.
- [ ] The account form exposes the share as a percentage input, shown **only** when the selected type is `joint`, defaulting to whole (blank/undefined) on create and pre-filled from `ownershipShare` on edit; switching type away from `joint` clears it back to `undefined`.
- [ ] The percentage↔fraction conversion is centralised (one helper), validated to `0 ≤ share ≤ 1` (i.e. `0–100%`), and an out-of-range or non-numeric entry blocks submit with an inline error, consistent with the existing `openingBalance`/`iban` validation style.
- [ ] Saving is done via `AccountsStore.addAccount` / `updateAccount` (repository-backed), never a direct `appDb.accounts` write; the emitted `AccountFormValue` carries `ownershipShare`.
- [ ] Editing an existing joint account's share persists and reloads correctly; a checking/savings/invest account never stores a share.
- [ ] Unit tests cover: form maps `50%` ⇄ `0.5` both directions; validation rejects `-1`, `150`, and non-numeric; the control is present only for `joint`; switching type to non-joint nulls the value; round-trip add→hydrate preserves the share.
- [ ] Verified live in the browser: creating/editing a joint account shows the share control, saving persists it, and reopening shows the saved percentage; no balance or net-worth figure changes as a result of this ticket alone.

## Notes

- **Scope guard:** field + form only. If reviewers want the number to *do* something, that is STAT-03 — keep this ticket inert so it can merge independently.
- **Relationship to [ACC-03](./TICKET-ACC-03-multi-owner-coowner-ibans.md):** `ownershipShare` here is only *my* share of joint spending — it does **not** need to be `1 − (others' shares)`, because the app tracks only my stake. Who the *other* owners are and how to recognise their money is ACC-03's co-owner registry. The joint section of the account form is shared real estate: build the share control (this ticket) and the co-owner sub-form (ACC-03) to coexist under `type === 'joint'`.
- `ownershipShare` is a single scalar, so changing it rewrites the entire historical net-worth trend retroactively. Date-effective shares are the correct long-term fix but are out of scope for v1.5 — record the limitation in the helper text and in STAT-03.
- Consider seeding a sensible default of `0.5` in the form *placeholder* for joint accounts, but store `undefined` until the user commits a value, so the "undefined ⇒ 1" convention stays unambiguous for accounts created before this ticket.
