# MoneyMosaicVibe

![Fallow health](https://raw.githubusercontent.com/kevhauma/money-mosaic-v2/main/.github/badges/fallow-health.svg)

A self-hosted personal finance app. Import bank CSV exports, categorize transactions with rules (or a trained auto-categoriser), link inter-account transfers, track joint/shared accounts, and view dashboard insights. It is **two workspaces** — an Angular SPA in `src/` and its own Express + SQLite backend in `server/` — and every byte of your data lives in one SQLite file on the server you run, scoped to the account you sign in as. Nothing is sent anywhere else, and it is meant for your own machine or home network rather than the public internet.

## Stack

- **Angular 21** — standalone components, Signals, zoneless-style `OnPush`
- **@ngrx/signals** — component/feature stores
- **@angular/cdk** — drag-drop (used for the dashboard's customizable row order)
- **Express 5 + SQLite (better-sqlite3) + Drizzle ORM** — the `server/` workspace; schema in `server/src/schema/`, migrations in `server/drizzle/`
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

In development mode, once you are signed in, if the account is empty (no accounts and no transactions) the app auto-seeds a small demo dataset — two accounts with sample transactions and a transfer pair — so the UI isn't empty on first run (`src/app/dev-seed/`). This never touches or overwrites real data; it only fires when the account is genuinely empty.

To start over with a clean database, stop the server and delete its SQLite file (`server/data/money-mosaic.sqlite` by default) — it is recreated and migrated on the next boot, and the seed runs again.

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
    data-access/         #   one repository per entity over the /api routes (the only place that calls the server)
    import/               #   CSV parsing/mapping (PapaParse Web Worker)
    ml/                    #   auto-categoriser: feature hashing, training worker, rule-proposal mining
    accounts/, categorisation/, stats/, transactions/, transfers/
  feature-accounts/       # feature modules — one per screen/domain (routed via app.routes.ts)
  feature-categories/      #   also owns the trained category-model store/service
  feature-dashboard/
  feature-import/
  feature-learning/        # /learning — auto-categoriser review UI (model status, suggestions, rule proposals)
  feature-transactions/
  shared/                 # shared UI components, pipes, utils
    ui/                    #   mm-prefixed daisyUI wrapper primitives
    echarts/               #   ECharts module registration + tooltip formatting
  dev-seed/               # dev-only sample-data seeding (tree-shaken from prod builds)
```

Components and stores never call the API directly — always go through a repository in `core/data-access/`. Cross-feature imports go through each feature's `index.ts` barrel (`@/feature-x`), never deep paths.

## Where to look for more context

Rather than re-deriving these by exploring the code, read:

| Topic | Source |
|---|---|
| Coding conventions (naming, folders, styling, forms, testing) | `.claude/skills/coding-conventions/SKILL.md` |
| Data model: entities, the Drizzle schema, migrations, the repository layer | `.claude/skills/data-model/SKILL.md` |
| Running the server, backing it up, and the endpoint list | `server/README.md` |
| Feature/store/service map — what lives where | `.claude/skills/project-map/SKILL.md` |
| Functional requirements (FR-TXN-\*, FR-CAT-\*, FR-TRF-\*, ...) | `docs/reference/finance-app-spec.md`, `docs/releases/v1.0_foundation/overview.md` |
| UI layout spec | `docs/reference/ui-layout-spec.md` |
| Every ticket, by feature area (dashboard, transactions, accounts, import, income, loans, ...) | `docs/<area>/overview.md` + `docs/<area>/tickets/` — see [Ticket system](#ticket-system) below |
| What a given release shipped, in build order, with its scope decisions | `docs/releases/<version>/overview.md` |
| Angular / Tailwind 4 / daisyUI / Vitest guidance | skills in `.agents/skills/` (managed by `npx skills`, tracked in `skills-lock.json`) |

## Ticket system

Work is tracked as **tickets**, organised **by feature area** under `docs/<area>/`:

```
docs/dashboard/
  overview.md          # title + checkbox per ticket, with its status and the release that shipped it
  tickets/
    TICKET-<PREFIX>-<NN>-<slug>.md   # e.g. TICKET-IMP-03-header-mismatch-error.md
```

A ticket's ID prefix maps to exactly one area folder (`IMP` → `docs/import/`, `STAT` → `docs/dashboard/`), so the ID tells you where the file lives. `<NN>` is unique per prefix across the whole project.

Each ticket carries its own **User story**, **Description**, **Current situation (as-is)** (with clickable links into the real code), **Desired result (to-be)**, and checkbox **Acceptance criteria** — the ticket is the single source of truth, `overview.md` is only the index. A ticket's line is only checked off once every acceptance criterion on the ticket is `[x]`.

Alongside the areas, `docs/releases/<version>/` keeps the **historical record** of what each release shipped, in build order, with its scope decisions and won't-do rationale; every ticket links back to its release through its `- **Released in:**` line. `docs/reference/` holds the living cross-cutting specs. See [docs/README.md](docs/README.md) for the full layout.

### Workflow: capture → build

1. **Capture new work** with the `story-ticket` skill (`.claude/skills/story-ticket/`): run `/story-ticket` when someone reports a bug, requests a feature, or asks for a refactor. It resolves the feature area (and with it the prefix, e.g. `TXN`, `IMP`, `STAT`), writes the ticket file with its user story plus as-is/to-be/acceptance-criteria, and appends a title+checkbox line to that area's `overview.md`.
2. **Work an existing ticket** with the `work-ticket` skill (`.claude/skills/work-ticket/`): run `/work-ticket` (optionally naming a ticket ID like `TICKET-ACC-01`, or let it scan the area overviews for open lines and ask). It reads the ticket, proposes an implementation plan mapped to the acceptance criteria and **pauses for approval** before touching code, implements against the repo's hard rules below, runs the `verifier` subagent (lint + test + dev build) plus a live browser check for UI criteria, ticks off each acceptance criterion only once verified, and finally checks off the ticket's line in `overview.md`. It does not commit — that's left for you to review.

The `spec-navigator` subagent answers FR-*/requirement questions from `docs/` while working a ticket, and `project-map` / `data-model` skills help locate the right code and repository/schema rules.

## Hard rules

- **Never raise `maximumWarning`/`maximumError` bundle budgets in `angular.json`.** Solve size problems with lazy-loading or dependency dieting instead.
- **Schema changes go through Drizzle migrations**: edit `server/src/schema/`, then `npm run server:migrate`. Never edit a shipped migration — add another one.
- Components/stores never call the API directly — always go through a repository in `core/data-access/`.
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

Compiles and optimizes the Angular app into `dist/`. **The v3 backend changed what a deployment is** — a static `dist/` on its own no longer has any data to show, since every read goes to `/api`. Hosting instructions (running the server, where the SQLite file lives, how to back it up) are TICKET-SRV-09's to write; [DEPLOYMENT.md](DEPLOYMENT.md) still describes the pre-v3 static deploy and is stale until then.

## Additional resources

- [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli)
- [Drizzle ORM documentation](https://orm.drizzle.team/docs/overview)
- [Vitest documentation](https://vitest.dev/)
