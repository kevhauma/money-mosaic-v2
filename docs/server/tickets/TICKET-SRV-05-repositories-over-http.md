# TICKET-SRV-05 — Repositories talk HTTP instead of Dexie

- **Area:** Server
- **Released in:** _unreleased_
- **Type:** Refactor
- **Traceability:** preserves the repository rule in [`CLAUDE.md`](../../../CLAUDE.md) ("components and stores never touch the database directly"); planned for v3

## User story

As a developer of this app, I want the switch from IndexedDB to the server to happen entirely inside the repository layer, so twenty-odd features, their stores and their tests carry on working without being rewritten.

## Description

Reimplements all 17 repositories in [`core/data-access/`](../../../src/app/core/data-access/) over `HttpClient` against the API from [TICKET-SRV-03](./TICKET-SRV-03-rest-api-per-entity.md) and [TICKET-SRV-04](./TICKET-SRV-04-transactional-write-endpoints.md), keeping every public method signature byte-identical. This is the pivot: after it, the app's data lives on the server.

## Current situation (as-is)

- Each repository is a thin `@Injectable({ providedIn: 'root' })` wrapper over a Dexie table. [`accounts.repository.ts`](../../../src/app/core/data-access/accounts.repository.ts) is the archetype — four arrow-function properties returning `appDb.accounts.toArray()`, `.add()`, `.update()`, `.delete()`.
- **All methods are already `async`** and return promises, which is the property that makes this swap possible at all: a network call fits the same shape a Dexie call had.
- Nine call sites outside the repositories reach for `appDb` directly to open multi-table transactions. [TICKET-SRV-04](./TICKET-SRV-04-transactional-write-endpoints.md) built the **server half** of those — the endpoints exist and are tested — but **the four client services still hold their Dexie bodies**, so this ticket rewires them alongside the repositories.

  > **Amended 2026-09-25.** This bullet originally said "by the time this ticket starts, only repositories and bootstrap touch `appDb`". SRV-04 scoped itself to the server half, correctly: calling those endpoints needs `HttpClient` and the auth interceptor from [TICKET-AUTH-02](../../auth/tickets/TICKET-AUTH-02-login-screen-session-guard.md), which is not one of its dependencies, and until *this* ticket the app must still work with the server switched off. So the client rewiring lands here, where the point of no return is already declared. Don't start on the assumption that the services are already ported.
- The repository specs (`transactions.repository.spec.ts`, `goals.repository.spec.ts`, `app-settings.repository.spec.ts`, and six others) run against a real Dexie database through the `fake-indexeddb` polyfill in [`test-setup.ts`](../../../src/test-setup.ts), which is global because Vitest runs with `isolate: false`.
- `HttpClient` is provided by [TICKET-AUTH-02](../../auth/tickets/TICKET-AUTH-02-login-screen-session-guard.md), with the credentials and 401 interceptor already in place.

## Desired result (to-be)

- **Every repository's public surface is unchanged** — same method names, same parameters, same return types, including the `Promise<number>` that Dexie's `update` returned (the count of updated rows; the API returns the same count so callers checking it keep working).
- **A shared `ApiClient`** wraps `HttpClient` with the base path, the JSON handling, and one place to turn an error response into a thrown `Error` carrying the server's message. Repositories call it; none of them constructs a URL by hand more than once.
- **`appDb` leaves `core/data-access/` entirely** — no repository imports it. `app-db.ts` itself survives this ticket (it is deleted in [TICKET-SRV-08](./TICKET-SRV-08-retire-dexie.md)) but nothing reads from it except the migration path in [TICKET-SRV-07](./TICKET-SRV-07-migrate-local-database.md).
- **The fourteen `AppSettings` setters stay**, each sending a one-field `PATCH` to the settings endpoint. Their read-merge-put body disappears: the merge is the server's job now, which also removes the lost-update risk two tabs currently have.
- **Repository specs move off `fake-indexeddb`** onto `HttpTestingController`, asserting the request method, URL, and body for each method, and the mapping of the response back to the entity shape. The behaviour the old specs proved about Dexie semantics (upsert-by-month in `salary-metadata`, the `DEFAULT_*` fallback for an unwritten singleton, `bulkUpdateSortOrder` atomicity) is now the **server's** behaviour and is covered by SRV-03's backend tests — the client spec asserts the right call is made, not what SQLite does with it.
- **Store and component specs that stub a repository keep working untouched.** Any that reach through to a real Dexie database instead of stubbing get converted to `HttpTestingController` or a repository stub, whichever is smaller.
- **No component, store, template or feature module changes.** If one does, that is a leak in the repository abstraction and it gets fixed at the repository, not at the caller — the one exception being loading and error handling, which is [TICKET-SRV-06](./TICKET-SRV-06-bootstrap-hydration-over-network.md)'s job and deliberately out of scope here.

## Acceptance criteria

- [ ] No file under `src/app/core/data-access/` imports `appDb`, except the migration helper SRV-07 adds — asserted by a test or a lint rule, not by inspection.
- [ ] Every repository method has the same name, arity and return type it had before — asserted by comparing against the signatures recorded in this ticket, so a silent signature change is caught.
- [ ] `git diff` touches **no** file under `src/app/feature-*/` other than specs, and no file in `src/app/shared/` — the seam held, or the ticket is not done.
- [ ] Each repository method issues exactly one request to the documented endpoint with the documented body, covered per method by `HttpTestingController`.
- [ ] A 4xx/5xx response surfaces as a rejected promise carrying the server's message, not a silent `undefined`.
- [ ] `update` still resolves to the number of rows changed, and callers that branch on it (the settings setters, `bulkUpdate`) still behave the same.
- [ ] The nine repository specs are converted and pass; no repository spec depends on `fake-indexeddb` any more.
- [ ] `ng test` is green in full, with the same test count or higher — a converted spec that quietly lost cases fails this.
- [ ] `ng build --configuration development` succeeds and the initial bundle does not grow (Dexie is still bundled at this point; it shrinks in SRV-08). The `angular.json` budgets are **not** raised.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: with the server running, sign in and confirm every page — dashboard, transactions, accounts, categories, import, income, loans, recurring, future, explore, learning, settings — renders its data from the API.

## Notes

- **A settings endpoint answers `{}` for a row that was never written — keys *absent*, not present-with-`undefined`.** So the repository must keep spreading the response over its `DEFAULT_*` constant rather than returning the body straight through. This is not cosmetic: `ForecastSettingsStore` and `AppSettingsStore` derive their signal members from the seed object's **keys**, so a body missing a key produces a store missing a member — the `withState`-needs-every-key gotcha that TICKET-FUT-* hit in v2.2. Noted from TICKET-SRV-03's review, while it is cheap.

- **This ticket is the point of no return for the local-first premise.** Up to here the app still works with the server switched off; after it, it does not. That is why [TICKET-SRV-06](./TICKET-SRV-06-bootstrap-hydration-over-network.md) (what the app does when the server is unreachable) is sequenced immediately after and should not be deferred — between the two, an offline user gets a blank screen with console errors.
- **The per-method signature check earns its place.** Seventeen repositories reimplemented by hand is exactly the situation where a `Promise<void>` quietly becomes a `Promise<number>` and a caller's `if` starts always-truthing. The compiler catches most of it; the check catches the rest.
- **Expect the abstraction to leak in exactly one place: latency.** Dexie resolved in microseconds off the same thread; the API resolves over a network. Nothing in the acceptance criteria above covers perceived speed — that is SRV-06's loading states and, if the dashboard's chained reads turn out to be slow, a follow-up ticket for batching them. Do not pre-optimise it here.
- Depends on [TICKET-SRV-03](./TICKET-SRV-03-rest-api-per-entity.md), [TICKET-SRV-04](./TICKET-SRV-04-transactional-write-endpoints.md) and [TICKET-AUTH-02](../../auth/tickets/TICKET-AUTH-02-login-screen-session-guard.md).
