# TICKET-PERF-01 — echarts is eagerly bundled into the initial chunk, breaking the production budget

- **Area:** Build/bundling
- **Type:** Bug fix
- **Traceability:** violates the hard rule in [../../../CLAUDE.md](../../../CLAUDE.md) ("Never raise `maximumWarning`/`maximumError` bundle budgets") and the v1.2 Definition of Done's bundle-budget gate

## User story

As a developer, I want `ng build --configuration production` to respect the initial-bundle budget, so a production build fails loudly on a real size regression instead of already failing before any change is made.

## Description

`ng build --configuration production` currently fails the bundle budget check (500 kB warn / 1 MB error, initial bundle) on a clean checkout of `main`, independent of any other change. The initial bundle measures **1.54 MB**, ~1.04 MB over the warning threshold and ~537 kB over the hard error. The `echarts` charting library — meant to be lazy-loaded per-route — is statically reachable from the app root and lands in the initial chunk instead of a lazy one.

## Current situation (as-is)

- [app.ts:19](../../../src/app/app.ts) — the root component eagerly imports `AccountsStore` from the feature barrel: `import { AccountsStore } from '@/feature-accounts';`. `app.ts` is bootstrapped directly from `main.ts`, so everything reachable through this import is in the initial bundle.
- [feature-accounts/index.ts](../../../src/app/feature-accounts/index.ts) re-exports everything from `./components` (line 3), and [feature-accounts/components/index.ts](../../../src/app/feature-accounts/components/index.ts) includes `account-balance-chart.component.ts` and `net-worth-history-chart.component.ts` — both of which statically import `echarts/core`, `ngx-echarts`, and chart/component/renderer modules from `echarts`.
- Because Angular's `@Component` decorator has side effects, esbuild cannot tree-shake an unused barrel re-export once *anything* from that barrel is imported eagerly — so importing only `AccountsStore` still pulls in the two chart components (and echarts with them). `app.ts` **already documents this exact pattern** for a different import: lines 21–24 explain why `RangeGroupingSwitcherComponent` is imported directly from its component file rather than through the `@/shared/ui` barrel, for precisely this reason. That same care was not applied to the `@/feature-accounts` import.
- `feature-accounts/accounts.routes.ts` and `feature-dashboard/dashboard.routes.ts` both wire `provideEchartsCore({ echarts })` correctly at the lazy-route level, and `app.routes.ts` lazy-loads both features via `loadChildren: () => import(...)`. The routing-level lazy-loading is correctly set up — the leak happens entirely through the unrelated `app.ts` → `@/feature-accounts` barrel import.
- Confirmed root cause is unrelated to any single feature's code: reproduced on a clean `main` with zero other changes applied (verified while working [TICKET-ML-05](./TICKET-ML-05-training-worker.md), by stashing an unrelated diff and rebuilding).

## Desired result (to-be)

- `app.ts` imports `AccountsStore` directly from its store file (e.g. `@/feature-accounts/accounts.store`, or another path that does not traverse `./components`), mirroring the existing `RangeGroupingSwitcherComponent` direct-import precedent already documented in the same file.
- `ng build --configuration production` passes with the initial bundle back under the 500 kB warning threshold, and `echarts` (and its chart/component/renderer submodules) appear only in the Dashboard/Accounts lazy chunks, never the initial chunk.
- No change to `angular.json`'s budgets — the fix is purely about restoring correct lazy-loading, per this project's hard rule.

## Acceptance criteria

- [ ] `ng build --configuration production` completes without a budget warning or error.
- [ ] The production chunk table shows `echarts` only inside lazy/route chunks (Dashboard, Accounts), never in `main`/initial chunks.
- [ ] `app.ts`'s import of `AccountsStore` no longer traverses `@/feature-accounts`'s `./components` barrel path.
- [ ] `ng lint` and `ng test` continue to pass unchanged.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Discovered while working [TICKET-ML-05](./TICKET-ML-05-training-worker.md) (the auto-categorisation training worker); it is unrelated to tfjs or auto-categorisation — tfjs was independently confirmed to isolate correctly into its own worker chunk.
- Watch for the same barrel-eagerness pattern recurring elsewhere: any future eager import through `@/feature-accounts` (or any feature barrel whose `components` re-export includes a chart/heavy-dependency component) will reintroduce this regression. A longer-term option worth considering separately: split `feature-accounts/index.ts` so `accounts.store` is importable without also pulling in `./components`.
