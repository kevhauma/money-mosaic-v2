# TICKET-PUB-02 — How-to guides for using the app

- **Area:** Public / Onboarding
- **Type:** Feature
- **Traceability:** new capability from [v9999_ideas/requirements.md](../../v9999_ideas/requirements.md) ("Public Ready" — how-to's for using the app); no existing FR-* covers this

## User story

As a new user, I want step-by-step how-to guides for the app's main workflows, so I can figure out how to import my bank statement, set up categorization rules, and link transfers without guessing.

## Description

The app has no in-app help content today — a new user has to figure out CSV import, category rules, and transfer matching entirely from the UI itself. This ticket adds a small set of static how-to guides covering the core workflows, reachable from within the app.

## Current situation (as-is)

- No help/guide content exists anywhere in the app — no `feature-help`, no markdown-rendered docs, nothing in the nav pointing at explanatory content.
- The workflows that most need explaining are non-obvious multi-step features already built: CSV import + bank presets + column mapping (`feature-import/`), category rules (`feature-categories/`'s rules), and transfer linking/matching (`feature-transactions/`'s transfer review) — these are the natural first three guides, not an exhaustive list of every feature.
- `docs/v1.0_foundation/finance-app-spec.md` and the per-version `overview.md`/ticket files are developer-facing specs, not user-facing help copy — this ticket writes new, separate user-facing content, it does not repurpose those docs directly.

## Desired result (to-be)

- A new `feature-help/` (or a `guides` sub-route under `feature-home`/a shared public-content area — implementation's call once PUB-01/PUB-03 exist to see what shape fits best) renders a How-to's index page listing available guides, each a short static page (title, numbered steps, screenshots optional for v1 — text-only steps are acceptable to start) with a "Try it" link into the relevant real route (e.g. the import guide links to `/import`).
- Initial guide set: **"Importing a bank statement"** (CSV upload → bank preset/column mapping → preview → confirm), **"Setting up categorization rules"** (creating a rule, conditions, priority, how `categoryManual` protects manually-set categories from being overwritten), **"Reviewing and linking transfers"** (how auto-matching works, manually confirming/rejecting a match). Additional guides are a natural follow-up, not blocking this ticket.
- Guides are reachable from the app's nav, and from the landing page (TICKET-PUB-01) once that exists.
- Content is static (hand-written markdown or component templates checked into the repo), not dynamically generated — no CMS, no runtime content-fetching (consistent with the app having no backend at all).

## Acceptance criteria

- [ ] `feature-help/` (or agreed equivalent location) created following the standard feature-folder shape, lazy-loaded.
- [ ] A How-to's index page lists all available guides with titles/short descriptions.
- [ ] At least the three initial guides (import, categorization rules, transfer linking) exist as individual pages with accurate, current steps matching the actual UI flow.
- [ ] Each guide includes a "Try it" link into the real route the guide describes.
- [ ] How-to's is reachable from the app's nav (Above settings nav).
- [ ] Content renders as static, checked-in markdown/template content — no runtime fetch, no external CMS dependency.
- [ ] Add "keep guides up to date" to ticket worker.
- [ ] Unit tests cover: the guides index rendering the expected list; routing to an individual guide page.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: open the How-to's index, open each of the three initial guides, follow a "Try it" link and confirm it lands on the correct real route.

## Notes

- Independent of every other v2 ticket technically, though it reads naturally alongside TICKET-PUB-03 (FAQ) since both are static-content pages likely sharing a similar page template/layout — building them back-to-back (either order) keeps that shared layout consistent, but neither blocks the other.
- Guide content will drift as features change (e.g. if the import wizard's steps change in a future ticket) — there's no automated way to keep prose guides in sync with UI changes; treat "update the relevant how-to guide" as a normal review-checklist item for future tickets that meaningfully change one of the guided workflows, similar in spirit to how TICKET-CHG-01 hooks a changelog-update step into the ticket workflow.
