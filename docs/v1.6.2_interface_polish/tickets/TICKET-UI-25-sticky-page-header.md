# TICKET-UI-25 — The page header sticks to the top of the page

- **Area:** Shared UI
- **Type:** Feature
- **Traceability:** extends [TICKET-UI-22](./TICKET-UI-22-page-header-contract.md) (page header contract), revises `docs/v1.0_foundation/ui-layout-spec.md` §3

## User story

As a user, I want the page header to stay visible while I scroll, so the page's own controls — its
date range, its view switch, its create button — are reachable from anywhere on a long page instead
of only from the top of it.

## Description

Makes `mm-page-header`'s bar `sticky top-0`, so the one row that holds every page-level control stops
scrolling out of reach on the pages that are long enough for it to matter.

## Current situation (as-is)

- [page-header.component.html](../../../src/app/shared/ui/page-header/page-header.component.html)
  renders a daisyUI `navbar` bar, full-bleed across the content area via negative margins that cancel
  the shell main's padding (TICKET-UI-22). It is in normal flow and scrolls away with the page.
- **The pages that most need it are the longest ones.** `/income` is the page
  [TICKET-INC-22](./TICKET-INC-22-income-page-shorter-scroll.md) exists to shorten; `/transactions`
  is a paginated table; `/dashboard` is a stack of panels. On all three, the header's controls are
  off-screen for most of the time the user spends on the page.
- The shell's own bar
  ([app-shell.component.html](../../../src/app/core/layout/app-shell/app-shell.component.html)) is
  mobile-only chrome since TICKET-UI-23 and is also not sticky, so on a phone both bars scroll away.
- The sidebar (`drawer-side`) is already permanently visible from `lg:`, so the app already has a
  fixed frame on desktop — the header is the one part of it that moves.

## Desired result (to-be)

- **The header bar is `sticky top-0`** with a `z-index` above the page content and below any overlay
  (`mm-modal`, the transaction slide-over, `mm-dropdown` menus), so nothing that opens over the page
  ends up behind it.
- **It keeps its own background.** The bar is already `bg-base-100` against a `bg-base-200` page, so
  content scrolling under it is hidden rather than showing through — confirm this against every theme
  while building, since a theme that makes the bar translucent would break it.
- **On mobile it sticks below the shell's bar, not over it.** Either the shell's bar becomes sticky
  too and the header offsets by its height, or the shell's bar stays in flow and the header sticks to
  `top-0` of the scroll container — pick whichever the drawer layout actually supports and record the
  choice in the primitive's doc comment.
- **No layout shift when it engages.** The bar keeps its current height and margins; sticking must not
  change the space it occupies or the page will jump the moment it detaches.
- **Every page benefits automatically** — this is one change in the primitive, not per page.

## Acceptance criteria

- [ ] `mm-page-header`'s bar carries `sticky top-0` and an explicit `z-index`; component spec asserts
      the classes survive, so a later utility reshuffle can't silently drop them.
- [ ] The header stays visible after scrolling to the bottom of a long page; verified live on
      `/transactions`, `/income` and `/dashboard`.
- [ ] An open `mm-modal`, the transaction quick-edit slide-over, and an `mm-dropdown` menu all render
      **above** the sticky header, not behind it; verified live on `/transactions` (row slide-over)
      and `/accounts` (Add account modal).
- [ ] Page content scrolling under the bar is not visible through it in any shipped theme; checked
      against every theme in the picker, and any theme that sets a translucent header surface is fixed
      or explicitly excluded with a note.
- [ ] Engaging the sticky state causes no layout shift — the page does not jump when the header
      detaches; verified live.
- [ ] On a 375px viewport the header sticks without covering the shell's mobile bar or the first row
      of content; verified live.
- [ ] No persistence changes, no Dexie version bump.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified via the `fallow` skill and the `coding-conventions` skill.

## Notes

- **The z-index is the whole risk.** The app has three overlay families (modal, slide-over, dropdown)
  and daisyUI assigns each its own stacking; a header that outranks any of them is worse than a header
  that scrolls. Check all three rather than only the one that's easy to open.
- Deliberately **not** a `position: fixed` header with a padded page: sticky keeps the bar inside the
  content column, which is what makes its full-bleed negative margins (TICKET-UI-22) keep working.
- Pairs with [TICKET-UI-24](./TICKET-UI-24-header-start-and-end-action-sections.md) — the same bar. A
  sticky header is also what makes UI-24's start section worth having, since a scope control you can
  always see is one you can always change.
