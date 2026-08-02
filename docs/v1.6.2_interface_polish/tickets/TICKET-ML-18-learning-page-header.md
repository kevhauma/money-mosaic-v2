# TICKET-ML-18 — Learning header: the model's status, in the header

- **Area:** Learning
- **Type:** Refactor
- **Traceability:** revises TICKET-ML-10/ML-12 presentation (FR-CAT-8 auto-categoriser), needs [TICKET-UI-22](./TICKET-UI-22-page-header-contract.md)

## User story

As a user, I want the auto-categoriser's state — trained, stale, training, not enough data — visible in
the Learning page's header, so I can tell at a glance whether the suggestions below are worth reading.

## Description

The page's single most important fact is the model's status, and it currently arrives as a full-width
alert banner below the header, ahead of a long sentence of detail. This ticket puts the status itself in
the header and leaves the detail where it is.

## Current situation (as-is)

- [learning-overview.component.html](../../../src/app/feature-learning/components/learning-overview/learning-overview.component.html)
  renders a `mm-page-header` with a title, the subtitle `"Everything the auto-categoriser knows: its
  trained status, suggestions, and proposed rules."` and **no actions at all**, then three body sections:
  `<app-model-status />`, "Rule proposals", "Suggestions".
- [model-status.component.html](../../../src/app/feature-learning/components/model-status/model-status.component.html)
  opens with a full-width `mm-alert` whose colour comes from `alertStatus()` and which contains a
  `mm-badge` (`statusLabel()`, `badgeColor()`) plus a per-state sentence: last-trained timestamp and
  accuracy when `ready`, a labelled/category count when `not-enough-data`, live
  `epoch x/y · loss · accuracy` progress with a spinner when `training`.
- Below that alert the same component renders a second `mm-paper` strip with the training-window picker
  and the training control.
- So the page is: title · subtitle · status alert · training strip · two sections. The status is the
  thing the page exists to report and it's the third row down.

## Desired result (to-be)

- **The status badge moves into the header's `[actions]` slot** — the `mm-badge` with its
  `statusLabel()`/`badgeColor()`, exactly as it renders today, so the state is readable from the top of
  the page. During training it carries the existing spinner and the epoch counter, since that's the one
  state where the label alone says nothing useful.
- **The detail sentence stays in the body**, in `model-status`, so the header carries the state and the
  body carries the explanation. The `mm-alert` may lose the badge it no longer needs to duplicate, but
  keeps its status colour and its sentence.
- **The status is derived in one place.** `statusLabel()`/`badgeColor()`/`alertStatus()` stay on
  `ModelStatusComponent`'s domain; the header reads the same `CategoryModelStore` signals rather than a
  second copy of the mapping — extract the mapping to a pure helper beside the component if the header
  can't reuse the existing one.
- **The training control and training-window picker stay in the body.** They're page controls, but they
  belong with the status detail they act on, and moving a stateful "Train now" button plus a five-option
  window picker into the header would crowd it for no gain.
- **The subtitle is removed**, per [TICKET-UI-22](./TICKET-UI-22-page-header-contract.md).

## Acceptance criteria

**Implementation notes (2026-08-02):**

1. **The shared derivation is a feature-root module, and the badge is its own component.** The
   mapping moved out of `ModelStatusComponent` into
   [model-status-display.ts](../../../src/app/feature-learning/model-status-display.ts)
   (`statusLabelFor` / `statusCopyFor` / `alertStatusFor` / `badgeColorFor`), per the conventions'
   rule that vocabulary shared by more than one component lives in a plain module in the feature
   root. The header renders
   [`app-model-status-badge`](../../../src/app/feature-learning/components/model-status-badge/model-status-badge.component.ts),
   which reads that module and the same `CategoryModelStore` signals — not a second copy of the
   mapping, which is what this ticket's own Notes warn against.
2. **The alert did drop its badge**, the option the to-be section left open, and keeps its status
   colour and per-state sentence. That made `statusLabel`/`badgeColor` computeds nothing rendered,
   so they are gone from `ModelStatusComponent` too — see the divergence on the criterion below.
3. **Per-state assertions live on the badge, not the page.** The real `CategoryModelStore` is
   worker-backed and needs an actually-trained model to reach `ready`/`stale`; faking it at page
   level would also mean faking it for `app-rule-proposals` and `app-suggestions-table`. On the
   badge, every state is one `status.set(...)` away.

- [x] The Learning header renders the model-status badge in `[actions]`; component spec asserts the badge
      text and colour for each of `ready` / `stale` / `training` / `not-enough-data` / default.
      (`model-status-badge.component.spec.ts` covers all six statuses across two `it.each` tables —
      the three that carry a verdict colour and the three that must carry none;
      `learning-overview.component.spec.ts` "renders the model-status badge in the header and the
      detail in the body" asserts the placement. Split per note 3.)
- [x] In the `training` state the header badge shows the live epoch counter and spinner; component spec
      asserts it updates as `trainingProgress()` changes. ("shows a spinner and a live epoch counter
      while training, updating as progress changes" moves 3/10 → 7/10 and asserts the old value is
      gone; two further cases cover before-the-first-epoch and after-training-ends.)
- [x] The status label and colour come from a single derivation shared with `model-status`; unit test on
      the shared helper covering every state, with no duplicated mapping in the page component.
      (`model-status-display.spec.ts`, four cases over an explicit `ALL_STATUSES` list — a status added
      to `CategoryModelStatus` and forgotten in a map fails there. `grep` finds one definition of each
      map, in `model-status-display.ts`.)
- [x] The body still renders the full status sentence for every state; ~~existing `model-status` specs
      pass unchanged~~ **three assertions moved rather than passing unchanged.** Every sentence,
      count and tone case is untouched and green, but `expect(component.statusLabel())` /
      `expect(component.badgeColor())` were dropped from three cases: the badge those computeds fed
      is in the header now, so keeping them would have meant keeping component computeds nothing
      renders — the dead surface TICKET-UI-22 argued against. They are covered on the shared helper
      instead, over all six statuses rather than three.
- [x] The training control and training-window picker still render in the body and still work; existing
      TICKET-ML-10/ML-17 specs pass unchanged. (Untouched in both template and class; the whole
      `feature-learning` suite is green at 48 cases.)
- [x] No subtitle renders on `/learning`; component spec asserts absence.
      (`learning-overview.component.spec.ts` "renders no subtitle on /learning".)
- [x] No persistence changes, no Dexie version bump — the model, its training window and its stored
      artefacts are untouched. (Diff adds two files under `feature-learning/`, and edits two templates
      and one component class.)
- [x] `angular.json` bundle budgets not raised — no ML code moves into an eagerly-loaded path. (The new
      badge sits inside the already-lazy `feature-learning` route and injects the same store the page
      already had; dev build reports no budget warnings.)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill. (Both pre-commit gate commands
      exit 0. `ng lint` initially caught a `type CategoryModelStatus` import left behind by note 2's
      deletion — fixed.)
- [x] Verified live in the browser: the header badge reads the real state, and starting a training run
      updates it live. (Dev server on :4210 — `/learning` reads title "Learning", no subtitle, header
      badge "Not trained" with no verdict colour, and the body still carries "Not trained yet." plus
      the Train control, with the duplicate badge gone. **The training state was not observed live**:
      the seeded dataset is below `MIN_TRAINING_LABELS`, so a run can't be started. The epoch counter
      and spinner are covered by the badge's own specs, which drive `trainingProgress()` directly.)

## Notes

- The report asked for "learning page: status" in the header — read as the *state*, not the whole status
  panel. The panel's detail is genuinely page content; only its verdict is chrome.
- The tempting shortcut — reading `categoryModelStore.status()` directly in the page component and
  re-writing the label/colour switch — is exactly what the shared-derivation criterion exists to prevent;
  two copies would drift the first time a state is added.
- The `training` state is the one that justifies more than a word in the header: a bare "Training" badge
  gives no sense of progress, and the epoch counter already exists.
