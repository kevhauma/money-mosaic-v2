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
| Functional requirements (FR-TXN-*, FR-CAT-*, FR-TRF-*, ...) | `docs/reference/finance-app-spec.md`, `docs/releases/v1.0_foundation/overview.md` |
| UI layout spec | `docs/reference/ui-layout-spec.md` |
| Every ticket, by feature area (dashboard, transactions, accounts, import, income, loans, ...) | `docs/<area>/overview.md` + `docs/<area>/tickets/` — don't hardcode an area list here, list `docs/` or ask the `spec-navigator` subagent |
| What a given release shipped, in build order, with its scope decisions | `docs/releases/<version>/overview.md` — each ticket links back to its release via its **Released in** line |
| Angular / Tailwind 4 / daisyUI / Vitest guidance | installed skills in `.agents/skills/` (managed by `npx skills`, tracked in `skills-lock.json`) |
| `docs/` layout (area folders vs. `releases/` vs. `reference/`, ticket ID scheme) | `docs/README.md` |

Subagents in `.claude/agents/`: `conventions-reviewer` (diff review against project rules), `verifier` (lint/test/build runner), `spec-navigator` (answers requirement/spec questions from `docs/`).

## Hard rules

- **Never raise `maximumWarning`/`maximumError` bundle budgets in `angular.json`.** Solve size problems with lazy-loading or dependency dieting instead.
- **Dexie schema changes are additive**: new `.version(n + 1).stores(...)` (+ `.upgrade()` if data must transform). Never edit a shipped version block.
- Components/stores never touch `appDb` tables directly — always go through a repository in `core/data-access/`.
- Rules must never overwrite a category the user set manually (`categoryManual` flag on `Transaction`).
- Cross-feature imports go through the feature's `index.ts` barrel (`@/feature-x`), never deep paths. Exception already in place: `app.routes.ts` imports `feature-transactions/transactions.routes` directly to break a barrel cycle — don't "fix" it back.
- Prettier (single quotes) runs via husky/lint-staged pre-commit; don't fight it.
- **Never mention Claude, Anthropic, or any AI assistant in git history.** No `Co-Authored-By: Claude ...` trailer, no "Generated with Claude Code", no 🤖 — not in commit messages, branch names, tags, or PR bodies. Referring to the `CLAUDE.md` file by name is fine.


## Verifying

**In browser verification** always ask the user whether to verify in browser. if decline, continue on the task. if something is not working in browser, they will come back to correct it.