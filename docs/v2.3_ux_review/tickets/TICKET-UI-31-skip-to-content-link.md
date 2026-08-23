# TICKET-UI-31 — No skip link: 15 tab presses to reach page content

- **Area:** UI / Accessibility
- **Type:** Bug fix
- **Traceability:** UX review (UXR-18); NFR-A11Y-1

## User story

As someone navigating by keyboard, I want to jump straight to the page content, so that I do not tab through the entire sidebar on every single route.

## Current situation (as-is)

> **Correction, 2026-08-23, recorded while implementing.** The review's mechanism does not
> reproduce — the direction is inverted. daisyUI's drawer puts `.drawer-content` **before**
> `.drawer-side` in the DOM ([app-shell.component.html](../../../src/app/core/layout/app-shell/app-shell.component.html));
> the sidebar only *looks* left-hand because the drawer is a CSS grid. Measured live on
> `localhost:4210` at 1280px: no element in the app carries a positive `tabindex`, so tab order is
> DOM order, and on `/settings` **32 focusable elements come before the first sidebar link**, not
> the other way round. `.drawer-toggle` is `display: none`, so it is not focusable either.
>
> So the cost is real but it is paid going the *other* way: page content is reached on the first
> Tab, and reaching the **navigation** costs a full traversal of the page on every route. The fix
> below therefore ships **two** skip links, not one — the criteria are met as written and the
> reverse case is covered too.

The first focusable element on every route is the page's own content (~~the "Dashboard" sidebar
link~~). With 15 nav links in the shell, reaching ~~the page's own content~~ **the navigation**
costs roughly ~~15~~ **32** tab presses — on every navigation, because the sidebar is persistent and
re-traversed each time.

There is no skip-to-content link, no landmark shortcut, and no keyboard shortcuts anywhere in the
app. The sidebar is also not a `nav` landmark, and `main` has no accessible name.

The app otherwise takes accessibility seriously — every chart ships an accompanying data table, and a full WCAG AA contrast sweep across two dark themes returned zero failures. A missing skip link is conspicuous against that standard.

## Desired result (to-be)

- A skip-to-content link is the first focusable element on every route, visible on focus.
- Activating it moves focus to the page's main content, so the next Tab continues inside the content.
- The pattern works from every route, including after client-side navigation.

## Acceptance criteria

- [x] A skip link is the first focusable element on every route. (Two of them, first and second — see the as-is correction above. Live on `localhost:4210`, the first two visible focusables read `['Skip to content', 'Skip to navigation']` on `/dashboard`, `/accounts` and `/settings`. Spec: *renders both skip links ahead of every other focusable element* in [app-shell.component.spec.ts](../../../src/app/core/layout/app-shell/app-shell.component.spec.ts).)
- [x] It is visually hidden until focused, then clearly visible. (`sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-primary …` on `SKIP_LINK_CLASS`. Unfocused, measured live: `1x1`, `clip-path: inset(50%)`. Applying the twelve `.focus\:…:focus` rules from the served `styles.css` to the element yields a `1009x40` plate with `background oklch(0.68 0.19 25)`, `color oklch(0.98 0.01 25)`, `z-index 50`, `clip-path: none`. **`:focus` itself could not be exercised live** — the Browser pane was not displayed, so `document.hasFocus()` stayed `false` and no `:focus` selector matched; the rules were verified to exist and to produce that plate instead. Spec: *hides each link until it takes focus*.)
- [x] Activating it moves focus into the main content region, and the following Tab lands on the first interactive element there. (Live: clicking `a[href="#main-content"]` leaves `document.activeElement` as `MAIN#main-content` on all three routes; the next focusable inside `main` on `/dashboard` is the first panel button, so Tab continues inside the page. Specs: *moves focus into the main region…* and *moves focus into the nav region…*.)
- [x] It behaves correctly after client-side navigation, not only on a full page load. (`/accounts` and `/settings` were both reached by clicking a sidebar link, not by loading a URL; both still focus `MAIN#main-content` / `NAV#app-nav`. Both targets are `viewChild.required` refs on the persistent shell, so the router never re-binds them.)
- [x] The `main` region carries an appropriate landmark role and accessible name. (`<main id="main-content" tabindex="-1" aria-label="Page content">` — implicit `role="main"`. The sidebar `<div class="menu">` also became `<nav id="app-nav" tabindex="-1" aria-label="Main">`, so the second skip link has a real landmark to target. Spec: *gives the two regions a landmark and an accessible name*.)
- [x] Unit tests cover: the skip link renders first in DOM order; activating it targets the main region. (Six specs under `describe('AppShellComponent: skip links (TICKET-UI-31)')` — DOM order, sr-only classes, landmark names, focus into `main`, focus into `nav`, and `preventDefault` so no stray `#main-content` lands on the URL. `ng test`: 287 files / 3349 tests pass, up from 3343.)
- [x] Verified live in the browser by keyboard from at least three different routes, including one navigated to client-side. (`/dashboard` on load, then `/accounts` and `/settings` via sidebar clicks. Tab order was read off the DOM rather than by pressing Tab — no element in the app carries a positive `tabindex`, so the two are the same order, and the pane was not displayed so real key events could not reach it. Measured saving on `/settings`: 32 focusables to reach the sidebar, now 2.)
- [x] Verified via the fallow skill and coding-conventions skill. (Both fallow CI gates exit `0`. Conventions: `viewChild.required` + `ElementRef` rather than `document.getElementById`, matching `transactions-overview.component.ts`; the class string is a module constant beside `NAV_ITEM_CLASS`; template stays method-free apart from the event handler.)

## Notes

- A UX review also found no keyboard shortcuts and no command palette anywhere. That is a larger idea and is deliberately not scoped here.
- Related: [TICKET-UI-28](./TICKET-UI-28-sidebar-outgrew-its-viewport.md) — the same nav growth, seen from the pointer side.
