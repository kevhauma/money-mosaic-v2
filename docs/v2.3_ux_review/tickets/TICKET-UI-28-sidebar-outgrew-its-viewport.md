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

### Implementation note, 2026-08-23 — the decision that was re-made

Of the three options the Notes list, **pinning the bottom group** won, and `<details>` lost again —
for a different reason than TICKET-UI-26 gave. The two group headings already *are* the scannable
index a collapse would provide, and collapsing would cost a click plus a piece of state on the
*feature* groups, which are the ones used constantly. What actually failed was that the four utility
links rode the overflow.

So the nav is now a fixed-height flex column (`h-full overflow-hidden`) that never scrolls as a
whole; the feature groups scroll inside their own `flex-1 min-h-0 overflow-y-auto overscroll-contain`
frame; and the utility list is a `shrink-0` sibling pinned to the foot behind a top border. The last
item on screen is therefore always Settings, so the nav can no longer *appear* to end early, and a
feature group clipped mid-item is its own affordance. Collapsing gets revisited only if the feature
groups alone outgrow a short viewport.

- [ ] At a 700px viewport, either every nav item is visible, or the sidebar shows a visible indication that it scrolls. — the mechanism is in place (the utility group is out of the scroll region entirely, so what clips is a feature group mid-item under a heading rather than the end of the list), but **whether that clipping actually reads as an affordance is a visual judgement jsdom cannot make**. Left open until the browser pass below measures it at 700px.
- [x] The "Settings" link is reachable at 700px without the user needing to discover an unmarked scroll region. (Structurally guaranteed and pinned by "keeps the meta list outside that frame, so it can never be scrolled off" — the spec asserts `frame.contains(metaList) === false`, so no amount of growth in the feature groups can push Settings out of view.)
- [x] The group headings keep their `aria-labelledby` association and both groups remain keyboard-navigable. (Untouched markup; re-asserted by "keeps the group headings labelling their lists", alongside TICKET-UI-26's existing heading/`aria-labelledby`/tab-order cases which all still pass.)
- [x] The comment at `app-shell.component.html:44-50` reflects the actual item count and the decision now in force. (Rewritten in place: it quotes the expired "nine items" premise, states the 15-link reality and the 700px symptom, and records the re-decision and what would reopen it.)
- [x] Unit tests cover the shell rendering all nav groups and items (guarding the count assumption rather than restating it). (Five cases in a new `AppShellComponent: the sidebar fits its viewport` describe. They assert the *mechanism* — `h-full`/`overflow-hidden` on the nav, `flex-1 min-h-0 overflow-y-auto` on the frame, the meta list outside it — because jsdom has no layout and cannot answer "is Settings visible at 700px". The inventory case asserts a **partition** rather than a count — every `a[href]` in the nav is inside either the scroll frame or the pinned foot — so a 16th link, which is exactly the growth this layout exists to absorb, does not fail the suite; the per-group inventories stay where TICKET-UI-26 put them.)
- [ ] Verified live in the browser at 700px and at a taller viewport. — **deferred, not skipped**: the user chose a single browser pass over the whole v2.3 batch rather than one per ticket; tick this when that pass runs.
- [x] Verified via the fallow skill and coding-conventions skill. (`npx fallow dead-code --baseline … --fail-on-issues` and `npx fallow health --complexity …` both exit 0. `conventions-reviewer` found no violation in the mechanism and raised five items in the specs and docs; four were applied — the 15-link count became a partition assertion, `flex-nowrap` was added against daisyUI's `column wrap`, `renderShell` was lifted to file scope and the duplicated `<details>`/`[hidden]` checks dropped, and the template comment on `mt-auto` was corrected to say it is a test selector rather than a behaviour. The fifth — that `overview.md`'s row is still `- [ ]` — is deliberate: the row is ticked when the batch browser pass runs.)

## Notes

- Options worth weighing rather than assuming: pinning the bottom group (How-to's / FAQ / Changelog / Settings) so it never scrolls; making the middle groups scroll within a fixed frame; or revisiting collapsible groups now the count has grown. The comment argues against `<details>` on grounds that no longer apply — re-decide it, don't just override it.
- A UX review separately noted "Learning" reads as tutorials but opens an ML training console, and sits two items above "How-to's". Renaming it (e.g. "Auto-categoriser") is a cheap win while this file is open, but is not scoped here. — **done separately**: [TICKET-UI-32](./TICKET-UI-32-rename-learning-nav-item.md) shipped the rename before this ticket started, so the link reads "Auto-categoriser" in the markup above.
- **`min-h-0` on the scroll frame is load-bearing, not tidy-up.** A flex child's automatic minimum
  size is its content, so `flex-1 overflow-y-auto` alone never shrinks and never scrolls. The spec
  asserts it for that reason.
- **`mt-auto` on the pinned list is now inert and kept only as a test selector.** `flex-1` on the
  frame is `flex: 1 1 0%`, so it always takes the free space and `mt-auto` can never fire; three
  specs (TICKET-UI-26's included) look the list up by `ul.mt-auto`, so removing it would mean
  rewriting them for no gain. The template comment says exactly this rather than claiming a
  behaviour it no longer has.
- **`flex-nowrap` on the nav is not cosmetic.** daisyUI's `.menu` is `flex-flow: column wrap`, and a
  definite height (`h-full`) plus `overflow-hidden` turns a wrap into a second column that is clipped
  outright rather than scrolled — an unreachable link, strictly worse than the unmarked scroll this
  ticket fixes. `flex-1`'s `0%` basis keeps it on one line in practice; `flex-nowrap` removes the
  variable, and with it a case the 700px browser pass would not have exercised.
