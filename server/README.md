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

## Endpoints

- `GET /api/health` → `{ ok: true, schemaVersion: <applied migrations> }`

In development the Angular dev server proxies `/api` here (`proxy.conf.json`), so the browser sees
one origin and no CORS configuration is needed.
