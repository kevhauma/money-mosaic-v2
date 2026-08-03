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

- [x] `mm-page-header`'s bar carries `sticky top-0` and an explicit `z-index`; component spec asserts
      the classes survive, so a later utility reshuffle can't silently drop them.
      (`page-header.component.html` — `mm-page-header-bar navbar sticky top-0 z-10 …`; spec case
      "keeps the bar sticky at the top, under the drawer and the overlays (TICKET-UI-25)" asserts
      `navbar`, `sticky`, `top-0` and `z-10` class by class.)
- [x] The header stays visible after scrolling to the bottom of a long page; verified live on
      `/transactions`, `/income` and `/dashboard`.
      (Dev server :4210, measured `getBoundingClientRect()` after scrolling to `scrollHeight`:
      `/transactions` at scrollY 2541 → bar top 0; `/income` at scrollY 624 → bar top 0;
      `/dashboard` at scrollY 1720 → bar top 0. On all three, `elementFromPoint` at the bar's own
      mid-height lands inside the bar, so content is passing under it rather than over it.)
- [x] An open `mm-modal`, the transaction quick-edit slide-over, and an `mm-dropdown` menu all render
      **above** the sticky header, not behind it; verified live on `/transactions` (row slide-over)
      and `/accounts` (Add account modal).
      (There is no slide-over: the transaction quick-edit is `transaction-edit-form`, an `mm-modal`
      — same overlay family as Add account, so the two named cases are one. `/accounts` with the Add
      account modal open: `elementFromPoint` at the header's coordinates lands inside the `<dialog>`,
      not the header. Dropdowns: every `.dropdown-content` in the app carries `z-10`, the same rung
      as the bar, and sits after it in DOM order, so it paints on top — confirmed by forcing one of
      `/categories`' row menus visible over the pinned bar and hit-testing it (`hitInDropdown: true`,
      `hitInHeader: false`). The menu had to be forced rather than clicked open: the Browser pane
      isn't displayed this session, so the document never takes focus and daisyUI's `:focus-within`
      dropdowns don't open on a real click.)
- [x] Page content scrolling under the bar is not visible through it in any shipped theme; checked
      against every theme in the picker, and any theme that sets a translucent header surface is fixed
      or explicitly excluded with a note.
      (All ten `data-theme` values swept live while scrolled: every one reports `position: sticky`,
      `z-index: 10`, an opaque computed `background-color`, and the bar hit-testing over the content
      beneath it. Two needed fixing rather than excluding — **cyberpunk**'s `.navbar` fill was
      `base-100` at 85%, and **liquid-glass**'s `base-100` carries 50% alpha by design; both now give
      `.mm-page-header-bar` an opaque fill and keep their `backdrop-filter` for the optical effect.)
- [x] Engaging the sticky state causes no layout shift — the page does not jump when the header
      detaches; verified live.
      (`body.scrollHeight` and the bar's own height are identical before and after pinning on all
      three long pages — 64px on `/transactions` and `/income`, 91px on `/dashboard`.)
- [x] On a 375px viewport the header sticks without covering the shell's mobile bar or the first row
      of content; verified live.
      (375×812: at rest on `/categories` the shell bar occupies 0–64 and the header 64–173, no
      overlap; on `/transactions` at scrollY 1200 the shell bar has scrolled to −1200 and the header
      is pinned at 0–64 with the document height unchanged.)
- [x] No persistence changes, no Dexie version bump.
      (Diff is one template, its spec and doc comment, three theme stylesheets and two docs — nothing
      under `core/data-access/`.)
- [x] `angular.json` bundle budgets not raised.
      (`angular.json` untouched; dev build reported no budget warnings.)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill.
      (`fallow audit --base HEAD` → verdict `pass`, 0 introduced findings across 8 changed files;
      `ng lint` + `ng test` (2175 tests) + dev build all green. The `coding-conventions` page-header
      bullet was updated in the same change with the sticky rule and the `.mm-page-header-bar` hook.)

## Notes

- **The z-index is the whole risk.** The app has three overlay families (modal, slide-over, dropdown)
  and daisyUI assigns each its own stacking; a header that outranks any of them is worse than a header
  that scrolls. Check all three rather than only the one that's easy to open.
- Deliberately **not** a `position: fixed` header with a padded page: sticky keeps the bar inside the
  content column, which is what makes its full-bleed negative margins (TICKET-UI-22) keep working.
- Pairs with [TICKET-UI-24](./TICKET-UI-24-header-start-and-end-action-sections.md) — the same bar. A
  sticky header is also what makes UI-24's start section worth having, since a scope control you can
  always see is one you can always change.
