# TICKET-NG-07 — Extract `createConfirmState<T>()` for the delete-confirm scaffolding

- **Area:** Angular patterns (overview pages)
- **Type:** Refactor
- **Traceability:** CR2-6.3 (carried over, still open); re-confirmed by CR3-2.5
- **Fallow evidence (2026-07-14):** `dup:edd1ec44` — accounts-overview vs. categories-overview, 12 identical lines

## User story

As a developer, I want the "which entity is pending deletion + confirm-dialog open state" scaffolding as a reusable helper, so each overview page declares its delete-confirm flow in one line instead of re-implementing the same signal pair and handlers.

## Description

`accounts-overview` and `categories-overview` carry byte-identical blocks: a `signal<T | null>` for the entity pending deletion, a derived open flag, and request/confirm/cancel handlers. A small `createConfirmState<T>()` factory (shared/ui or shared/utils, alongside the existing signal helpers) absorbs the pattern for both pages and any future overview.

## Current situation (as-is)

- [accounts-overview.component.ts:71-82](../../../src/app/feature-accounts/components/accounts-overview/accounts-overview.component.ts) and [categories-overview.component.ts:71-82](../../../src/app/feature-categories/components/categories-overview/categories-overview.component.ts) — the duplicated confirm-state block, fingerprinted by fallow.

## Desired result (to-be)

- `createConfirmState<T>()` returning `{ pending: Signal<T | null>, open: Signal<boolean>, request(entity): void, confirm(): T | null, cancel(): void }` (shape per implementer — the point is one definition).
- Both overview components consume it; the duplicated blocks are deleted.

## Acceptance criteria

- [ ] Delete flows on both overview pages behave unchanged (open dialog, confirm deletes via the store, cancel leaves data intact) — verified live in the browser.
- [ ] `dup:edd1ec44` no longer appears in `fallow dupes`.
- [ ] The factory has its own spec (request → open, confirm → returns entity and closes, cancel → closes without returning).
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Natural to land together with TICKET-NG-06 (both touch the confirm-dialog seam), but not a dependency.
- If TICKET-SOLID-01's transactions-overview split (open, coding-review-2) introduces a selection/confirm model, align the shapes rather than shipping two competing helpers.
