# TICKET-PUB-09 — A help page's header carries the way back

- **Area:** Help
- **Type:** Feature
- **Traceability:** extends TICKET-PUB-02 (how-to guides) / TICKET-PUB-03 (FAQ), needs [TICKET-UI-24](./TICKET-UI-24-header-start-and-end-action-sections.md)

## User story

As a user reading a how-to guide, I want a visible way back to the guide list in the page header, so
I can work through several guides without relying on the browser's back button.

## Description

Gives `/help/:slug` and `/help/faq` a "Back to how-to's" link in `[actions-start]`, matching the
"Back to income" link the Income sub-pages already carry.

## Current situation (as-is)

- **Neither leaf help route offers a way back.**
  [guide-detail.component.html](../../../src/app/feature-help/components/guide-detail/guide-detail.component.html)
  renders `<mm-page-header [title]="guide.title" />` with no actions, and
  [faq-page.component.html](../../../src/app/feature-help/components/faq-page/faq-page.component.html)
  renders `<mm-page-header title="FAQ" />` the same way. The only navigation off either page is the
  guide's own "try it" button, which goes to the feature the guide describes — not back to the list.
- **The sidebar's "How-to's" entry is the sole route back**, and it is off-canvas below `lg:`
  ([app-shell.component.html](../../../src/app/core/layout/app-shell/app-shell.component.html)), so
  on a phone the user has to open the drawer or use the browser's back button.
- **The pattern already exists elsewhere.** `/income/settings` and `/income/salary` each render
  `<mm-button actions variant="ghost" size="sm" link="/income">Back to income</mm-button>`
  ([income-settings-page.component.html](../../../src/app/feature-income/components/income-settings-page/income-settings-page.component.html)),
  and account detail carries "Back to accounts"
  ([accounts-detail.component.html](../../../src/app/feature-accounts/components/accounts-detail/accounts-detail.component.html)).
  The help routes are the remaining leaf pages without it.
- The guide index itself ([guides-index.component.html](../../../src/app/feature-help/components/guides-index/guides-index.component.html))
  is a top-level nav destination, so it has no parent to go back to.

## Desired result (to-be)

- **`/help/:slug` and `/help/faq` each render a "Back to how-to's" link** as the first item of
  `[actions-start]`, `variant="ghost"` `size="sm"` with a left-chevron icon — the same weight and
  shape as the existing back links, since going back is a scope change rather than an action.
- **`/help` (the index) gets none** — it is a sidebar destination, not a child page.
- **The link is a `routerLink` to `/help`**, not a history `back()`: arriving at a guide from a
  deep link or from a feature page's "Guide" button must still land on the list, and history-back
  would send those users somewhere else.
- **Nothing else on either page changes** — the guide's summary paragraph, its steps, its "try it"
  button and the FAQ's collapse list all stay exactly as they are.
- **The guide-not-found empty state keeps its own link.** `guide-detail`'s `@else` branch already
  renders an `mm-empty-state`; if it has no route back to `/help`, add one there too so a bad slug
  isn't a dead end.

## Acceptance criteria

- [ ] `/help/:slug` renders a "Back to how-to's" link in `mm-page-header`'s `[actions-start]` slot,
      pointing at `/help`; component spec asserts the `href` and that it is in the start group.
- [ ] `/help/faq` renders the same link; component spec asserts it.
- [ ] `/help` (the index) renders no back link; component spec asserts absence.
- [ ] The link is a `routerLink`, not a `history.back()` call; spec asserts a real `href="/help"` so a
      deep-linked visitor lands on the list rather than wherever they came from.
- [ ] The guide-not-found empty state offers a route back to `/help`; component spec asserts it for an
      unknown slug.
- [ ] Both headers still render their own title and no subtitle (TICKET-UI-22); component specs assert
      the `h1` text and the absence of a caption.
- [ ] The header wraps rather than overflowing at 375px; component spec asserts the wrap binding.
- [ ] No persistence changes, no Dexie version bump — `seenGuideSlugs` is untouched.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified via the `fallow` skill and the `coding-conventions` skill.
- [ ] Verified live in the browser: open a guide from `/help`, click back, land on the list; open the
      same guide from a feature page's "Guide" button and confirm back still lands on `/help`.

## Notes

- **Copy matches the nav item, not the route.** The sidebar and the index page both call this section
  "How-to's", so the link says "Back to how-to's" — "Back to help" would name a route the user never
  sees.
- If [TICKET-UI-24](./TICKET-UI-24-header-start-and-end-action-sections.md) has not landed, this is
  still shippable into the current single `[actions]` slot — but then it wants redoing when UI-24
  does land, which is why it is sequenced after it.
