# TICKET-UI-31 — No skip link: 15 tab presses to reach page content

- **Area:** UI / Accessibility
- **Type:** Bug fix
- **Traceability:** UX review (UXR-18); NFR-A11Y-1

## User story

As someone navigating by keyboard, I want to jump straight to the page content, so that I do not tab through the entire sidebar on every single route.

## Current situation (as-is)

The first focusable element on every route is the "Dashboard" sidebar link. With 15 nav links in the shell, reaching the page's own content costs roughly **15 tab presses — on every navigation**, because the sidebar is persistent and re-traversed each time.

There is no skip-to-content link, no landmark shortcut, and no keyboard shortcuts anywhere in the app.

The app otherwise takes accessibility seriously — every chart ships an accompanying data table, and a full WCAG AA contrast sweep across two dark themes returned zero failures. A missing skip link is conspicuous against that standard.

## Desired result (to-be)

- A skip-to-content link is the first focusable element on every route, visible on focus.
- Activating it moves focus to the page's main content, so the next Tab continues inside the content.
- The pattern works from every route, including after client-side navigation.

## Acceptance criteria

- [ ] A skip link is the first focusable element on every route.
- [ ] It is visually hidden until focused, then clearly visible.
- [ ] Activating it moves focus into the main content region, and the following Tab lands on the first interactive element there.
- [ ] It behaves correctly after client-side navigation, not only on a full page load.
- [ ] The `main` region carries an appropriate landmark role and accessible name.
- [ ] Unit tests cover: the skip link renders first in DOM order; activating it targets the main region.
- [ ] Verified live in the browser by keyboard from at least three different routes, including one navigated to client-side.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- A UX review also found no keyboard shortcuts and no command palette anywhere. That is a larger idea and is deliberately not scoped here.
- Related: [TICKET-UI-28](./TICKET-UI-28-sidebar-outgrew-its-viewport.md) — the same nav growth, seen from the pointer side.
