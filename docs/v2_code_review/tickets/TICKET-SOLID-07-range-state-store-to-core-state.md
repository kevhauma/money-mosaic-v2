# TICKET-SOLID-07 — Move `range-state.store.ts` to `core/state/` under the widened placement rule

- **Area:** Architecture
- **Type:** Refactor
- **Traceability:** CR4-10 Option A ([solution doc](../solutions/CR4-10-store-placement-rule.md))

## User story

As a developer looking for shared state, I want every app-wide store in `core/state/` under one lookup rule — "any store consumed across features lives in `core/state/`" — so placement is a lookup, not a judgment call, before PRIV-01 adds the next cross-cutting store.

## Description

Executes the decided rule widening: `core/state/` holds *all* app-wide stores (entity or not). `AppSettingsStore` is then already correctly placed; the one move is `range-state.store.ts` from `core/stats/` to `core/state/`.

## Current situation (as-is)

- The written rule is binary (cross-feature entity stores → `core/state/`; single-feature stores → feature folder), and two real stores fall outside it: [range-state.store.ts](../../../src/app/core/stats/range-state.store.ts) lives in `core/stats/`, and `AppSettingsStore` is a settings singleton, not an entity store.

## Desired result (to-be)

- `range-state.store.ts` (+ its spec) lives in `core/state/`; all consumer imports updated (`core → core` move, no barrel-cycle risk).
- The widened rule sentence lands in the conventions skill via TICKET-DX-05; the complete store registry lands in the project-map skill via TICKET-DX-04.

## Acceptance criteria

- [ ] `range-state.store.ts` and `range-state.store.spec.ts` moved; no import path references `core/stats/range-state` anywhere (grep clean).
- [ ] No behavior change; existing range-state specs pass unmodified apart from their own path.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Mostly-mechanical; land in a quiet window like TICKET-SOLID-05 did. Option B (domain placement) rejected — judgment rules are what fail at 2 a.m.
- The store stays stats-flavored (it parameterizes `core/stats` functions); that separation is aesthetic only — imports don't care.
