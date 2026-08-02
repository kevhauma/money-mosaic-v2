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

- [ ] The Learning header renders the model-status badge in `[actions]`; component spec asserts the badge
      text and colour for each of `ready` / `stale` / `training` / `not-enough-data` / default.
- [ ] In the `training` state the header badge shows the live epoch counter and spinner; component spec
      asserts it updates as `trainingProgress()` changes.
- [ ] The status label and colour come from a single derivation shared with `model-status`; unit test on
      the shared helper covering every state, with no duplicated mapping in the page component.
- [ ] The body still renders the full status sentence for every state; existing `model-status` specs pass
      unchanged.
- [ ] The training control and training-window picker still render in the body and still work; existing
      TICKET-ML-10/ML-17 specs pass unchanged.
- [ ] No subtitle renders on `/learning`; component spec asserts absence.
- [ ] No persistence changes, no Dexie version bump — the model, its training window and its stored
      artefacts are untouched.
- [ ] `angular.json` bundle budgets not raised — no ML code moves into an eagerly-loaded path.
- [ ] Verified via the `fallow` skill and the `coding-conventions` skill.
- [ ] Verified live in the browser: the header badge reads the real state, and starting a training run
      updates it live.

## Notes

- The report asked for "learning page: status" in the header — read as the *state*, not the whole status
  panel. The panel's detail is genuinely page content; only its verdict is chrome.
- The tempting shortcut — reading `categoryModelStore.status()` directly in the page component and
  re-writing the label/colour switch — is exactly what the shared-derivation criterion exists to prevent;
  two copies would drift the first time a state is added.
- The `training` state is the one that justifies more than a word in the header: a bare "Training" badge
  gives no sense of progress, and the epoch counter already exists.
