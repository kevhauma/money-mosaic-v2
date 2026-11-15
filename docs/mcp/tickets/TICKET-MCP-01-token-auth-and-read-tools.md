# TICKET-MCP-01 — An MCP endpoint with token auth, and the read tools

- **Area:** MCP
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** new; builds on the v3 server (TICKET-SRV-03) and its per-user scoping (TICKET-AUTH-01)

## User story

As someone running Money Mosaic on my home network, I want Claude Code or Claude Desktop to read my transactions, loans, goals and income through an MCP server, so I can ask an agent questions about my money without exporting anything.

## Description

The Express server gains a Streamable HTTP MCP endpoint at `/mcp` and personal access tokens to authenticate it. This ticket ships the endpoint, the tokens and every **read** tool. The write tools follow in TICKET-MCP-02..04, which all build on this one.

## Current situation (as-is)

- The only way in is the `mm_session` cookie: [`createRequireAuth`](../../../server/src/middleware/require-auth.ts) resolves it through `findSessionUser` ([sessions.ts](../../../server/src/auth/sessions.ts)). Sessions never expire, and no `Authorization` header is read anywhere in `server/src`.
- Routers are mounted per path behind `requireAuth` in [app.ts](../../../server/src/app.ts), before `mountStaticSite`. The server listens on every interface ([network.ts](../../../server/src/network.ts)) on purpose, for LAN use.
- `GET /api/transactions` ([transactions.ts](../../../server/src/routes/transactions.ts)) returns **every** row the user owns. It filters on `accountId`, `importBatchId` and `reimbursementTransferId`, but not on date, and it doesn't page.
- Forecast, income and loan-schedule maths runs only in the browser (`src/app/core/stats`, `src/app/core/loans`, plus the Angular data stores), so the server can hand out stored rows only.
- `@modelcontextprotocol/sdk` and `zod` are in the root `node_modules`, but only because `@angular/cli` depends on them. [server/package.json](../../../server/package.json) lists only express, drizzle-orm and better-sqlite3.

## Desired result (to-be)

- **Dependencies:** add `@modelcontextprotocol/sdk` and `zod` to `server/package.json`.
- **Tokens:**
  - A new `apiTokens` table (Drizzle migration, renamed descriptively): `id`, `userId` (cascade on user delete), `name`, `tokenHash` (unique, SHA-256 of the token), `createdAt`.
  - The plain token is shown once, when it is created, and never stored.
  - Tokens are **not** part of a data export, so `DATA_SCHEMA_VERSION` stays where it is.
- **CLI** (`server/package.json` scripts):
  - `token:create -- <login> <name>` prints the new token once.
  - `token:list` shows id, user, name and createdAt, never the hash.
  - `token:revoke -- <id>` deletes the token.
- **Endpoint:**
  - `/mcp` is mounted in `app.ts` before the static site and uses the SDK's **stateless** Streamable HTTP transport (no session store).
  - It accepts **only** `Authorization: Bearer <token>`. A cookie does not authenticate `/mcp`, and a token does not authenticate `/api`.
  - A missing, unknown or revoked token, or one belonging to a disabled user, gets 401.
  - Every tool runs as the token's user. No admin tool is exposed.
- **Server `instructions`** tell the agent:
  - amounts are in EUR and negative means money out;
  - dates are `YYYY-MM-DD`;
  - "manual" means a category set by a person or agent rather than by a rule;
  - tools marked destructive are previewed first and need `confirm: true` to apply.
- **Read tools** (each with a zod input schema and a description written for the agent). Tools query Drizzle directly, filtering on the token's `userId`, using the same ownership approach as the existing routers; they don't call the REST API.

| Tool                  | Returns                                                                                                                                     |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_accounts`       | id, name, type, IBAN, joint/co-owner flag                                                                                                   |
| `list_categories`     | id, name, kind, group, archived, activeFrom/activeUntil; archived ones hidden unless `includeArchived: true`                                |
| `list_rules`          | every rule: id, name, priority, enabled, continueOnMatch, conditionMatch, conditions, target category id and name                           |
| `search_transactions` | see below                                                                                                                                   |
| `get_loans`           | the stored loan rows, plus the tracked category's name                                                                                      |
| `get_future`          | `savingsGoals`, `forecastSettings`, `recurringOverrides`, as stored                                                                         |
| `get_income`          | `salaryMetadata`, plus the income fields of `appSettings` (`excludedIncomeCategoryIds`, `smoothedBonusCategoryIds`, `mainIncomeCategoryId`) |

- **`search_transactions` input:**
  - Required: `from`, `to` (inclusive, on `bookingDate`).
  - Optional: `accountIds[]`, `categoryId`, `uncategorised: true` (no category and not transfer-linked), `text` (case-insensitive match on description, counterparty name and notes).
  - `limit`: default 200, max 1000. `cursor`: opaque, keyset on `(bookingDate, id)` descending.
- **`search_transactions` output:**
  - Compact rows: id, bookingDate, amount, currency, account `{id, name}`, counterpartyName, counterpartyIban, rawDescription, category `{id, name} | null`, categoryManual, transferId, notes.
  - Left out because they're bulky: `rawRow`, `rawLine`, `fingerprint`.
  - The response also carries `nextCursor`.
- **`server/README.md`:**
  - a section on creating a token and connecting Claude Code (`claude mcp add --transport http <name> http://<host>:4300/mcp --header "Authorization: Bearer …"`);
  - connecting Claude Desktop through a stdio bridge (`npx mcp-remote …`);
  - `/mcp` added to the endpoint list.

## Acceptance criteria

- [x] `@modelcontextprotocol/sdk` and `zod` are listed in `server/package.json`, and `npm run server:install` installs them. (`server/package.json` dependencies `@modelcontextprotocol/sdk@^1.32.2`, `zod@^4.6.7`; installed via `npm --prefix server install`)
- [x] The `apiTokens` migration applies on a fresh database, and on a database already at the latest migration. No shipped migration is edited. (`server/drizzle/0003_api_tokens.sql`; `db.migrations.spec.ts` "applies the repo migrations folder cleanly, twice" and the new "brings a database one migration behind up to date, with its rows intact")
- [x] `token:create` prints a token once and stores only its hash. `token:list` never prints a hash. `token:revoke` makes the next request with that token a 401. (`auth/token-command.ts`; `mcp-router.spec.ts` "stores only the hash…", "lists id, login, name and date but never a hash", "answers 401 once the token is revoked"; also run live: `npm run token:create -- admin live-check` against a scratch DB)
- [x] `/mcp` answers 401 with no token, an unknown token, a revoked token, or a disabled user's token, **and** to a request that carries a valid session cookie but no token. (`mcp-router.spec.ts` "/mcp authentication" — no/unknown/malformed token, revoked, disabled user, cookie without token)
- [x] A token sent to an `/api/*` route is ignored: still 401 without a cookie. (`mcp-router.spec.ts` "ignores a token sent to /api")
- [x] Deleting a user removes that user's tokens, and the admin delete cascade spec covers this. (`apiTokens.userId` cascades; `admin-users.spec.ts` "removes the account, its sessions, its API tokens and every row it owns…")
- [x] A data export carries no `apiTokens`, and `DATA_SCHEMA_VERSION` is unchanged. (`apiTokens` added to `SERVER_OWN_TABLES` in `operations/user-rows.ts`, so it is outside `PER_USER_TABLES`/`TRANSPORT_TABLES`; `DATA_SCHEMA_VERSION` still 17; `mcp-router.spec.ts` also checks tokens survive `DELETE /api/data`)
- [x] Every read tool returns only the token user's rows. A spec with two users proves that for each tool. (`read-tools.spec.ts` "every read tool returns only the token user's rows", both directions)
- [x] `search_transactions` covers: the date range is inclusive at both ends; `accountIds` filters; `categoryId` filters; `uncategorised` excludes transfer-linked rows; `text` matches description, counterparty and notes; `limit` is capped at 1000; paging with `nextCursor` returns every row exactly once, including rows that share a date. (`read-tools.spec.ts` "search_transactions" — one test per behaviour, including paging over repeated dates with limit 2 and the 200-row default)
- [x] `list_categories` hides archived categories unless `includeArchived` is set. (`read-tools.spec.ts` "hides archived categories unless includeArchived is set")
- [x] A missing `from`/`to`, a malformed date or an over-limit `limit` is a tool error naming the field, not a 500. (`read-tools.spec.ts` "answers a tool error naming the field…" — the SDK's zod validation error ends "at to" / "at from" / "at limit")
- [x] `server/README.md` documents the token CLI, the Claude Code command, the Claude Desktop bridge and the `/mcp` endpoint. (`server/README.md` "The MCP endpoint (TICKET-MCP-01)")
- [ ] Connected from Claude Code against a dev server: `list_accounts` and `search_transactions` for one month return real rows. (Left open: not run from Claude Code itself, to avoid editing the user's Claude config. Checked instead with JSON-RPC `tools/call` over HTTP against a real `tsx src/index.ts` process on a scratch DB, using a CLI-made token: `list_accounts` returned the account, `search_transactions` for 2026-10 returned only the October row, and a cookie-only request got 401.)
- [x] `npm --prefix server run lint`, `npm --prefix server run typecheck` and `npm run test:server` pass. Verified via the fallow skill and the coding-conventions skill. (lint, typecheck and all 456 server tests green; fallow dead-code + health gates exit 0. Server-only change, so the coding-conventions skill's **Backend** section is what applies)

## Notes

- **Why tokens and not the cookie:** Claude Code and Desktop can't run the browser login. Accepting the cookie on `/mcp` would also let any page open in a signed-in browser on the LAN send it write calls (CSRF). Bearer-only shuts both out.
- **No scopes and no token UI**, decided 2026-11-14. Every token has full read and write access as its user. A settings page and a read-only flag can come later.
- **Raw rows, not computed views**, decided 2026-11-14. Exposing forecast, income growth or loan amortisation means moving that maths out of `src/app/core/stats` and `core/loans` into `shared/` first. It currently pulls in Angular through the `@/shared/utils` barrel (`computed` plus a locale signal) and through the signal stores. Upgrade a tool when an agent actually needs it, starting with loans.
- **Claude Desktop** reaches a LAN URL only through a local stdio bridge. As far as we know, its built-in connectors are brokered from Anthropic's cloud and can't see a home network. Confirm this while writing the README.
- **Design session:** 2026-11-14, Q1–Q16.
