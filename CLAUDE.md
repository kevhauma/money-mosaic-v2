# MoneyMosaicVibe

Local-first personal finance app: import bank CSV exports, categorize transactions with rules (and a trained auto-categoriser), link inter-account transfers, track joint/shared accounts, and view dashboard insights. **No backend** — all data lives in IndexedDB (Dexie.js) in the browser.

Stack: Angular 21 (standalone, signals, zoneless-style OnPush), @ngrx/signals, @angular/cdk (drag-drop), Dexie 4, Tailwind CSS 4 + daisyUI 5, ngx-echarts, PapaParse (in a Web Worker), Vitest.

## Commands

```bash
ng serve                              # dev server (preview launch config "dev" uses port 4210)
ng build --configuration development  # fast compile check (also catches worker-bundling issues)
ng test                               # Vitest unit tests
ng lint                               # ESLint
```

Verification before declaring any change done: `ng lint` + `ng test` + `ng build --configuration development`, plus the `Fallow` skill (code-quality check — say so and skip if unavailable in the session, don't skip it silently), plus a live browser check for UI-visible changes.

## Where knowledge lives (read these instead of re-exploring)

| Topic | Source |
|---|---|
| Coding conventions (naming, folders, styling, forms, testing) | `.claude/skills/coding-conventions/SKILL.md` |
| Dexie schema, entities, versioning rules, repositories | `.claude/skills/data-model/SKILL.md` |
| Feature/store/service map — what lives where | `.claude/skills/project-map/SKILL.md` |
| Functional requirements (FR-TXN-*, FR-CAT-*, FR-TRF-*, ...) | `docs/v1.0_foundation/finance-app-spec.md`, `docs/v1.0_foundation/overview.md` |
| UI layout spec | `docs/v1.0_foundation/ui-layout-spec.md` |
| Requirements for every other shipped/backlog version (joint accounts, auto-categorise, dashboard insights, income, loans, data management, v2+, ...) | `docs/<version>/overview.md` — don't hardcode a version list here, ask the `spec-navigator` subagent or list `docs/` |
| Angular / Tailwind 4 / daisyUI / Vitest guidance | installed skills in `.agents/skills/` (managed by `npx skills`, tracked in `skills-lock.json`) |
| `docs/` folder naming scheme (feature milestone vs. review, grandfathered exceptions) | `docs/README.md` |

Subagents in `.claude/agents/`: `conventions-reviewer` (diff review against project rules), `verifier` (lint/test/build runner), `spec-navigator` (answers requirement/spec questions from `docs/`).

## Hard rules

- **Never raise `maximumWarning`/`maximumError` bundle budgets in `angular.json`.** Solve size problems with lazy-loading or dependency dieting instead.
- **Dexie schema changes are additive**: new `.version(n + 1).stores(...)` (+ `.upgrade()` if data must transform). Never edit a shipped version block.
- Components/stores never touch `appDb` tables directly — always go through a repository in `core/data-access/`.
- Rules must never overwrite a category the user set manually (`categoryManual` flag on `Transaction`).
- Cross-feature imports go through the feature's `index.ts` barrel (`@/feature-x`), never deep paths. Exception already in place: `app.routes.ts` imports `feature-transactions/transactions.routes` directly to break a barrel cycle — don't "fix" it back.
- Prettier (single quotes) runs via husky/lint-staged pre-commit; don't fight it.


## Verifying

**In browser verification** always ask the user whether to verify in browser. if decline, continue on the task. if something is not working in browser, they will come back to correct it.