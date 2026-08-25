# CR4-2 — Import wizard commit/auto-commit flow: options

Finding: [CR4-2](../code-review.md#cr4-2--the-import-wizards-commitauto-commit-flow-is-the-hardest-to-reason-about-code-in-the-app). Correctness depends on ordering interactions between ~10 signals, one RxJS parse pipeline, one auto-commit `effect()`, and two non-reactive guard fields — spread across `ImportWizardComponent` and `ImportMapStepComponent`.

**What makes this one different from a normal refactor:** the risk being managed is double-commit / wrong-account attribution during import — data corruption at the app's front door. Any option here should be judged first by *how much of the invariant surface becomes testable without a browser*, and only second by line counts. The `fake-indexeddb` global test setup already supports store-level specs that exercise Dexie for real, so deep flows are testable today — the logic just lives in a component where specs are clumsiest.

## Option A — Extract a wizard session state machine (signalStore or plain service)

Move the whole session — `step`, `queue`, `pendingDrafts`, `currentFileIndex`, `mapResult`, `batchMapping`, `manualOverrideActive`, `applyToRemaining`, `committing`, `commitResults`, `accountCreationError` — into an injectable `ImportWizardSession` (a `signalStore` scoped to the import route, or a plain class with signals). Components become views: they read computeds and call named transitions (`advance()`, `commitCurrentFile()`, `overrideManually()`, `reset()`).

- The auto-commit `effect()` and the `autoCommittedFileIndex` guard field move inside the session, next to the state they guard — the invariant "one commit per file index" becomes a property of one class with one writer, spec-testable by driving transitions directly.
- The parse pipeline (`toObservable(parseInput).pipe(switchMap…)`) can move too, or stay component-side feeding the session; moving it makes "commit is impossible while parsing" a session rule rather than a template `disabled` rule.
- Trade-offs: the biggest diff of the options here; route-scoped store providers are a pattern the app doesn't use yet (all current stores are `providedIn: 'root'` — a root-provided session would need an explicit `reset()` discipline, which `startNewImport()` already half-is). Sequencing: makes CR4-1 §1's template options mostly moot (the CTA/step computeds land on the session).

## Option B — Reify the per-file lifecycle as one discriminated union

Narrower than A: keep state in the component, but replace the boolean/nullable soup that the commit path branches on with a single per-file state signal, e.g. `'selecting' | 'mapping' | 'parsing' | 'ready' | 'committing' | 'committed' | 'failed-account' | 'header-mismatch'`. `parsing()`, `committing()`, `parseError()` etc. become derivations of one source instead of independent axes that can disagree.

- The auto-commit effect's condition collapses from four signals + a guard field to "state became `ready` while batch mode is armed" — and the double-commit guard becomes structural (the transition `ready → committing` can only fire once) rather than a remembered index.
- Trade-offs: a genuine design exercise (getting the union right around the *existing* `ParseState` union without duplicating it); the queue/draft/batch-mapping state stays componentized, so this fixes the scariest interaction but not the component's overall size. A is a superset of B; B is the right scope if the appetite is one focused correctness refactor.

## Option C — Move commit orchestration down into the data layer

Smallest structural option: leave the wizard's signals alone and extract only `runCommit()`'s middle — resolve-pending-account (`resolveAccountId` + `earliestBalanceSeed`), profile rewrite from placeholder id, conditional profile upsert, `commitImport` call, batch-mapping metadata stripping — into a service beside `ImportService`/`ImportBatchesStore` (e.g. a `commitQueuedFile(row, mapResult, drafts, options)` returning a typed result the component applies to its signals).

- Wins: the placeholder-id (-1) rewrite and the "strip `defaultAccountId`/`headerSignature` before batch reuse" rules — currently comment-guarded inline code — become unit-tested pure-ish logic against fake-indexeddb. The component keeps UI sequencing only.
- Trade-offs: the auto-commit effect and its guard field stay in the component untouched, so the hardest-to-reason-about *reactive* part is not improved — only the hardest-to-get-wrong *data* part. Honest framing: C is a de-risking move, not a fix for the finding.

## Option D — Tame only the auto-commit trigger

If the effect is the specific fear: replace the ambient `effect()` with an explicit subscription on the parse pipeline itself (the `switchMap` chain already emits `done` states; auto-commit can be a `filter + exhaustMap` continuation of that stream when batch mode is armed). `exhaustMap` gives the single-flight guarantee the `autoCommittedFileIndex` field currently hand-rolls.

- Trade-offs: swaps a signals idiom for an RxJS idiom in a codebase that has been deliberately signal-first — consistency cost is real. Only attractive if neither A nor B happens.

## Sequencing and interactions

- **Do this together with CR4-4** (import-map-step split): same feature, same churn ridge, overlapping types — two separate passes over the import feature would each pay the full regression-verification cost. The natural order is CR4-4's type extraction first (mechanical), then whichever of A/B/C is chosen (behavioral), then CR4-1 §1's template cleanup *only if* A wasn't chosen.
- Whatever the option, the existing wizard behavior worth pinning with specs *before* refactoring: one commit per file under batch auto-advance; header mismatch pauses the batch; a failed account creation stops that file and its linked drafts; undo removes exactly one batch. Those four sentences are the regression suite this flow has never had at the flow level.
