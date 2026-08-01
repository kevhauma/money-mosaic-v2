# TICKET-PUB-07 — Getting started with the Income page: the content

- **Area:** Public / Onboarding
- **Type:** Feature
- **Traceability:** extends TICKET-PUB-02 (how-to guides); documents FR-INC-1..14

## User story

As a first-time user opening the Income page, I want to be told what the page is for and what the two or
three things are that I have to set up, and then to find a real explanation waiting for me on the settings
page when I get there — so I understand what I'm configuring instead of ticking boxes whose effects I can't
see.

## Description

Writes all the onboarding copy for the Income page at **three depths**, from one source of truth: a short
"what this page is + quick setup" intro shown on arrival, the in-context explanations on the settings page
where each control actually lives, and the full reference guide at `/help`. This ticket is the content;
[TICKET-PUB-08](./TICKET-PUB-08-income-guide-on-first-visit.md) is the mechanism that puts the first depth
in front of the user and hands them off to the second.

## Current situation (as-is)

- [guides.ts](../../../src/app/feature-help/data/guides.ts) holds four static guides (TICKET-PUB-02),
  rendered at `/help` and `/help/:slug` by [help.routes.ts](../../../src/app/feature-help/help.routes.ts).
  Each is `{ slug, title, summary, steps[], tryItLabel, tryItRoute }` — hand-written, no CMS, no fetch.
- The one income guide, `reading-your-income-growth` (added 2026-08-01), **starts at "Choose what counts as
  your income"** — it assumes the reader already has transactions imported and categories with
  `kind: 'income'` assigned. For a first-time user that is exactly the state they don't have, and nothing
  in the guide says so.
- Nothing on `/income` explains what the page is for. The header subtitle ("How your income moves over
  time — by source, year over year, and against the noise") is a tagline, not an orientation.
- The Income page's empty state
  ([income-overview.component.html](../../../src/app/feature-income/components/income-overview/income-overview.component.html))
  reads "No income categories are counted yet" and names the settings popup — correct once income
  categories exist, and misleading when the real problem is that nothing has been imported or nothing is
  categorised as income yet. It links nowhere.
- [TICKET-INC-18](./TICKET-INC-18-income-settings-and-salary-pages.md) creates the room for the second
  depth — `/income/settings` as a real page with space per section — but that ticket's job is the container
  and a one-line statement of what each setting does. The first-timer explanation ("how do transactions
  even become income?") has no home today.
- Several statements in the existing guide go stale with this version's follow-up batch: the growth panel's
  "against the month before" (TICKET-INC-15), the take-home rate as its own chart (TICKET-INC-16's
  section), the dismissable notices above the chart (TICKET-INC-17), the bonus's effect
  (TICKET-INC-13/14), and the settings popup and salary modal themselves (TICKET-INC-18). `guides.ts`' own
  module doc requires the ticket that changes a flow to update the matching entry — this is where that debt
  is settled for the whole batch.

## Desired result (to-be)

**Content architecture — one source, three depths.** All step content lives in `GUIDES`. Nothing is
re-typed into a component template, so the three surfaces cannot drift.

1. **Arrival (short).** A new guide `getting-started-with-the-income-page`, whose `summary` answers "what
   is this page" in two sentences, and whose **first three steps are the quick setup path**, in the order
   the user must do them:
   1. *Get income transactions in* — import a statement, then make sure those transactions sit in a
      category whose kind is *income*; without that the page has nothing to read. Names the existing import
      and rules guides.
   2. *Tell the page when your career started* — so it covers your working life, not your import history.
   3. *Choose which categories count, and flag annual lump sums* — and why excluding a noisy "Other
      Income" changes every figure on the page at once.
   PUB-08 renders exactly these three plus the summary on arrival, then hands off to `/income/settings`.
2. **In context (detailed).** The per-section explanations on `/income/settings`, written for someone who
   has never done this: what "kind: income" means and where it's set, what happens to a category you
   untick (and what *doesn't* — transactions are never changed), what a career start date does to every
   panel, and what "annual lump sum" smoothing does and undoes. Same for `/income/salary`: why a bank
   export can never contain gross pay, and what the Bonus column changes. This is the copy INC-18 leaves
   room for; INC-18 ships the structure, this ticket ships the words.
3. **Reference (complete).** The rest of the same guide's steps, read at `/help/:slug`: adding gross wages,
   what each panel on the page answers once it's set up (monthly chart, growth cards, "Net vs gross"
   section, yearly view, events sidebar), and an "if it still looks empty" step naming the three real
   causes — no transactions in range, no income categories counted, career start date set after your data —
   with the fix for each.

- `reading-your-income-growth` is **refreshed in the same pass** and re-scoped as the "now read the numbers"
  companion, with a cross-reference in each guide's first step so neither reads as the other's duplicate.
- The Income page's empty state widens to name the no-transactions and no-income-categories cases, and
  links to `/income/settings`.
- Every step describes the UI **as it will actually be** after this version's follow-up batch — which is
  why this ticket builds second-to-last (see Notes).

## Acceptance criteria

- [ ] New `getting-started-with-the-income-page` entry in `GUIDES`, listed before
      `reading-your-income-growth`, rendering at its `/help/:slug` route and on the `/help` index — the
      existing guides-index/guide-detail specs stay data-driven and keep passing with no per-guide
      hardcoding.
- [ ] Its `summary` states what the page is for in plain language, and its **first three steps are exactly
      the quick-setup path** in the order above — a spec asserts the count and order, since PUB-08's
      arrival surface renders `steps.slice(0, 3)` and would silently change meaning if they were reordered.
- [ ] Step 1 names the prerequisites (imported transactions, a category with kind *income*) and points at
      the existing import and rules guides by title.
- [ ] A later step lists the three empty-page causes with a concrete fix for each.
- [ ] `/income/settings` carries first-timer explanations for all three sections, and `/income/salary` for
      gross and bonus — each naming which panels the setting changes and what it does *not* change;
      component specs assert the copy is present, so a later refactor can't quietly drop it.
- [ ] `reading-your-income-growth` is updated so no step contradicts the shipped UI: the growth comparison
      (INC-15), the "Net vs gross" section (INC-16), the events sidebar replacing dismissable notices
      (INC-17), the bonus's effect on the chart (INC-13) and on the take-home rate (INC-14), the gross
      colour setting (SET-08), and the settings/salary pages and one-month modal (INC-18).
- [ ] A spec asserts no guide step refers to a removed surface — at minimum, no guide text mentions
      dismissing a notice, "vs. previous month", or opening the settings *popup* / salary *modal*.
- [ ] The Income page's empty state covers the no-transactions and no-income-categories cases and links to
      `/income/settings`; component spec asserts the `routerLink`.
- [ ] Copy carries no hardcoded currency symbol, locale-shaped date or theme colour name — all user
      settings (SET-02/03/04, SET-08), so guide text describes controls, not values.
- [ ] Guide content stays static and hand-written in `guides.ts` — no new data source, no runtime fetch, no
      new route; consistent with TICKET-PUB-02. No step text is duplicated into a component template.
- [ ] No persistence changes, no Dexie version bump.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified via the `fallow` skill and the `coding-conventions` skill.
- [ ] Verified live in the browser: the guide reads correctly end to end against the real page, its "Try it"
      button lands on `/income`, the settings and salary pages carry their explanations, and the empty state
      links back.

## Notes

- **Build second-to-last in this version's follow-up batch.** Seven tickets ahead of it change the page's
  copy, layout and behaviour — including [TICKET-INC-18](./TICKET-INC-18-income-settings-and-salary-pages.md),
  which turns the settings popup and the salary modal into routed pages, so the steps must describe
  navigating to a page, not opening an overlay. Writing the guide first would mean writing it twice.
- The three-depth split is what keeps the arrival surface short: a user who has just landed needs to know
  what the page is and what to do next, not the whole reference. The detail waits on the settings page,
  where they will be looking at the actual control.
- Two guides rather than one long one: setup is a once-ever sequence with prerequisites, reading the
  numbers is something you come back to. Merging them would put the part a returning user wants behind five
  steps they already did.
- **Superseded 2026-08-01:** this ticket originally ruled a first-run surface out of scope (it would
  duplicate guide content into a second place to keep in step). The user asked for it directly, so it is
  now [TICKET-PUB-08](./TICKET-PUB-08-income-guide-on-first-visit.md), which answers the objection by
  rendering this ticket's `GUIDES` data through a shared component rather than a copy.
