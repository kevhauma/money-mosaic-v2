# MoneyMosaicVibe

A local-first personal finance app. Import bank CSV exports, categorize transactions with rules, link inter-account transfers, and view dashboard stats — **no backend, no server, no account**. All data lives in [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) (via [Dexie.js](https://dexie.org/)) inside your browser.

## Stack

- **Angular 21** — standalone components, Signals, zoneless-style `OnPush`
- **@ngrx/signals** — component/feature stores
- **Dexie 4** — IndexedDB wrapper (schema in `src/app/core/data-access/app-db.ts`)
- **Tailwind CSS 4 + daisyUI 5** — styling
- **ngx-echarts** — charts
- **PapaParse** — CSV parsing, run inside a Web Worker
- **Vitest** — unit tests

## Prerequisites

- Node.js — a version compatible with Angular CLI 21 (Node 20.19+ or 22.12+; check with `node -v`)
- npm 10.x (this repo pins `packageManager: npm@10.9.2`)

## Getting started

```bash
git clone <repo-url>
cd money-mosaic-vibe
npm install
npm start        # same as `ng serve`
```

Open `http://localhost:4200/`. The app rebuilds and reloads automatically as you edit source files.

In development mode, if IndexedDB is empty (no accounts and no transactions), the app auto-seeds a small demo dataset — two accounts with sample transactions and a transfer pair — so the UI isn't empty on first run (`src/app/dev-seed/`). This never touches or overwrites real data; it only fires when the local database is genuinely empty.

To start over with a clean database, clear IndexedDB for `localhost:4200` in your browser's DevTools (Application → IndexedDB) and reload — the seed will run again.

## Everyday commands

```bash
ng serve                              # dev server on :4200 (or `npm start`)
ng build --configuration development  # fast compile check — also catches worker-bundling issues
ng build                              # production build, output in dist/
ng test                               # unit tests (Vitest)
ng test --watch                       # unit tests in watch mode
ng lint                               # ESLint
```

### Before calling any change done

Run all of:

```bash
ng lint
ng test
ng build --configuration development
```

...plus a live browser check for anything UI-visible. Prettier (single quotes) runs automatically on staged files via husky + lint-staged pre-commit — don't fight its formatting.

## Project structure

```
src/app/
  core/                  # cross-cutting logic: no UI
    data-access/         #   Dexie schema + repositories (only place that touches appDb tables)
    import/               #   CSV parsing/mapping (PapaParse Web Worker)
    accounts/, categorisation/, stats/, transfers/
  feature-accounts/       # feature modules — one per screen/domain
  feature-categories/
  feature-dashboard/
  feature-import/
  feature-transactions/
  shared/                 # shared UI components, pipes, utils
  dev-seed/               # dev-only sample-data seeding (tree-shaken from prod builds)
```

Components and stores never touch `appDb` tables directly — always go through a repository in `core/data-access/`. Cross-feature imports go through each feature's `index.ts` barrel (`@/feature-x`), never deep paths.

## Where to look for more context

Rather than re-deriving these by exploring the code, read:

| Topic | Source |
|---|---|
| Coding conventions (naming, folders, styling, forms, testing) | `.claude/skills/coding-conventions/SKILL.md` |
| Dexie schema, entities, versioning rules, repositories | `.claude/skills/data-model/SKILL.md` |
| Feature/store/service map — what lives where | `.claude/skills/project-map/SKILL.md` |
| Functional requirements (FR-TXN-\*, FR-CAT-\*, FR-TRF-\*, ...) | `docs/v1.0_foundation/finance-app-spec.md`, `docs/v1.0_foundation/overview.md` |
| UI layout spec | `docs/v1.0_foundation/ui-layout-spec.md` |
| v2+ backlog | `docs/v2/requirements.md` |
| Angular / Tailwind 4 / daisyUI / Vitest guidance | skills in `.agents/skills/` (managed by `npx skills`, tracked in `skills-lock.json`) |

## Ticket system

Work is tracked as **tickets** per version, under `docs/<version>/`:

```
docs/v1.0_foundation/
  overview.md          # title + checkbox per ticket, grouped by section, plus the recommended build order
  tickets/
    TICKET-<PREFIX>-<NN>-<slug>.md   # e.g. TICKET-IMP-03-header-mismatch-error.md
```

Each ticket carries its own **User story**, **Description**, **Current situation (as-is)** (with clickable links into the real code), **Desired result (to-be)**, and checkbox **Acceptance criteria** — the ticket is the single source of truth, `overview.md` is only the index + build order. A ticket's line in `overview.md` is only checked off once every acceptance criterion on the ticket is `[x]`. The same layout exists per version (`v1.0_foundation`, `v1.1_joint_accounts`, `v1.2_auto_categorise`, `v2`, ...) — don't assume `v1` is the only one.

### Workflow: capture → build

1. **Capture new work** with the `story-ticket` skill (`.claude/skills/story-ticket/`): run `/story-ticket` when someone reports a bug, requests a feature, or asks for a refactor. It asks which version the work belongs to, resolves a consistent area prefix (e.g. `TXN`, `IMP`, `STAT`), writes the ticket file with its user story plus as-is/to-be/acceptance-criteria, and appends a title+checkbox line to that version's `overview.md`.
2. **Work an existing ticket** with the `work-ticket` skill (`.claude/skills/work-ticket/`): run `/work-ticket` (optionally naming a ticket ID like `TICKET-ACC-01`, or let it scan `overview.md` for open lines and ask). It reads the ticket, proposes an implementation plan mapped to the acceptance criteria and **pauses for approval** before touching code, implements against the repo's hard rules below, runs the `verifier` subagent (lint + test + dev build) plus a live browser check for UI criteria, ticks off each acceptance criterion only once verified, and finally checks off the ticket's line in `overview.md`. It does not commit — that's left for you to review.

The `spec-navigator` subagent answers FR-*/requirement questions from `docs/` while working a ticket, and `project-map` / `data-model` skills help locate the right code and repository/schema rules.

## Hard rules

- **Never raise `maximumWarning`/`maximumError` bundle budgets in `angular.json`.** Solve size problems with lazy-loading or dependency dieting instead.
- **Dexie schema changes are additive**: add a new `.version(n + 1).stores(...)` block (+ `.upgrade()` if data must transform). Never edit a shipped version block.
- Components/stores never touch `appDb` tables directly — always go through a repository in `core/data-access/`.
- Rules must never overwrite a category the user set manually (the `categoryManual` flag on `Transaction`).
- Cross-feature imports go through the feature's `index.ts` barrel (`@/feature-x`), never deep paths. One documented exception: `app.routes.ts` imports `feature-transactions/transactions.routes` directly to break a barrel cycle — that's intentional.

## Code scaffolding

```bash
ng generate component component-name
ng generate --help    # full list of schematics: components, directives, pipes, ...
```

## Testing

```bash
ng test                 # run once
ng test --watch         # watch mode
```

Unit tests use Vitest with jsdom. There is no e2e test suite configured.

## Building for production

```bash
ng build
```

Compiles and optimizes the app into `dist/`. Since this is a fully client-side app (IndexedDB, no backend), the `dist/` output can be deployed to any static host. This repo auto-deploys to a Caddy-served host via GitHub Actions on every push to `main` — see [DEPLOYMENT.md](DEPLOYMENT.md).

## Additional resources

- [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli)
- [Dexie.js documentation](https://dexie.org/docs/)
- [Vitest documentation](https://vitest.dev/)
