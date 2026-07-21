# TICKET-PUB-01 — Public home/landing page

- **Area:** Public / Onboarding
- **Type:** Feature
- **Traceability:** new capability from [v9999_ideas/requirements.md](../../v9999_ideas/requirements.md) ("Public Ready" — home page with explanation, click through to dashboard); no existing FR-* covers this

## User story

As a first-time visitor, I want a home page that explains what the app does before I land in the middle of an empty dashboard, so I understand what I'm looking at and how to get started.

## Description

Today the app has no public-facing explanation of what it is — the root route redirects straight into the Dashboard, which is meaningless (and, on a first run, empty) without context. This ticket adds a landing page that explains the app and its local-first/no-backend model, with a clear call-to-action into the real app, shown to first-time visitors only so returning users aren't forced through it every visit.

## Current situation (as-is)

- [app.routes.ts:4](../../../src/app/app.routes.ts) redirects the root path straight to `dashboard`: `{ path: '', pathMatch: 'full', redirectTo: 'dashboard' }`. There is no landing/marketing/home page anywhere in the app.
- [app.html](../../../src/app/app.html) always renders the full drawer/sidebar app shell (nav, range switcher) around every routed page — a landing page rendered inside that shell would look like just another dashboard tab, not a distinct "before you're in the app" experience.
- No first-run/returning-visitor distinction exists anywhere in the app (no "hasVisited" flag, no onboarding-seen tracking).

## Desired result (to-be)

- A new `feature-home/` (`home.routes.ts`, `index.ts`, `components/home-landing/`) renders a standalone landing page **outside** the drawer/sidebar shell (its own full-page layout, not nested inside `app.html`'s `router-outlet` styling assumptions — e.g. a top-level route rendered before/alongside the shell rather than as a child of it, matching how a dedicated "app shell vs. marketing page" split is typically done: the shell wraps only the authenticated-app routes, the landing page is its own top-level component).
- The landing page explains, in plain language: what the app does (local-first personal finance: import bank CSVs, categorize, track transfers/net worth), and — critically — that it's **local-first with no backend**, data never leaves the browser (this point is expanded fully by TICKET-PUB-04, but a short mention belongs here too since it's a first-impression trust signal). A prominent call-to-action button ("Get started" / "Open dashboard") routes into `/dashboard`.
- `app.routes.ts`'s root path (`''`) serves this landing page **only for a visitor who hasn't seen it before**, tracked via a simple `localStorage` flag (e.g. `mm-has-visited`) set the moment the user clicks through (or reaches the Dashboard by any route) — a return visit (flag already set) redirects straight to `/dashboard` as it does today, so the landing page never gets in a regular user's way. `localStorage` (not `appSettings`/Dexie) is the deliberate choice here since this is a lightweight, non-financial UI-state flag, not app data that belongs in an export/import/backup.
- The landing page remains reachable at all times at an explicit route (e.g. `/home` or `/welcome`) for a returning user who wants to revisit it, linked from somewhere low-key (e.g. the app footer or Settings page) rather than the main nav.

## Acceptance criteria

- [x] `feature-home/` created following the standard feature-folder shape (`home.routes.ts`, `index.ts`, `components/`), lazy-loaded like every other feature.
- [x] Landing page renders outside the drawer/sidebar shell — verified visually distinct from every other routed page (no sidebar/nav chrome).
- [x] Landing page copy explains what the app does and mentions the local-first/no-backend data model.
- [x] A prominent call-to-action button navigates to `/dashboard`.
- [x] First visit to `/` renders the landing page; after reaching the Dashboard once (via the CTA or any other route), subsequent visits to `/` redirect straight to `/dashboard`, verified by inspecting the `mm-has-visited`-equivalent `localStorage` flag.
- [x] The landing page remains reachable at an explicit route even after the "seen it" flag is set, linked from a low-key location (footer or Settings), not the primary sidebar nav.
- [x] Unit tests cover: the root-route resolution logic choosing landing-page vs. dashboard-redirect based on the stored flag; the flag being set once the user reaches the dashboard.
- [x] Verified via the fallow skill and coding-conventions skill.
- [x] Verified live in the browser: clear `localStorage`, load `/`, confirm the landing page renders with no sidebar; click through to the dashboard; reload `/` and confirm it now redirects straight to `/dashboard`; navigate to the explicit landing-page route directly and confirm it still renders.

## Notes

- Independent of every other v2 ticket — no dependency on the Settings tickets, Data Management tickets, or the other PUB tickets. Safe to build any time, in parallel with the rest of this version.
- Deliberately keeps the "seen it" tracking in `localStorage` rather than `appSettings`/IndexedDB: it's ephemeral browser-local UI state, not data the user would expect to carry across a TICKET-DAT-01 export/import (a restored backup on a new browser should arguably show the landing page again, which `localStorage`'s natural per-browser scoping gives for free).
- This ticket only covers the landing page itself. Linking to How-to's (TICKET-PUB-02) and FAQ (TICKET-PUB-03) from the landing page is a nice-to-have once those exist, not a blocking dependency in either direction — add the links opportunistically if those tickets have already landed when this one is built, otherwise leave it to whichever of PUB-02/PUB-03 ships second to add the cross-link back.
