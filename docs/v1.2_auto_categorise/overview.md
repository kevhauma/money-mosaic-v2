# Money Mosaic — v1.2 Auto-categorise (Overview)

Transactions land uncategorised after CSV import today, and the only auto-categorisation is the
user-authored **rules engine**, which never overrides a manual category (`categoryManual`). v1.2 adds a
second, complementary path: an **in-browser neural-net categorizer** (TensorFlow.js) that learns from the
user's own categorisation history and *suggests* a category per uncategorised transaction — a ghost
suggestion with one-click Accept, never an auto-apply, never an override of `categoryManual`. Because the
model is opaque, it also **mines rule proposals** from confident, consistent prediction clusters per
counterparty, surfaced in a rule-proposal inbox on the rules page, so the user's rule set keeps growing even
though the neural net itself can't be read as rules. Each ticketed line links to a `tickets/TICKET-*.md` file
carrying its own user story, description, as-is/to-be, and acceptance criteria — this file is only the index
+ build order. Full design rationale lives in [auto-categorise.md](./auto-categorise.md).

**The load-bearing constraint, repeated because it governs every ticket that touches the worker:** the
production bundle budget (`angular.json`, 500kB warn / 1MB error, initial bundle) is **never raised**. TF.js
is 1MB+, so it is imported **only inside a Web Worker via dynamic `import()`** — no main-thread file may
import any `@tensorflow/*`, not even `import type`. This is gated in every ticket that touches the worker via
a grep check plus a production build's chunk table.

**Architecture:** a long-lived worker (`category-model.worker.ts`, the only tfjs consumer) handles
`INIT`/`TRAIN`/`PREDICT`; a main-thread `CategoryModelService` owns it and exposes Promise-wrapped
round-trips; a `CategoryModelStore` (`@ngrx/signals`, root) drives status/suggestions/rule-proposals and
composes with the existing `TransactionsStore`/`CategoriesStore`/`RulesStore`; a new `categoryModel` Dexie
table (singleton row) persists the trained model's artifacts (topology/specs/weights as transferable
ArrayBuffers) so the model survives a reload. Feature extraction (hashing + char n-grams, no per-locale
stopword list — the model learns which tokens are noise) is pure, tfjs-free, and lives in `core/ml/` so it's
unit-testable without a worker or tfjs.

**Schema note:** the design doc's `.version(6)` reference predates [TICKET-CAT-02](../v1.1_joint_accounts/tickets/TICKET-CAT-02-neutral-category-kind.md)'s neutral-category backfill, which has since shipped as
`.version(6)` in [app-db.ts](../../src/app/core/data-access/app-db.ts). The `categoryModel` table below lands
as **`.version(7)`** instead (still additive, still no `.upgrade()` — a brand-new empty table) — or whichever
is the next free version number at implementation time if another version's tickets claim v7 first.

## Auto-categorisation (FR-ML — new)

Like v1.5's set, these tickets are **not** mutually independent, so the list below is ordered by dependency,
not by file list order:

- [x] [TICKET-ML-01](./tickets/TICKET-ML-01-model-config-and-types.md) — Shared ML config, types, and taxonomy signature (adds FR-ML-1) — prerequisite for every other ticket; no tfjs, no dependencies
- [x] [TICKET-ML-02](./tickets/TICKET-ML-02-feature-hashing.md) — Feature hashing / vectorisation (adds FR-ML-2) — needs ML-01's `FeatureConfig` type; pure, tfjs-free
- [x] [TICKET-ML-03](./tickets/TICKET-ML-03-rule-proposal-mining.md) — Rule-proposal mining from prediction clusters (adds FR-ML-3) — needs ML-01's thresholds and the existing `matchesRule`; independent of ML-02, can run in parallel
- [x] [TICKET-ML-04](./tickets/TICKET-ML-04-model-persistence.md) — `categoryModel` Dexie table + repository (adds FR-ML-4) — needs ML-01's schema-version const; independent of ML-02/ML-03, can run in parallel
- [x] [TICKET-ML-05](./tickets/TICKET-ML-05-training-worker.md) — Long-lived training/prediction Web Worker, the only tfjs consumer (adds FR-ML-5) — needs ML-01 + ML-02 (imports `extractFeatures` for in-worker feature extraction)
- [x] [TICKET-PERF-01](./tickets/TICKET-PERF-01-echarts-eager-bundle.md) — Fix eager `echarts` bundling that breaks the production bundle budget (bug fix, violates CLAUDE.md's bundle-budget hard rule — root cause: `app.ts` imports `AccountsStore` through the `@/feature-accounts` barrel, which also re-exports echarts-using chart components) — independent of the ML tickets, discovered while working ML-05, can ship any time
- [x] [TICKET-ML-06](./tickets/TICKET-ML-06-model-service.md) — Main-thread `CategoryModelService` owning the worker (adds FR-ML-6) — needs ML-05
- [x] [TICKET-ML-07](./tickets/TICKET-ML-07-model-store.md) — `CategoryModelStore`: status machine, train/predict/accept flows (adds FR-ML-7) — needs ML-04, ML-06, ML-03, and the existing `TransactionsStore`/`CategoriesStore`/`RulesStore`
- [x] [TICKET-ML-08](./tickets/TICKET-ML-08-suggestion-ghost-in-transactions.md) — Ghost category suggestion + Accept in the transactions table (adds FR-ML-8) — needs ML-07
- [x] [TICKET-ML-09](./tickets/TICKET-ML-09-rule-proposal-inbox.md) — Rule-proposal inbox on the rules page (adds FR-ML-9) — needs ML-07; independent of ML-08, can run in parallel
- [x] [TICKET-ML-10](./tickets/TICKET-ML-10-model-status-and-training-control.md) — Model status chip + Train/Retrain control (adds FR-ML-10) — needs ML-07; independent of ML-08/ML-09, can run in parallel

### UX revision — consolidated `/learning` page

Raised in [revision-and-feedback.md](./revision-and-feedback.md): the ML-08/09/10 UI landed correct but
scattered (a chip in the transactions table, an inbox on the rules page, a status card on the categories
page) and unclear. These four tickets consolidate everything onto a new `/learning` page:

- [x] [TICKET-ML-11](./tickets/TICKET-ML-11-learning-route-and-page-shell.md) — `/learning` route, page shell, and nav entry (adds FR-ML-11) — prerequisite for ML-12/13/14; no dependency on ML-08/09/10 beyond them already existing
- [x] [TICKET-ML-12](./tickets/TICKET-ML-12-model-status-detail-on-learning-page.md) — Model status + training detail moved and expanded onto the Learning page (extends FR-ML-10, adds FR-ML-12) — needs ML-11; independent of ML-13/ML-14, can run in parallel
- [x] [TICKET-ML-15](./tickets/TICKET-ML-15-live-training-progress.md) — Live per-epoch training progress streamed from the worker (adds FR-ML-15) — needs ML-12 (edits the same status rendering it relocates); sequenced after it, not parallel
- [x] [TICKET-ML-13](./tickets/TICKET-ML-13-suggestions-table-on-learning-page.md) — Dedicated suggestions table on the Learning page, replacing the transactions-table ghost chip (supersedes part of FR-ML-8, adds FR-ML-13) — needs ML-11; independent of ML-12/ML-14, can run in parallel
- [x] [TICKET-ML-14](./tickets/TICKET-ML-14-rule-proposals-on-learning-page.md) — Rule-proposal inbox moved from the rules page to the Learning page (relocates FR-ML-9) — needs ML-11; independent of ML-12/ML-13, can run in parallel
- [ ] [TICKET-ML-16](./tickets/TICKET-ML-16-confidence-gradient-badge.md) — Colour the suggestions table's suggestion badge on a red-to-green gradient by confidence (extends FR-ML-13, adds FR-ML-16) — needs ML-13; purely presentational, independent of everything else, can ship any time
- [x] [TICKET-ML-17](./tickets/TICKET-ML-17-training-window-years.md) — Restrict model training to a "previous N years" preset window of transactions, so stale historical categorisation habits don't muddy training data (extends FR-ML-5/FR-ML-7/FR-ML-10, adds FR-ML-17) — needs ML-05, ML-07, ML-12 (edits `train()` and the Learning page's model-status control); independent of ML-16, can ship any time

## Considered, not ticketed yet

- **Auto-retrain after N new labels** — v1.2 ships a manual "Train model" / "Retrain" button only, so CPU
  training cost stays predictable and user-initiated. An automatic retrain trigger once enough new labels
  accumulate is a natural v1.2-adjacent follow-up once the manual flow has proven useful.
- **WASM backend** — v1.2 trains on the CPU backend only (data is tiny — dozens to hundreds of rows — so CPU
  is sub-second and needs no served `.wasm` assets). If training latency ever becomes a real problem, WASM is
  the documented upgrade path; not worth the added asset/config complexity until then.
- **Reading rule proposals from model weights** — rejected during design: the MLP is opaque, so rule
  proposals are mined from confident, consistent *prediction clusters* per counterparty (ML-03), never from
  inspecting learned weights directly.
- **A hand-coded merchant-normalizer/stopword list** — explicitly rejected in favour of feature hashing +
  char n-grams, since a hand-tuned normalizer is bank/locale-specific and doesn't generalise; the model
  learns which tokens are noise instead.
- **Auto-applying suggestions or overriding `categoryManual`** — out of scope by design, not just for v1.2:
  the model is suggest-only, permanently. Every ticket's acceptance criteria enforce this.

## Definition of Done (applies to every ticket)

Per [../../CLAUDE.md](../../CLAUDE.md): `ng lint` + `ng test` + `ng build --configuration development` all
pass, plus a live browser check for any UI-visible change. **This set adds one Dexie schema change**
(ML-04's `categoryModel` table, next free schema version — additive, no `.upgrade()` needed) and no changes
to any shipped version block. Components/stores never touch `appDb` tables directly — always through
`CategoryModelRepository` for the new table. **The production bundle budget in `angular.json` is never
raised** — any ticket that touches `core/ml/category-model.worker.ts` or its callers must re-verify, via
`grep "@tensorflow" src/app` and a `ng build --configuration production` chunk inspection, that tfjs appears
only in the worker's chunk, never the initial bundle. The model **never** auto-applies a category or
overrides `categoryManual` — every prediction surfaces as a dismissible suggestion or rule proposal, accepted
one click at a time by the user.
