# TICKET-MCP-05 — Create and revoke your own MCP tokens in Settings

- **Area:** MCP
- **Released in:** _unreleased_
- **Type:** Feature
- **Traceability:** extends TICKET-MCP-01 (token auth) and TICKET-AUTH-04 (self-service account settings)

## User story

As any signed-in user on the server, I want to create, see and revoke my own MCP tokens in Settings, so I can connect an agent to my data without asking whoever has a shell on the server.

## Description

Today only someone with a terminal on the server can mint a token, through `token:create`. This adds self-service token routes under `/api/auth` and an "Agent access (MCP)" section in Settings, right below Account. Each user only ever sees and touches their own tokens.

## Current situation (as-is)

- Tokens are created, listed and revoked only by the CLI ([token-command.ts](../../../server/src/auth/token-command.ts)), which calls [api-tokens.ts](../../../server/src/auth/api-tokens.ts). `listApiTokens` and `revokeApiToken` cover **every** user's tokens, which is right for an operator at a shell and wrong for a web route.
- No `/api` route exposes tokens, and the frontend has no screen for them. The README says so: "Tokens are created from the command line — there is no UI" ([server/README.md](../../../server/README.md)).
- Settings' Account section ([settings-account-section.component.ts](../../../src/app/feature-settings/components/settings-account-section/settings-account-section.component.ts)) already holds the caller's other self-service actions (display name, password) through [auth-api.service.ts](../../../src/app/core/auth/auth-api.service.ts).

## Desired result (to-be)

- **Server**, behind `requireAuth` on the auth router, with the user always taken from the session cookie:
  - `GET /api/auth/tokens` returns the caller's tokens as `{id, name, createdAt}`, oldest first. It never includes the hash or the token.
  - `POST /api/auth/tokens {name}` creates a token and returns `{id, name, createdAt, token}`. This is the only response that ever contains the plain token. A blank name is a 400.
  - `DELETE /api/auth/tokens/:id` revokes one of the caller's tokens with a 204. An unknown id, or another user's id, is a 404.
- **Frontend:** an "Agent access (MCP)" section component, composed by `settings-overview` right after Account (TICKET-SET-07's one-section-per-setting rule):
  - lists the caller's tokens (name, created date) with a Revoke button on each;
  - has a name field and a Create button;
  - after creating a token, shows it once with a Copy button and a warning that it won't be shown again, plus the `claude mcp add` command with this server's `/mcp` URL filled in;
  - asks for confirmation before revoking.
- The CLI keeps working as before: operators can still list and revoke every user's tokens.

## Acceptance criteria

- [x] `GET /api/auth/tokens` lists only the caller's tokens, never a hash or token. (`server/src/routes/auth-tokens.spec.ts` "lists only the caller's tokens, never a hash or token")
- [x] `POST /api/auth/tokens` returns a token that authenticates `/mcp` as the caller, and refuses a blank name with a 400. (`auth-tokens.spec.ts` "creates a token that authenticates /mcp, and refuses a blank name")
- [x] `DELETE /api/auth/tokens/:id` revokes the caller's own token, after which `/mcp` answers 401 for it. Another user's id, or an unknown id, is a 404 and deletes nothing. (`auth-tokens.spec.ts` "revokes the caller's own token, and 404s another user's or an unknown id")
- [x] All three routes answer 401 without a session. A bearer token does not authenticate them. (`auth-tokens.spec.ts` "answers 401 without a session…")
- [x] The Settings panel lists, creates (showing the token once, with copy) and revokes (after confirming). It goes through `AuthApiService`, never `HttpClient` from the component.
- [x] Unit tests cover the panel: listing, the token shown only after create, revoke after confirm. (`settings-mcp-tokens-section.component.spec.ts`, 4 tests)
- [x] `server/README.md` documents the routes and the Settings panel next to the CLI.
- [x] Lint, tests and build pass in both workspaces. Verified via the fallow skill and the coding-conventions skill. (server lint/typecheck, 497 server tests, ng lint, 3980 ng tests, dev build; `fallow audit --base HEAD` pass)
- [ ] Live browser check.

## Notes

- `proxy.conf.json` also forwards `/mcp`, so the command the panel shows under `npm run dev` (origin 4210) works too.

- No token expiry or scopes. A token is still full read and write access as its user, and the panel says so.
- No admin view of other users' tokens in the UI; the CLI covers that. Deleting a user still cascades to their tokens.
