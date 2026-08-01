# TICKET-PUB-08 — First visit to the Income page: intro, quick setup, hand-off to settings

- **Area:** Public / Onboarding
- **Type:** Feature
- **Traceability:** extends TICKET-PUB-02 / TICKET-PUB-07 (how-to guides)

## User story

As a first-time user, I want my first visit to the Income page to explain what the page is and what I need
to set up, then send me straight to the settings page where each option is explained — so I'm walked from
"what is this" to a configured page in one path, instead of landing on empty charts and going looking.

## Description

The mechanism behind TICKET-PUB-07's content: on a user's first visit, `/income` opens on a short intro —
what the page is, and the three-step quick setup — with a primary action that takes them to
`/income/settings`, where PUB-07's detailed explanations are waiting. Seen once, remembered, never in the
way again.

## Current situation (as-is)

- Guides are reachable only at `/help` and `/help/:slug`
  ([help.routes.ts](../../../src/app/feature-help/help.routes.ts)); nothing in the app pushes one at the
  user, and no feature page links to its own guide.
- [guide-detail.component.ts](../../../src/app/feature-help/components/guide-detail/guide-detail.component.ts)
  renders a guide's `steps` for the `:slug` route. That rendering is bound to the route — there is no
  reusable "render these steps" component another page could mount.
- Nothing in `AppSettings` ([app-db.ts](../../../src/app/core/data-access/app-db.ts)) records what the user
  has seen or dismissed. Every existing dismiss in the app (the income step-change callouts, the dashboard
  notices) is per-visit component state, deliberately unpersisted — so there is no precedent for
  "shown once, ever".
- A first-time user's actual path today: land on `/income`, see either empty charts or an empty state
  naming a settings popup, and either find `/help` on their own or give up.

## Desired result (to-be)

- New optional `AppSettings` field `seenGuideSlugs: string[] | undefined` — additive, non-indexed, **no
  Dexie version bump** (same reasoning as `smoothedBonusCategoryIds`), with an
  `AppSettingsRepository.markGuideSeen(slug)` read-merge-put setter plus an `AppSettingsStore` signal and
  method. Keyed by slug rather than a boolean per feature, so v1.7's Loan tracker reuses the mechanism
  instead of adding a field of its own.
- Guide step rendering is extracted from `GuideDetailComponent` into a presentational `GuideStepsComponent`
  (`steps` input, no route knowledge), exported from `@/feature-help`'s barrel and used by both surfaces —
  one implementation, so the intro and `/help/:slug` cannot drift.
- **Step 1 — arrival.** When `getting-started-with-the-income-page` is not in `seenGuideSlugs`, `/income`
  renders an intro *instead of* the charts:
  - the guide's `title` and `summary` — what this page is for;
  - its **first three steps** (`steps.slice(0, 3)`) via `GuideStepsComponent` — the quick setup path;
  - a primary action **"Set up the Income page"** → marks the guide seen and navigates to
    `/income/settings`;
  - a secondary **"Skip for now"** → marks it seen and reveals the page as-is;
  - a quiet link to the full guide at `/help/getting-started-with-the-income-page`.
  Both actions write the same thing: whichever way the user leaves the intro, they are never asked again.
- **Step 2 — hand-off.** Arriving at `/income/settings` from the intro, a one-line banner at the top says
  what to do here and offers **"Back to Income"** when they're done. It is driven by a
  `?from=setup` query param, so it appears only on the onboarding path and never for a returning user
  editing a setting. The per-control explanations themselves are always present (TICKET-PUB-07 /
  TICKET-INC-18) — the banner only frames them.
- **Afterwards.** The page renders normally, with a small "Guide" link in the header pointing at
  `/help/getting-started-with-the-income-page`. The guide is never unreachable, it just stops interrupting.
- The intro shows **regardless of whether the user has data** — an empty Income page is precisely the state
  it explains, so it takes precedence over the "No income categories are counted yet" empty state.
- Nothing changes for a user whose `seenGuideSlugs` already contains the slug.

## Acceptance criteria

- [ ] `seenGuideSlugs` added to `AppSettings` and `DEFAULT_APP_SETTINGS` as `undefined`; **no** new
      `.version(n)` block and no edit to a shipped one.
- [ ] `markGuideSeen(slug)` appends without duplicating and without clobbering other `appSettings` fields;
      repository spec covers marking twice and marking a second slug.
- [ ] The value round-trips through data-management export → import intact (the same spec the other
      non-indexed `appSettings` fields are asserted in).
- [ ] `GuideStepsComponent` renders a `steps` array with no route dependency, and `GuideDetailComponent`
      uses it — `guide-detail.component.spec.ts`'s existing assertions still pass through it.
- [ ] `/income` renders the intro when the slug is absent from `seenGuideSlugs` and the normal page when
      it's present; component spec covers both, including that the charts are **not** rendered behind the
      intro.
- [ ] The intro shows the guide's title, summary and exactly its first three steps — not the whole guide;
      component spec asserts the step count and that the fourth step's title is absent.
- [ ] "Set up the Income page" marks the guide seen **and** navigates to `/income/settings?from=setup`;
      component spec asserts both the store call and the navigation target.
- [ ] "Skip for now" marks the guide seen and reveals the page without navigating; component spec asserts
      the store call and the resulting render.
- [ ] `/income/settings?from=setup` shows the hand-off banner with a "Back to Income" link, and
      `/income/settings` without the param does not; component spec asserts both.
- [ ] The intro takes precedence over the empty state — a user with no transactions at all sees the intro,
      not "No income categories are counted yet"; component spec asserts it.
- [ ] After dismissal, a "Guide" link in the page header points at
      `/help/getting-started-with-the-income-page`; component spec asserts the `routerLink`.
- [ ] All text is read from `GUIDES` by slug — no copy of the steps lives in `feature-income`; spec asserts
      the rendered text comes from the data file (e.g. by matching the guide's own first step title).
- [ ] A missing slug in `GUIDES` degrades to rendering the normal page rather than an empty intro or a
      crash; unit test.
- [ ] The intro is keyboard-reachable, focus lands on it when it renders, and it is announced as a region
      with the guide's title — it is the first thing on the page, so it must be first in the tab order too.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified via the `fallow` skill and the `coding-conventions` skill.
- [ ] Verified live in the browser: a fresh profile opens `/income` onto the intro; "Set up the Income page"
      lands on the settings page with its banner and explanations; "Back to Income" returns; a reload never
      brings the intro back; the header link still opens the full guide.

## Notes

- The two-step shape (intro → settings) is the whole point: the intro stays short because the detail is
  waiting where the user will actually be looking at the control. Putting all seven guide steps on arrival
  would be a wall of text in front of a page they haven't seen yet.
- `?from=setup` rather than a persisted "onboarding in progress" flag: the state lives for one navigation,
  so a param is honest about its lifetime and needs no cleanup. A user who bookmarks it sees one extra
  banner, which is harmless.
- Deliberately **not** a tour, a spotlight overlay or a multi-step wizard: one screen to read or dismiss,
  plus one hand-off, with no interaction choreography to maintain against a page that keeps changing.
- `seenGuideSlugs` is a persisted list, not a general "dismissed notices" store — the income
  step-change/event surfaces stay deliberately unpersisted (see TICKET-INC-17).
- Depends on TICKET-PUB-07 (all content) and TICKET-INC-18 (the settings page it hands off to), so it ships
  last in this version's batch.
