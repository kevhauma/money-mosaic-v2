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
npm run server:install    # the backend has its own dependencies (native better-sqlite3)
npm run dev               # ng serve on :4210 + the API server on :4300
```

Open `http://localhost:4210/` and sign in as **`admin` / `admin`** — that account is seeded on first boot. The app rebuilds and reloads automatically as you edit source files, and the dev server proxies `/api` to the backend (`proxy.conf.json`), so the browser sees one origin and there is no CORS setup.

Nothing works without the backend running: since v3 every read and write goes to `/api`, so `ng serve` on its own gets you a screen saying which URL it could not reach.

In development mode, once you are signed in, if the account is empty (no accounts and no transactions) the app auto-seeds a small demo dataset — two accounts with sample transactions and a transfer pair — so the UI isn't empty on first run (`src/app/dev-seed/`). This never touches or overwrites real data; it only fires when the account is genuinely empty.

To start over with a clean database, stop the server and delete its SQLite file (`server/data/money-mosaic.sqlite` by default) — it is recreated, migrated and re-seeded on the next boot.

**To host it for your household rather than develop on it, see [Hosting it on your own machine](#hosting-it-on-your-own-machine) below** — one command, one port.

## Everyday commands

The two workspaces have separate `package.json` / `tsconfig.json` / ESLint / Vitest setups, so `ng lint` and `ng test` never read `server/`, and the server's own commands never read `src/`.

```bash
npm run dev                           # both: ng serve on :4210 + the API server on :4300
npm run start:local                   # production: build the app, then serve it with the API on one port
ng serve                              # the Angular app alone (:4200; :4210 via npm run dev / the launch config)
ng build --configuration development  # fast compile check — also catches worker-bundling issues
ng build                              # production build, output in dist/
ng test                               # unit tests (Vitest)
ng test --watch                       # unit tests in watch mode
ng lint                               # ESLint

npm run server                        # the API server alone
npm run server:install                # install server/node_modules
npm run server:migrate                # generate SQL from server/src/schema, then apply it
npm run test:server                   # backend tests (in-memory SQLite)
npm --prefix server run lint          # ESLint (server workspace)
npm --prefix server run typecheck     # tsc --noEmit (server workspace)
```

### Before calling any change done

Run all of:

```bash
ng lint
ng test
ng build --configuration development
```

...plus, whenever `server/` or `shared/` changed:

```bash
npm --prefix server run lint
npm --prefix server run typecheck
npm run test:server
```

...plus a live browser check for anything UI-visible. A change that touches both workspaces needs both sets run. Prettier (single quotes) runs automatically on staged `.ts`/`.html`/`.css` files via husky + lint-staged pre-commit — don't fight its formatting.

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
  dev-seed/               # dev-only sample-data seeding (its own lazy chunk; no production browser requests it)
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

## Hosting it on your own machine

One command builds the app and serves it, with the API, on a single port:

```bash
npm install
npm run server:install    # once per machine — the backend has its own dependencies
npm run start:local
```

It prints every URL it is reachable on:

```
Money Mosaic is serving on:
  http://localhost:4300
  http://192.168.1.20:4300
Database: /home/you/money-mosaic-vibe/server/data/money-mosaic.sqlite
```

Open the first from the machine you started it on, or the second from a phone or laptop on the same network — the server binds every interface, so both work. One process, one port, one database.

**Sign in as `admin` / `admin`.** That account is seeded the first time the server boots, and it is an administrator. **Change its password immediately** from **Settings → Account**; the app keeps reminding you until you do. Add an account per person from **User accounts** in the sidebar — each account's data is entirely separate, and no account can read another's rows.

### Changing the port

```bash
PORT=8080 npm run start:local          # macOS / Linux
$env:PORT=8080; npm run start:local    # Windows PowerShell
```

`DB_FILE` moves the database and `WEB_ROOT` moves the directory of built files, both resolving relative paths against `server/`.

### ⚠️ Do not expose this to the internet

This server is **deliberately unsecured**, because it was built to be reached across one household's network and nothing else:

- **Plain HTTP** — no TLS, so passwords and every figure in your accounts cross the network in the clear.
- **No CSRF protection** — any page open in the same browser can make authenticated requests to it.
- **No rate limiting** — a password can be guessed as fast as a script can type.
- **No session expiry** — a session cookie stays valid until you sign out.

So: **do not port-forward it, do not point a public DNS name at it, and do not give it a public IP.** If you need it from outside the house, put yourself on the network instead of putting the server on the internet — a VPN (Tailscale, WireGuard) does exactly that and changes nothing here.

### Where your data is — and how to back it up

Everything every account holds lives in **one SQLite file**:

```
server/data/money-mosaic.sqlite
```

It is created on first boot, gitignored, and it is **the only copy**. Losing it loses everything, so back it up.

**The whole installation, every account** — stop the server, then copy the file:

```bash
cp server/data/money-mosaic.sqlite ~/backups/money-mosaic-$(date +%F).sqlite
```

Stopping first matters: SQLite may keep a `-wal` and a `-shm` file beside the database, and a copy taken mid-write can be missing whatever is still in them. To copy it while it runs, use SQLite's own backup instead, which is safe on a live database:

```bash
sqlite3 server/data/money-mosaic.sqlite ".backup $HOME/backups/money-mosaic.sqlite"
```

On Windows PowerShell, the same two:

```powershell
Copy-Item server\data\money-mosaic.sqlite "$HOME\backups\money-mosaic-$(Get-Date -f yyyy-MM-dd).sqlite"
sqlite3 server\data\money-mosaic.sqlite ".backup $HOME\backups\money-mosaic.sqlite"
```

The destination directory has to exist first — neither `cp` nor SQLite's `.backup` creates one.

**To restore**, stop the server, put the file back at the same path, and start it again. Pending migrations are applied on boot, so a backup taken from an older version is brought up to date as it is restored.

**One account, from inside the app** — the **Data** page exports that account's accounts, transactions, categories, rules and settings as a single JSON file, and imports one back with a replace-or-merge choice. That is the per-person answer and needs no filesystem access; the file copy above is the whole-installation one. The trained auto-categoriser is not in the JSON — it is megabytes of weights that JSON cannot carry — but the transactions it learns from are, so retraining after a restore rebuilds it.

### What this deliberately is not

No Docker, no systemd unit, no HTTPS or reverse proxy, no automated backups, and nothing hosted or multi-tenant. Every one of those is a reasonable thing to add and none is needed to hand this to a household. [DEPLOYMENT.md](DEPLOYMENT.md) describes the **pre-v3 static deploy** and no longer works: a static `dist/` has no data to show now that every read goes to `/api`.

## Building the app alone

```bash
ng build
```

Compiles and optimizes the Angular app into `dist/money-mosaic-vibe/browser/`, which is what `npm run start:local` builds and the server then serves. On its own a static `dist/` has nothing to show — every read goes to `/api`.

## Additional resources

- [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli)
- [Drizzle ORM documentation](https://orm.drizzle.team/docs/overview)
- [Vitest documentation](https://vitest.dev/)
