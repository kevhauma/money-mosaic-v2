# TICKET-ML-11 — `/learning` route, page shell, and nav entry

- **Area:** Auto-categorisation
- **Type:** Feature
- **Traceability:** adds FR-ML-11 (new)

## User story

As a user, I want a dedicated place in the app that shows everything about the auto-categoriser — its
trained status, its suggestions, and the rules it's proposed — so I don't have to piece it together from
three different pages.

## Description

Introduces a new `feature-learning` folder and a `/learning` route with an (initially empty) page shell,
wired into routing and the drawer nav. ML-12 (model status), ML-13 (suggestions table), and ML-14
(rule-proposal inbox) each mount their content into this shell independently once it lands.

## Current situation (as-is)

- [app.routes.ts](../../../src/app/app.routes.ts) is a flat array of six top-level `loadChildren` entries
  (`dashboard`, `accounts`, `transactions`, `import`, `categories`), each pointing at a per-feature
  `*.routes.ts`. All but `transactions` go through the feature's `@/feature-x` barrel; `transactions` is
  imported by direct relative path (lines 13-19) to dodge a circular import, per its inline comment.
- [app.html](../../../src/app/app.html) lines 31-65: the drawer nav `<ul>` has one `<li>` per top-level
  feature (Dashboard, Accounts, Transactions, Categories, Import), each an `<a routerLink>` with an
  `<ng-icon>` and label.
- [app.ts](../../../src/app/app.ts) lines 9-17, 49-58: registers every `tabler*` icon used in `app.html` via
  `provideIcons(...)` in the component's `viewProviders`.
- [feature-dashboard/dashboard.routes.ts](../../../src/app/feature-dashboard/dashboard.routes.ts) is the
  existing single-page-feature precedent: a one-entry `Routes` array using `loadComponent` (not nested
  `loadChildren`), plus route-level `providers` for a feature-specific DI need.
- No `feature-learning` folder or `/learning` route exists yet.

## Desired result (to-be)

- New `feature-learning/` folder mirroring `feature-dashboard`'s shallow single-page structure:
  - `feature-learning/learning.routes.ts` exporting `LEARNING_ROUTES: Routes` — a single `path: ''` entry,
    `loadComponent` → `LearningOverviewComponent`.
  - `feature-learning/index.ts` — barrel: `export * from './learning.routes'; export * from './components';`.
  - `feature-learning/components/learning-overview/learning-overview.component.{ts,html,spec.ts}` — a page
    shell using `mm-page-header` (title "Learning"), otherwise empty; ML-12/13/14 add their own components
    to its template and `imports` array.
  - `feature-learning/components/index.ts` — barrel for the folder's components.
- `app.routes.ts` gains a `{ path: 'learning', loadChildren: () => import('@/feature-learning').then((m) =>
  m.LEARNING_ROUTES) }` entry, inserted after the `'categories'` entry.
- `app.html`'s nav `<ul>` gains a new `<li>` for `/learning` (a `tabler*` icon, e.g. `tablerBulb` or
  `tablerSparkles`), inserted after the Categories `<li>` and before Import.
- `app.ts`'s `provideIcons(...)` call gains the new icon import + registration.

## Acceptance criteria

- [x] Navigating to `/learning` renders `LearningOverviewComponent` inside the router outlet.
- [x] The drawer nav shows a "Learning" link between Categories and Import, highlighted
      (`routerLinkActive="menu-active"`) when the route is active.
- [x] `feature-learning` follows the `feature-dashboard` shallow-route convention (`loadComponent`, not a
      nested `loadChildren`).
- [x] The new `app.routes.ts` entry imports via the `@/feature-learning` barrel unless doing so introduces a
      circular import (as `transactions` did) — verified by a clean `ng build --configuration development`
      (a cycle surfaces as a build error, not just a lint warning); fall back to the direct relative-path
      workaround, with the same explanatory comment style, only if the barrel import fails this check.
- [x] No component outside `feature-learning` imports from `feature-learning` — it's a leaf feature, like
      `feature-dashboard`.
- [x] Unit test for `LearningOverviewComponent` covers: it renders (smoke test) — ML-12/13/14 extend this
      spec, not replace it.
- [x] Verified live in the browser: clicking "Learning" in the nav navigates to `/learning` and shows the
      (currently empty) page shell with its header.
- [x] Verified via the fallow skill and coding-conventions skill.

## Notes

- Prerequisite for ML-12, ML-13, and ML-14 — none of them can mount content until this route/shell exists.
- From `docs/v1.2_auto_categorise/revision-and-feedback.md`'s UX proposal: "new route `/learning` or
  something similar."
