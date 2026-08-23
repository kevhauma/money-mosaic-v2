# TICKET-UI-28 — Sidebar's last nav items fall below the fold with no scroll affordance

- **Area:** UI / Layout
- **Type:** Bug fix
- **Traceability:** UX review (UXR-8); follows TICKET-UI-26 (two labelled nav groups), whose sizing assumption no longer holds

## User story

As someone reaching for Settings, I want every nav item to be visible or visibly scrollable, so that I do not conclude the link is missing.

## Current situation (as-is)

At a 700px viewport:

```
innerHeight              700
.drawer-side             height 700, scrollHeight 758, overflow-y: auto
.menu.min-h-full.w-64    height 757.9, overflow-y: visible
a[href="/changelog"]     bottom 700.3   (0.3px below the fold)
a[href="/settings"]      bottom 741.9   (below the fold)
```

So the last two nav items sit outside the visible area. The sidebar **is** scrollable — `.drawer-side` is `overflow-y: auto` with a 58px scroll range, and scrolling brings Settings to bottom 683.9 — but there is no visible affordance saying so. The nav simply appears to end at "FAQ".

The cause is drift, not a coding error. [app-shell.component.html:44-50](../../../src/app/core/layout/app-shell/app-shell.component.html) still reasons from a smaller nav:

> "Deliberately headings + nested lists, never `<details>` — with **nine items** the sidebar has no height problem to solve, so collapsing would cost a second click and an open/closed state to persist for no gain."

The live sidebar renders **15 links** plus the brand and two group headings. The premise the decision rested on has expired, and behind the fold sit the theme picker, locale, backup, and "Delete all data".

## Desired result (to-be)

- Every nav item is reachable, and when the list exceeds the viewport that fact is visible rather than silent.
- The decision recorded in the comment is re-made against the current item count, and the comment is updated to match whatever is decided — so the next person reads a live rationale rather than a stale one.
- No regression to the `aria-labelledby` group semantics TICKET-UI-26 established.

## Acceptance criteria

- [ ] At a 700px viewport, either every nav item is visible, or the sidebar shows a visible indication that it scrolls.
- [ ] The "Settings" link is reachable at 700px without the user needing to discover an unmarked scroll region.
- [ ] The group headings keep their `aria-labelledby` association and both groups remain keyboard-navigable.
- [ ] The comment at `app-shell.component.html:44-50` reflects the actual item count and the decision now in force.
- [ ] Unit tests cover the shell rendering all nav groups and items (guarding the count assumption rather than restating it).
- [ ] Verified live in the browser at 700px and at a taller viewport.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Options worth weighing rather than assuming: pinning the bottom group (How-to's / FAQ / Changelog / Settings) so it never scrolls; making the middle groups scroll within a fixed frame; or revisiting collapsible groups now the count has grown. The comment argues against `<details>` on grounds that no longer apply — re-decide it, don't just override it.
- A UX review separately noted "Learning" reads as tutorials but opens an ML training console, and sits two items above "How-to's". Renaming it (e.g. "Auto-categoriser") is a cheap win while this file is open, but is not scoped here.
