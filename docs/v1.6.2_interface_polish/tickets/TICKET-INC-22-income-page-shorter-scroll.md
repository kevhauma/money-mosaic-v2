# TICKET-INC-22 — The Income page stops being a mile of scroll

- **Area:** Income
- **Type:** Refactor
- **Traceability:** revises TICKET-INC-16 / TICKET-INC-17 layout (FR-INC-2/5/6/13/14 presentation)

## User story

As a user, I want the Income page to fit its charts into the width it has instead of stacking everything
into one very long column, so I can compare the page's figures without scrolling past four screens of
chart.

## Description

The page currently renders as one tall column of full-width panels, and its one two-column section
silently collapses to a single column at the exact width the page most often has. This ticket makes the
layout use the horizontal room it already occupies and caps the pieces that grow without limit.

## Current situation (as-is)

The charts column of
[income-overview.component.html](../../../src/app/feature-income/components/income-overview/income-overview.component.html)
stacks four full-width panels, each `mt-6`:

1. **Income by month** — an `h-80` chart in its own `mm-paper` (~320px + card chrome).
2. **[income-growth-panel](../../../src/app/feature-income/components/income-growth-panel/income-growth-panel.component.html)** —
   a heading, a caption and three free-standing stat cards on a `flex flex-wrap` row.
3. **[income-gross-net-section](../../../src/app/feature-income/components/income-gross-net-section/income-gross-net-section.component.html)** —
   four `h-64` charts in a `grid-cols-1 @2xl:grid-cols-2` **container** query.
4. **[income-yearly-panel](../../../src/app/feature-income/components/income-yearly-panel/income-yearly-panel.component.html)** —
   a span picker, a stat card and an `h-72` chart.

Two concrete causes, not just "there's a lot on it":

- **The 2×2 grid is almost never 2×2.** `@2xl` is 42rem / 672px of *container* width. From `lg:` the page
  is `lg:grid-cols-[minmax(0,1fr)_20rem]`, so on a 1280px window the charts column is roughly
  1280 − 320 (rail) − 24 (gap) − page padding ≈ **~890px**, but the section's own `mm-paper` padding
  eats into that, and on a 1024–1152px laptop the column lands **below 672px** — so the four `h-64`
  charts render one per row: ~4 × (256 + heading + gap) ≈ **1,150px** instead of ~580px. The section that
  was designed as a compact 2×2 is the single biggest contributor to the scroll on exactly the screens
  people use.
- **The events rail has a scroll region with no height, and scrolls away with the page.**
  [income-events-sidebar.component.html](../../../src/app/feature-income/components/income-events-sidebar/income-events-sidebar.component.html)
  wraps the year groups in `overflow-y-auto` — with the stated intent "so a long history doesn't stretch
  the page next to the charts" — but sets no `max-height`, so the region grows to its content and the
  grid row grows with it. A ten-year history stretches the page exactly as the comment says it shouldn't.
  It is also not sticky: the rail's `mm-paper` is `h-full` and its host is a plain `class="block"` grid
  item, so it stretches to the row's height and scrolls out of view along with the charts — by the time
  you reach the Net vs gross section, the events that explain those numbers are three screens above.

Below `lg:` the rail stacks under the charts, which is correct and not what this ticket changes.

## Desired result (to-be)

- **The Net vs gross grid goes two-up at the widths it actually gets.** Lower the container-query
  threshold (e.g. `@xl`, 36rem/576px) so the charts column pairs them on a normal laptop, and confirm the
  paired cell is still legible at the narrowest width that now triggers it — a chart too small to read is
  not a saving.
- **The events rail becomes a sticky, self-scrolling column from `lg:` up.** It stops scrolling with the
  main content and stops stretching the grid row:
  - **`max-height: 100vh`** on the rail, so it never exceeds the viewport regardless of how many years
    of events there are.
  - **`position: sticky`** with a `top` offset, so it stays in view while the charts column scrolls past
    it. The offset clears the app shell's `navbar`
    ([app-shell.component.html](../../../src/app/core/layout/app-shell/app-shell.component.html)) plus
    `main`'s `p-4 lg:p-6` padding — the rail must not slide under the topbar. Subtract the same offset
    from the `100vh` cap so the rail's bottom edge lands inside the viewport rather than below it.
  - **The rail's own header stays pinned**: "Notable changes" is outside the scroll region, and only the
    year groups scroll. That's already how the markup is split — the `overflow-y-auto` div sits under the
    `<h2>` — it just needs the height to make it real.
  - **`align-self: start` on the grid item**, and the `h-full` on the rail's `mm-paper` goes. A grid item
    stretches to its row by default, which leaves `sticky` nothing to move within — this is the part that
    silently does nothing if missed.
- **Below `lg:` the rail is neither sticky nor capped.** Stacked under the charts it is just another
  section of the page; a sticky, viewport-tall rail on a phone would cover the content it annotates. Both
  behaviours are `lg:`-prefixed.
- **The two short panels pair up.** The growth panel (three stat cards) and the yearly panel are both
  well under full width on a wide screen; render them side by side from the same container-query
  breakpoint the Net vs gross section uses, so the page has one responsive rule rather than three.
- **Chart heights come down where the height is padding rather than signal** — the by-month chart's
  `h-80` and the yearly chart's `h-72` should be re-checked against their data density and trimmed if
  nothing is lost; explicitly **do not** shrink the four `h-64` cells, which are already the smallest on
  the page.
- **Target: the page's four panels fit in roughly half the current scroll at 1280×800**, and nothing is
  hidden behind a disclosure to get there — no accordions, no tabs. The complaint is wasted space, not
  too much content.
- **Every `sr-only` companion table stays exactly as it is** (TICKET-UI-07 / TICKET-STAT-20) — they cost
  no visual height and are the page's accessibility story.

## Acceptance criteria

- [ ] At a 1280×800 viewport the Net vs gross section renders two charts per row; component spec asserts
      the container-query class on the grid, plus a browser check at that width.
- [ ] The lowered threshold is documented in the template comment beside it, replacing the current
      `@2xl` rationale so the next reader knows why it moved.
- [ ] From `lg:` the events rail is capped at `100vh` (less the sticky offset) and scrolls internally;
      component spec asserts the cap, and a spec with 10 years of events asserts the rail does not exceed
      it or stretch the grid row.
- [ ] From `lg:` the rail is `position: sticky` with a `top` offset that clears the shell's navbar and
      `main`'s padding; component spec asserts the sticky class and offset.
- [ ] The rail's grid item is `align-self: start` and its `mm-paper` no longer sets `h-full`; component
      spec asserts both, since a stretched item makes `sticky` a no-op.
- [ ] The rail's "Notable changes" heading stays visible while its year groups scroll; component spec
      asserts the heading sits outside the `overflow-y-auto` region.
- [ ] Below `lg:` the rail is neither sticky nor height-capped and renders in full under the charts;
      component spec asserts both behaviours are `lg:`-scoped.
- [ ] The growth and yearly panels render side by side above the shared breakpoint and stacked below it;
      component spec asserts both arrangements.
- [ ] Total rendered height of the charts column at 1280×800 with a full dataset is measurably lower than
      before — record the before/after in the ticket when ticking this box.
- [ ] Every chart, stat card and event row that renders today still renders — nothing removed, nothing
      moved behind a disclosure; component spec asserts all four panels are present.
- [ ] All `sr-only` tables and their captions are unchanged; `git diff` touches no `<table class="sr-only">`.
- [ ] Below `lg:` the rail still stacks under the charts and the grid is single-column; existing
      TICKET-INC-17 specs pass unchanged.
- [ ] No persistence changes, no Dexie version bump.
- [ ] `angular.json` bundle budgets not raised.
- [ ] Verified via the `fallow` skill and the `coding-conventions` skill.
- [ ] Verified live in the browser at 1280×800 and at 375px: two-up on the desktop width, single column
      on mobile, and on desktop the events rail stays in place while the charts scroll past it — scrolling
      to the bottom of the page still shows the full rail, scrolled internally, never clipped by the
      topbar or running off the bottom of the viewport.

## Notes

- **Layout only.** No chart is dropped and nothing goes behind a tab — hiding content would trade one
  complaint for a worse one.
- The container query on the Net vs gross section is right in kind (its width is set by the rail beside
  it, not by the viewport) and wrong only in threshold; keep the `@container`, move the number.
- **The sticky rail is the part most likely to silently not work.** Three things all have to be true: the
  grid item is `align-self: start` (a stretched item has no room to stick within), no ancestor between the
  rail and the scroll container sets `overflow` to anything but `visible` (that would scope the sticking
  to the wrong box), and the `top` offset is a real number rather than `top: 0` under a fixed topbar.
  Check all three in the browser, not just in the spec — a passing class assertion proves nothing about
  whether the element actually sticks.
- **`100vh`, not `100dvh`.** The cap is the viewport, and on desktop — the only place the rail is sticky —
  the two are the same. If the rail is ever made sticky on mobile, revisit this: `100vh` is wrong there,
  because of the collapsing browser chrome.
- Measure before changing heights. The `h-80`/`h-72` charts may genuinely need their height with many
  buckets — if trimming them makes the by-month chart unreadable at a ten-year zoom, leave them and take
  the win from the grid changes alone, and say so on the ticket.
- Best built after [TICKET-INC-21](./TICKET-INC-21-income-page-header.md), which removes the page's
  subtitle and reorders the header — a small height win in the same area, and no point re-verifying the
  page's top twice.
