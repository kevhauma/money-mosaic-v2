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
npm run server               # this server alone
npm run server:migrate       # generate SQL from src/schema, then apply it
npm run test:server          # backend tests (in-memory SQLite)
```

| Env var   | Default                       | Meaning                                              |
| --------- | ----------------------------- | ---------------------------------------------------- |
| `PORT`    | `4300`                        | HTTP port. 4300 stays clear of 4210/4200.            |
| `DB_FILE` | `server/data/money-mosaic.sqlite` | SQLite file; relative paths resolve against `server/`. |
| `NODE_ENV`| unset (dev)                   | `production` turns the request logger off.           |

The database file and its directory are created on first boot, pending migrations are applied
before the server listens, and `server/data/` is gitignored — the schema lives in
`server/drizzle/` migrations, never the data.

`src/schema/` is one Drizzle table per module, re-exported from `schema/index.ts` (which is what
`drizzle.config.ts` diffs against — a table missing from the barrel never reaches a migration).
Every entity table carries an indexed, cascading `userId`; the seven Dexie singletons are one row
per user keyed on the owner. After `migrate:generate`, rename the generated `NNNN_<random>.sql` to
something descriptive and update the matching `tag` in `drizzle/meta/_journal.json`. A shipped
migration is never edited.

## Endpoints

- `GET /api/health` → `{ ok: true, schemaVersion: <applied migrations> }`
- `POST /api/auth/login` → `{ email, password }` in, the public user `{ id, email, displayName, role }` out, plus an `HttpOnly` session cookie. A wrong password, an unknown identifier and a disabled account all answer the same 401.
- `POST /api/auth/logout` → 204, session row deleted, cookie cleared. Idempotent.
- `GET /api/auth/me` → the public user for the cookie's session, or 401.

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
  `categoryComparisonSettings`, `dashboardLayoutSettings`, `categoryModelSettings`:
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


**First boot seeds one account: `admin` / `admin`** (role `admin`, display name "Administrator").
The identifier is literally `admin` — the login field is free text, not a validated email address.
Seeding only ever runs against an empty `users` table, so it cannot resurrect a deleted admin or
reset a changed password. A newly created account also gets its first-run data — the KBC and
Belfius mapping-profile templates, the default categories, the default transfer settings — from
`seedUserDefaults` (TICKET-SRV-02), which is Dexie's per-database `populate` hook reworked into a
per-user one. Passwords are hashed with `scrypt` from `node:crypto` and a per-user salt;
the hash and salt never appear in a response.

This server is **deliberately unsecured for LAN hosting**: no HTTPS, no CSRF tokens, no rate
limiting, no session expiry. Do not put it on the public internet.

In development the Angular dev server proxies `/api` here (`proxy.conf.json`), so the browser sees
one origin and no CORS configuration is needed.
