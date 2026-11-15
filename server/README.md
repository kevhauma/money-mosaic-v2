# Money Mosaic server

The local-hosting backend: Express + SQLite (`better-sqlite3`) + Drizzle ORM. It is a **separate
workspace** from the Angular app — its own `package.json`, `tsconfig.json`, ESLint config and
Vitest setup — so an Angular build never compiles server code and `ng lint`/`ng test` never read
it.

## Install

```bash
npm run server:install       # from the repo root — installs server/node_modules
```

`better-sqlite3` is a native module, so this step downloads a prebuilt binary (or compiles one) the
first time on a given machine.

## Run

```bash
npm run dev                  # repo root: ng serve on 4210 + this server on 4300
npm run start:local          # repo root: build the app, then serve it with /api on one port
npm run server               # this server alone
npm run server:migrate       # generate SQL from src/schema, then apply it
npm run test:server          # backend tests (in-memory SQLite)
```

| Env var   | Default                       | Meaning                                              |
| --------- | ----------------------------- | ---------------------------------------------------- |
| `PORT`    | `4300`                        | HTTP port. 4300 stays clear of 4210/4200.            |
| `DB_FILE` | `server/data/money-mosaic.sqlite` | SQLite file; relative paths resolve against `server/`. |
| `WEB_ROOT`| `../dist/money-mosaic-vibe/browser` | The built app to serve (the repo-root `dist/`); relative paths resolve against `server/`. |
| `STAGED_IMPORT_DIR` | `server/data/staged-imports` | Scratch space for a database import's bytes before they are applied (TICKET-SRV-11); relative paths resolve against `server/`. Nothing here is worth backing up — a file lives for the seconds between the two requests of one import, and anything left over is swept after an hour. |
| `NODE_ENV`| unset (dev)                   | `production` turns the request logger off **and serves the built app** (TICKET-SRV-09). |

## Serving the app too (TICKET-SRV-09)

In production the server also serves the Angular build from `WEB_ROOT`, on the same port as
`/api` — one process, one URL, which is what `npm run start:local` starts. It binds `0.0.0.0` and
prints every URL it is reachable on, LAN address included, because "open it on your phone" is the
whole point and nobody can derive their own subnet.

Hashed build artifacts (`main-<hash>.js`, `chunk-<hash>.js`, `styles-<hash>.css`, `media/*`) are
served `immutable` for a year — the name changes when the contents do, so a redeploy needs no cache
clear. `index.html` is `no-store`, because it is the one name that survives a redeploy and it names
all the others. Anything unhashed (the favicons) revalidates.

Any non-`/api` path that is not a file falls back to `index.html`, so a deep link like
`/transactions/482` survives a refresh. **`/api` never falls through**: an unknown API path is a
JSON 404, which is what makes a typo in a `fetch` debuggable rather than a parse error somewhere
else entirely. `http/static-site.spec.ts` asserts both halves.

Development does **not** serve it: `ng serve` owns the documents and proxies `/api` here, so a
stale `dist/` cannot shadow the app being worked on. A production boot with nothing built yet stays
API-only and says so, rather than answering every page with a 500 about a missing `index.html`.

The database file and its directory are created on first boot, pending migrations are applied
before the server listens, and `server/data/` is gitignored — the schema lives in
`server/drizzle/` migrations, never the data.

`src/schema/` is one Drizzle table per module, re-exported from `schema/index.ts` (which is what
`drizzle.config.ts` diffs against — a table missing from the barrel never reaches a migration).
Every entity table carries an indexed, cascading `userId`; the seven settings singletons are one row
per user keyed on the owner. After `migrate:generate`, rename the generated `NNNN_<random>.sql` to
something descriptive and update the matching `tag` in `drizzle/meta/_journal.json`. A shipped
migration is never edited.

## Endpoints

- `GET /api/health` → `{ ok: true, schemaVersion: <applied migrations> }`
- `POST /api/auth/login` → `{ email, password }` in, the session user `{ id, email, displayName, role, usingDefaultPassword }` out, plus an `HttpOnly` session cookie. A wrong password, an unknown identifier and a disabled account all answer the same 401.
- `POST /api/auth/logout` → 204, session row deleted, cookie cleared. Idempotent.
- `GET /api/auth/me` → the session user for the cookie's session, or 401. `usingDefaultPassword` is true only for the seeded `admin` account whose password has never been changed (TICKET-AUTH-04).
- `POST /api/auth/password` → `{ currentPassword, newPassword }` for the signed-in caller; 401 for a wrong current password, 400 for an empty one. Keeps the caller's own session and deletes that user's other sessions. **No id parameter** — the account comes from the cookie, so it cannot be aimed at anyone else.
- `PATCH /api/auth/me` → `{ displayName }`; the one field a non-admin may change about themselves.

Everything else under `/api` mounts behind `requireAuth` (TICKET-AUTH-01); health, login and logout
are the only routes a signed-out client can reach.

### The entity API (TICKET-SRV-03)

One router per table, each mounted behind `requireAuth` individually — see `src/routes/api.ts` for
the registry. The signed-in user comes from the session cookie and from nowhere else: no endpoint
reads a `userId` from a body, a query string or a path, and one in a body is ignored.

- **Uniform entities** — `accounts`, `categories`, `rules`, `mappingProfiles`, `importBatches`,
  `transfers`, `loans`, `recurringOverrides`, `goals`, `salaryMetadata`, `transactions`:
  `GET /api/<name>` (with `?ids=1,2,3` to fetch a subset), `GET /api/<name>/:id`,
  `POST /api/<name>`, `PATCH /api/<name>/:id`, `DELETE /api/<name>/:id`.
- **Transactions** additionally: `GET /api/transactions/count`, the list filters
  `?accountId=` / `?importBatchId=` / `?reimbursementTransferId=`, and
  `POST` / `PATCH` / `DELETE /api/transactions/bulk` (an array of rows, of `{ id, changes }`, and of
  ids) — each one SQLite transaction, all applied or none.
- **Goals**: `PATCH /api/goals/sort-order` with the full `{ id, sortOrder }[]`, applied atomically.
- **Salary metadata**: `PUT /api/salaryMetadata` upserts by `yearMonth` and **replaces** the row.
- **Settings singletons** — `appSettings`, `transferSettings`, `forecastSettings`,
  `categoryComparisonSettings`, `dashboardLayoutSettings`, `categoryModelSettings`,
  `uiPreferences` (theme + onboarding flags, TICKET-SRV-10):
  `GET`/`PATCH /api/settings/<name>`. A user with no row reads the shared `DEFAULT_*` constant; a
  patch merges into the row server-side, inside a transaction, creating it if absent.
- **The trained model**: `GET`/`PUT`/`DELETE /api/categoryModel`, `application/octet-stream` rather
  than JSON — `[uint32 LE header length][header JSON][modelTopology][weightSpecs][weightData]`, where
  the header is `{ entity, blobs: { name: byteLength } }`. Megabytes of weights have no business
  being base64 in a JSON body.

Responses are the entity shapes the Angular repositories already return — same field names, same
types, `number` ids, with `userId` and SQL `NULL`s dropped. A row belonging to another user answers
**404, not 403**. A malformed body is a 400 naming the field; anything unexpected is a 500 reading
`Internal server error`, with the detail in the log, so a SQLite constraint message never reaches a
client.

### The transactional operations (TICKET-SRV-04)

Nine write paths in the app span more than one table, so a per-table REST call cannot express them:
two HTTP calls are two transactions, and the gap between them is where the data gets corrupted. Each
is **one endpoint running in one SQLite transaction** — every ownership check included, so a row
cannot change hands between the check and the write.

- **Import** — `POST /api/import/commit` takes `{ batch, transactions, backfill }` (the batch to
  create, the accepted rows, and `{ id, changes }` patches for rows that already existed) and answers
  `{ batch, addedTransactions, duplicateCount, backfilledTransactions }`. `importBatchId` is assigned
  here, so a row carrying one is a 400. The CSV never crosses the wire: parsing, mapping,
  fingerprinting and the duplicate decision stay in the browser's Web Worker.
- `POST /api/import/:batchId/undo` → `{ unlinkedTransferIds, clearedTransferTransactionIds }`, and
  `GET /api/import/:batchId/undo-preview` → `{ rowCount, manuallyCategorisedCount,
  transferLinkedCount }`. Both read the batch's rows through the same query, so the cost the dialog
  states is the cost the undo pays. An already-undone (or unknown, or another user's) batch reports
  zeroes rather than 404 — every statement is user-scoped, so there is nothing to refuse.
- **Transactions** — `POST /api/transactions/delete` with `{ ids }` → the cleanup report
  `{ removedTransactionIds, unlinkedTransferIds, clearedTransferTransactionIds }`. Unlike
  `DELETE /api/transactions/bulk`, it also unpicks every transfer that touched the rows.
- **Transfers** — `POST /api/transfers/link` (`{ fromTransactionId, toTransactionId, method,
  confidence }`, `linkedAt` optional) → `{ transfer, updatedTransactions }`, writing the link and
  stamping both legs, whose category it clears (a transfer is neither spending nor income).
  `POST /api/transfers/link/batch` takes an array of those and links a whole auto-matching pass in one
  transaction. `POST /api/transfers/:id/unlink` → `{ clearedAttributionOverrides }`, removing the row,
  clearing both stamps and dropping any `attributionOverride.reimbursementTransferId` that named it.
- **Accounts** — `DELETE /api/accounts/:id` answers **200 with the cascade report** rather than 204:
  the account, its transactions and their transfers go, and a linked transaction in *another* account
  has its `transferId` cleared (the half no foreign key can do).
  `POST /api/accounts/:id/transactions/delete` is the same cascade with the account row kept.
- **Categories** — `DELETE /api/categories/:id` answers **409 naming the loans** that track the
  category instead of the bare 500 SQLite's NO ACTION constraint would produce, **and the rules**
  that assign it, enabled or not (TICKET-CAT-12) — a rule's target is JSON with no foreign key, so
  nothing else would stop it dangling. Built from a query, not from a caught constraint message;
  the check, the transaction clear and the delete are one transaction (`operations/category-delete.ts`).
- **The whole dataset** — `GET /api/data/export` → `{ schemaVersion, exportedAt, tables }` over the
  signed-in user's rows; an import is **two requests** (TICKET-SRV-11) — `POST /api/data/import/staged`
  streams the backup's bytes to a file and answers `{ uploadId }`, then `POST /api/data/import` takes
  `{ mode: 'replace' | 'merge', uploadId }` and applies it in one transaction — and still
  rejects a `schemaVersion` newer than the server's before writing anything; `DELETE /api/data` clears
  this user's rows and nobody else's. Ids are preserved, so cross-table references survive a restore
  — which also means **an import takes over a row whose id belongs to another account, and that
  account loses it** (TICKET-SRV-12; it was a 409 refusing the whole document until then). There is
  no id remapping on this path: the engine that did that was TICKET-SRV-07's and was deleted with
  Dexie in TICKET-SRV-08, so restoring a backup into an account other than the one it came from is a
  destructive operation on whoever else holds those ids. `categoryModel` is not in the document:
  megabytes of weights cannot survive JSON, and `/api/categoryModel` carries them as bytes.

### The MCP endpoint (TICKET-MCP-01)

- `POST /mcp` — a [Model Context Protocol](https://modelcontextprotocol.io) server over Streamable
  HTTP, **stateless** (no MCP session; `GET`/`DELETE` answer 405). It accepts **only**
  `Authorization: Bearer <token>`: the session cookie does not authenticate it, and a token does not
  authenticate `/api`. A missing, unknown or revoked token, or a disabled user's token, is a 401.
  Every tool runs as the token's user; no admin tool exists.
- Read tools: `list_accounts`, `list_categories`, `list_rules`, `search_transactions` (date range
  required, keyset-paged with `nextCursor`), `get_loans`, `get_future`, `get_income`. They return
  stored rows, not the browser's computed views (forecasts, amortisation).
- Write tools, each **destructive**: called without `confirm: true` they only preview, and the
  confirmed result carries the previous values so a change can be put back.
  `assign_categories` (TICKET-MCP-02) sets or clears categories on up to 500 transactions — an
  assignment is manual, so rules never overwrite it; transfer legs and archived or out-of-window
  categories are skipped. `run_rules` (TICKET-MCP-03) runs the rules exactly as the app's "Run
  rules" does (the matcher is `shared/rule-matching.ts`); with `ruleIds` it reports only the changes
  those rules decide, evaluating them even if disabled.

**Tokens** are created from the command line — there is no UI. Only the SHA-256 of a token is
stored, so the token is printed once; a lost token is revoked and replaced. Tokens are not part of a
data export and survive `DELETE /api/data`; deleting the user deletes them.

```bash
npm --prefix server run token:create -- <login> <name>   # prints the token once
npm --prefix server run token:list                       # id, login, name, createdAt — never the hash
npm --prefix server run token:revoke -- <id>
```

They read the same `DB_FILE` the server does, so run them with the same environment.

**Claude Code** speaks Streamable HTTP directly:

```bash
claude mcp add --transport http money-mosaic http://<host>:4300/mcp \
  --header "Authorization: Bearer <token>"
```

**Claude Desktop** reaches a LAN URL only through a local stdio bridge: as far as we know, its
remote connectors are opened from Anthropic's cloud, which cannot see a home network. Add this to
`claude_desktop_config.json` (`--allow-http` because the server has no TLS):

```json
{
  "mcpServers": {
    "money-mosaic": {
      "command": "npx",
      "args": [
        "-y", "mcp-remote", "http://<host>:4300/mcp", "--allow-http",
        "--header", "Authorization: Bearer ${MM_TOKEN}"
      ],
      "env": { "MM_TOKEN": "<token>" }
    }
  }
}
```

A token is full read **and write** access to that user's data, as that user. Treat it like the
password.


**First boot seeds one account: `admin` / `admin`** (role `admin`, display name "Administrator").
The identifier is literally `admin` — the login field is free text, not a validated email address.
Seeding only ever runs against an empty `users` table, so it cannot resurrect a deleted admin or
reset a changed password. A newly created account also gets its first-run data — the KBC and
Belfius mapping-profile templates, the default categories, the default transfer settings — from
`seedUserDefaults` (TICKET-SRV-02) — the same `shared/seed-data.ts` constants the client's
`DEFAULT_*` fallbacks are built from, written once per user rather than once per database. Passwords are hashed with `scrypt` from `node:crypto` and a per-user salt;
the hash and salt never appear in a response.

This server is **deliberately unsecured for LAN hosting**: no HTTPS, no CSRF tokens, no rate
limiting, no session expiry. **Do not port-forward it, point a public DNS name at it, or give it a
public IP.** To reach it from outside the network, put yourself on that network with a VPN instead
of putting the server on the internet — see the root README's hosting section, which says the same
thing to whoever is running the box rather than to whoever is reading the code.

In development the Angular dev server proxies `/api` here (`proxy.conf.json`), so the browser sees
one origin and no CORS configuration is needed.
