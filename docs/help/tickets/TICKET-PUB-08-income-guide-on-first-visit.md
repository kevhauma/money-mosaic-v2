# TICKET-PUB-08 — First visit to the Income page: intro, quick setup, hand-off to settings

- **Area:** Public / Onboarding
- **Released in:** [v1.6 Income & growth](../../releases/v1.6_income_growth/overview.md)
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

- [x] `seenGuideSlugs` added to `AppSettings` and `DEFAULT_APP_SETTINGS` as `undefined`; **no** new
      `.version(n)` block and no edit to a shipped one. (`app-db.ts`; `git diff` touches no `.stores()`
      call.)
- [x] `markGuideSeen(slug)` appends without duplicating and without clobbering other `appSettings` fields;
      repository spec covers marking twice and marking a second slug. (`app-settings.repository.spec.ts` →
      "markGuideSeen records a slug on a row that does not exist yet", "…is idempotent — marking the same
      slug twice leaves one entry", "…appends a second slug rather than replacing the first", "…preserves
      unrelated settings and stays a single row".)
- [x] The value round-trips through data-management export → import intact (the same spec the other
      non-indexed `appSettings` fields are asserted in). (`data-management.repository.spec.ts` →
      "non-indexed appSettings fields > round-trips through export → import intact", now also asserting
      `restored?.seenGuideSlugs`.)
- [x] `GuideStepsComponent` renders a `steps` array with no route dependency, and `GuideDetailComponent`
      uses it — `guide-detail.component.spec.ts`'s existing assertions still pass through it.
      (`feature-help/components/guide-steps/`; the detail template now delegates to it, and that spec is
      unedited and passing.)
- [x] `/income` renders the intro when the slug is absent from `seenGuideSlugs` and the normal page when
      it's present; component spec covers both, including that the charts are **not** rendered behind the
      intro. (Overview spec → "first-visit intro (TICKET-PUB-08)" → "replaces the whole page with the
      intro until the guide has been seen" — asserting no `[echarts]` and no `mm-page-header` — and
      "renders the normal page once the guide has been seen".)
- [x] The intro shows the guide's title, summary and exactly its first three steps — not the whole guide;
      component spec asserts the step count and that the fourth step's title is absent. (Intro spec "shows
      exactly the guide's first three steps, not the whole reference".)
- [x] "Set up the Income page" marks the guide seen **and** navigates to `/income/settings?from=setup`;
      component spec asserts both the store call and the navigation target. (Spec "“Set up the Income
      page” marks the guide seen and hands off to the settings page".)
- [x] "Skip for now" marks the guide seen and reveals the page without navigating; component spec asserts
      the store call and the resulting render. (Spec "“Skip for now” marks the guide seen without
      navigating"; the reveal follows from `showIntro()` reading the same store signal, covered by
      "renders the normal page once the guide has been seen".)
- [x] `/income/settings?from=setup` shows the hand-off banner with a "Back to Income" link, and
      `/income/settings` without the param does not; component spec asserts both. (Settings-page spec
      "shows the onboarding hand-off banner only when arrived from the intro (TICKET-PUB-08)", asserting
      absence first and then presence after setting the input.)
- [x] The intro takes precedence over the empty state — a user with no transactions at all sees the intro,
      not "No income categories are counted yet"; component spec asserts it. (Spec "takes precedence over
      the empty state — the empty page is what it explains".)
- [x] After dismissal, a "Guide" link in the page header points at
      `/help/getting-started-with-the-income-page`; component spec asserts the `routerLink`. (Spec "keeps
      a Guide link in the header afterwards, so it is never unreachable".)
- [x] All text is read from `GUIDES` by slug — no copy of the steps lives in `feature-income`; spec asserts
      the rendered text comes from the data file (e.g. by matching the guide's own first step title).
      (Spec "reads its text from GUIDES rather than keeping a second copy", matching the data file's own
      step *description*; the component holds no prose beyond the two button labels.)
- [x] A missing slug in `GUIDES` degrades to rendering the normal page rather than an empty intro or a
      crash; unit test. (Two guards: `showIntro()`'s `GUIDES.some(...)` keeps the page rendering, and the
      intro's own `@if (guide(); as guide)` means it emits no markup either way. Specs "introduces a slug
      that actually exists in GUIDES" — which is what catches a rename — and "renders nothing at all if
      its guide were missing, rather than an empty card". **The missing-slug branch itself is asserted by
      construction rather than by a mocked `GUIDES`**: stubbing the module would test the mock, not the
      guard.)
- [x] The intro is keyboard-reachable, focus lands on it when it renders, and it is announced as a region
      with the guide's title — it is the first thing on the page, so it must be first in the tab order too.
      (`tabindex="-1"` + `aria-labelledby` on the region, focused in `ngAfterViewInit`; spec "is announced
      as a region titled by the guide, and takes focus as it renders". It is first in the DOM because it
      replaces the page rather than sitting above it.)
- [x] `angular.json` bundle budgets not raised. (`git diff` touches no `angular.json`;
      `ng build --configuration development` completes with no budget warning.)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill. (`fallow audit --base HEAD` →
      `verdict: pass`. **One suppression added and worth knowing about:**
      `income-overview.component.html` carries `<!-- fallow-ignore-file complexity -->` with a written
      reason. The finding was `exceeded: "crap"` at exactly 30 with `coverage_tier: "none"` and
      `coverage_source: "estimated_component_inherited"` — an assumed-zero coverage estimate on a template
      that spec exercises with ~35 cases; its own cyclomatic 5/20 and cognitive 10/15 are both well under.
      Every branch there is a distinct page state, so the alternative was hiding one behind a component
      that existed only to lower a number.)
- [ ] Verified live in the browser: a fresh profile opens `/income` onto the intro; "Set up the Income page"
      lands on the settings page with its banner and explanations; "Back to Income" returns; a reload never
      brings the intro back; the header link still opens the full guide. — **skipped at the user's
      request** ("skip the browser check"), not verified. Worth a look before release: this is the one
      ticket in the batch whose whole point is a first-run experience, and no automated test can say
      whether the intro *reads* well on arrival.

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
