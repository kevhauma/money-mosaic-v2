# TICKET-NG-15 — ApiClient keeps the HTTP status on its rejections

- **Area:** Data access (core/data-access)
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-26 (`asRejection` part); fixes the error contract of TICKET-SRV-06 that `reportIfUnexpected` relies on

## User story

As a developer reading the console, I want only real bugs logged as unexpected, so a server's ordinary 400 or 500 answer doesn't bury the `TypeError` I need to see.

## Description

`ApiClient.asRejection` turns every 4xx/5xx into a plain `Error` carrying the server's message and drops the status. Both copies of `reportIfUnexpected` treat "no HTTP status" as "not the server answering", so every server answer is logged as an unexpected error. Callers also can't tell a 404 from a 500 any more.

## Current situation (as-is)

- [api-client.ts:224-228](../../../src/app/core/data-access/api-client.ts) — `asRejection`: status 0 → `ServerUnreachableError`; any other status → `new Error(messageOf(error))`, no status, no `code`.
- [transport-failure.ts:54-61](../../../src/app/core/server-status/transport-failure.ts) — `httpStatusOf` recognises only an `HttpErrorResponse` (by identity or by `name`).
- [with-hydration.ts:62-64](../../../src/app/core/store-reset/with-hydration.ts) and [ui-preferences.service.ts:130-132](../../../src/app/core/ui-preferences/ui-preferences.service.ts) — `if (httpStatusOf(error) === undefined && !isTransportFailure(error)) console.error(error)`. For every flattened 4xx/5xx `httpStatusOf` is `undefined`, so it logs.

## Desired result (to-be)

- `asRejection` rejects with an `ApiError extends Error` carrying `status` and the body's `code`; `message` stays the server's message, so every existing `error.message` reader is unchanged.
- `httpStatusOf` returns `ApiError.status`, so `reportIfUnexpected` stays silent for server answers and still logs anything else.
- The two `reportIfUnexpected` copies become one, exported from `core/server-status` beside `httpStatusOf`.

## Acceptance criteria

- [ ] A repository call answered `400 { error: "Name is required" }` rejects with an error whose `message` is "Name is required", `status` is 400 and `httpStatusOf(error)` is 400.
- [ ] A hydration failing with a 500 does not call `console.error`; a `TypeError` thrown inside `load` still does.
- [ ] Status 0 still rejects with `ServerUnreachableError` (`isTransportFailure` true).
- [ ] Exactly one `reportIfUnexpected` definition remains (grep).
- [ ] `api-client.spec.ts`, `transport-failure` and `with-hydration.spec.ts` cover the cases above.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- `absent()`'s `instanceof HttpErrorResponse` check is the other half of CR6-26: [TICKET-NG-21](./TICKET-NG-21-api-client-absent-uses-status.md).
- Makes [TICKET-NG-13](./TICKET-NG-13-failed-saves-surfaced.md)'s "expected vs unexpected" split straightforward.
- No UI change; no browser check.
