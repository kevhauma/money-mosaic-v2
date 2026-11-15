# TICKET-NG-21 — `ApiClient.absent()` checks the status, not `instanceof HttpErrorResponse`

- **Area:** Data access (core/data-access)
- **Released in:** _unreleased_
- **Type:** Bug fix
- **Traceability:** CR6-26 (`absent()` part); aligns with the `httpStatusOf` rule `api-client.ts` itself documents (TICKET-SRV-06)

## User story

As a developer writing a spec for a repository read that may find nothing, I want a 404 "row not found" to read as "absent" in tests exactly as it does in the app, so the spec exercises the real path.

## Description

`absent()` turns a 404 with the `ROW_NOT_FOUND` code into `undefined` — but only when `error instanceof HttpErrorResponse`. The same file explains, ten lines further down, that under the test runner's pre-bundling the response can come from a second copy of `@angular/common/http` and fail that identity check, which is why `asRejection` uses `httpStatusOf`. `absent()` was never moved over.

## Current situation (as-is)

- [api-client.ts:182-193](../../../src/app/core/data-access/api-client.ts) — `error instanceof HttpErrorResponse && error.status === 404 && codeOf(error) === ROW_NOT_FOUND ? of(undefined) : throwError(...)`.
- [api-client.ts:216-223](../../../src/app/core/data-access/api-client.ts) — the `asRejection` docblock: "Asked through `httpStatusOf`, not `instanceof HttpErrorResponse`, because … the response can be built from a second copy of `@angular/common/http` and fail an identity check."
- When the identity check fails, a "no such row" 404 is re-thrown and then flattened by `asRejection` into an `Error`, so the repository rejects instead of resolving `undefined`.

## Desired result (to-be)

- `absent()` tests `httpStatusOf(error) === 404 && codeOf(error) === ROW_NOT_FOUND`; `codeOf` accepts `unknown` the same way.
- No `instanceof HttpErrorResponse` remains in `api-client.ts`.

## Acceptance criteria

- [ ] A 404 whose body `code` is `ROW_NOT_FOUND` resolves `undefined`, both for a real `HttpErrorResponse` and for an object shaped like one (`name: 'HttpErrorResponse'`, `status: 404`, matching body) that fails the identity check.
- [ ] A 404 without that code (unknown route) still rejects.
- [ ] `grep "instanceof HttpErrorResponse" src/app/core/data-access` returns nothing.
- [ ] `api-client.spec.ts` covers the three cases.
- [ ] `ng lint`, `ng test`, `ng build --configuration development` pass.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Independent of [TICKET-NG-15](./TICKET-NG-15-api-client-keeps-http-status.md); `absent()` runs on the raw HTTP error before `asRejection`, so the order they land in doesn't matter.
- No UI change; no browser check.
