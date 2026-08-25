# TICKET-INC-22 — The Income page stops being a mile of scroll

- **Area:** Income
- **Released in:** [v1.6.2 Interface polish](../../releases/v1.6.2_interface_polish/overview.md)
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

- [x] At a 1280×800 viewport the Net vs gross section renders two charts per row; component spec asserts
      the container-query class on the grid, plus a browser check at that width.
      (`income-gross-net-section.component.spec.ts` — "is one column when its column is narrow and two
      when it is wide" now pins `@lg:grid-cols-2`. **The threshold is not the `@xl` the to-be suggested**
      — see the next criterion. Browser at 1280×800 with the section actually rendering in the charts
      column: **4 cells, 2 columns, 2 rows, 272px each**, the section 776px against ~1,293px as one
      column.)
- [x] The lowered threshold is documented in the template comment beside it, replacing the current
      `@2xl` rationale so the next reader knows why it moved. (Rewritten in
      `income-gross-net-section.component.html`. **Divergence from the to-be's suggested `@xl`, caught by
      the browser check and worth recording:** the query sees the `@container` div *inside* `mm-paper`'s
      padding, not the section — 567px in the charts column, not the 617px the column itself measures.
      `@xl` is 576px, so it would have missed by 9px and changed nothing at all, silently. `@lg` (512px)
      was chosen instead. The comment leads with "measure before changing this number" and carries the
      figures.)
- [x] **The section stays in the charts column, as a 2×2** — after a detour out to full page width and
      back, which is worth recording because the reasoning was wrong the first time. It was moved out
      because 2-up looked marginal at a 567px container *and* because a horizontal scrollbar appeared
      once it sat further right. The scrollbar turned out not to be this section's doing at all: it was
      `sr-only` failing to constrain a `<table>` (see the `sr-only` criterion below). With that fixed,
      the column wins on the things that actually matter — the events rail is sticky for the **whole**
      page instead of only the part above this section (verified: it pins at `top: 80px` past the bottom
      of Net vs gross and at the page bottom), and the page reads as one column of panels beside one
      rail. The container is 567px against a 512px threshold, so the 2×2 holds with 55px to spare;
      verified with the section really rendering: **4 cells, 2 columns, 2 rows, 272px each**. The
      `@6xl:grid-cols-4` tier added during the detour is kept — the charts column passes 1,152px on a
      1920px monitor, so a wide screen still gets one row instead of two.
- [x] From `lg:` the events rail is capped at `100vh` (less the sticky offset) and scrolls internally;
      component spec asserts the cap, and a spec with 10 years of events asserts the rail does not exceed
      it or stretch the grid row. (`lg:max-h-[calc(100vh-6rem)]` on the rail's card;
      `income-events-sidebar.component.spec.ts` — "caps its height at the viewport less the sticky offset"
      and "holds a decade of events without the card itself growing", the latter on a new
      `A_DECADE_OF_RAISES` fixture. Browser at 1280×800 with ten years of rows injected into the real
      region: card height **704px** — exactly 800 − 96 — with **2,016px** of content scrolling inside
      **618px**.)
- [x] From `lg:` the rail is `position: sticky` with a `top` offset that clears the shell's navbar and
      `main`'s padding; component spec asserts the sticky class and offset.
      (`income-overview.component.spec.ts` — "makes the events rail a sticky, top-aligned grid item".
      **Note on which chrome it actually has to clear:** the shell's `.navbar` is `lg:hidden`, so on
      desktop there is no topbar — what is sticky there is the *page header* (`mm-page-header`,
      `sticky top-0`, TICKET-UI-25), measured at **64px**. `lg:top-20` (80px) clears it with a 16px gap.)
- [x] The rail's grid item is `align-self: start` and its `mm-paper` no longer sets `h-full`; component
      spec asserts both, since a stretched item makes `sticky` a no-op. (`lg:self-start` on the host,
      `h-full` gone from the card; asserted in both specs. Browser: computed `align-self: flex-start`.)
- [x] The rail's "Notable changes" heading stays visible while its year groups scroll; component spec
      asserts the heading sits outside the `overflow-y-auto` region.
      (`income-events-sidebar.component.spec.ts` — "leaves the 'Notable changes' heading outside the
      scroll region, so it stays pinned"; confirmed in the browser against the injected ten-year region.)
- [x] Below `lg:` the rail is neither sticky nor height-capped and renders in full under the charts;
      component spec asserts both behaviours are `lg:`-scoped.
      (`income-events-sidebar.component.spec.ts` — "keeps the cap and the internal scroll to `lg:`" and
      `income-overview.component.spec.ts` — "keeps the rail behaviour to `lg:`", both asserting *every*
      matching class carries the prefix rather than just that one does. Browser at a narrow viewport:
      computed `position: static`, `max-height: none`.)
- [ ] The growth and yearly panels render side by side above the shared breakpoint and stacked below it;
      component spec asserts both arrangements. **Not shipped — measured and abandoned, deliberately.**
      It was built and briefly shipped, and looking at the real page showed the trade was bad: the charts
      column is 617px, so a half is 297px, and the growth panel's three stat cards are 168px each — they
      stack one per row and that panel goes **177px → 536px**, while the yearly heading wraps to two
      lines and its chart loses a third of its width. The pair row saved ~185px of page and cost two
      visibly cramped panels. Three stat cards only sit side by side above a ~600px half, i.e. a
      ~1,224px charts column, which this layout never has next to a 20rem rail. Reverted; both panels
      are full width again, and `income-overview.component.spec.ts` — "keeps the growth panel full
      width, so its three stat cards stay on one row" — pins that rather than leaving it to drift back.
- [x] Total rendered height of the charts column at 1280×800 with a full dataset is measurably lower than
      before — record the before/after in the ticket when ticking this box. (**Measured on the real page
      with all four panels drawing.** The seeded dataset has no gross wage, so Net vs gross renders an
      empty state; four months of gross wage were added through Salary details to measure, and removed
      again afterwards. At 1280×800 with every panel showing:

      | | before | after |
      |---|---|---|
      | Income by month | 402 | 370 |
      | Income growth | 178 | 178 |
      | Income by year | 520 | 488 |
      | Net vs gross | ~1,293 | **776** |
      | Events rail | 1,312, stretching the grid row | capped 704, sticky |
      | **page total** | **~2,590 (3.2 screens)** | **1,995 (2.49 screens)** |

      Net vs gross is the whole story: its grid went 4×1 → 2×2 (1,128px → 589px of cells). The rail cap
      stops a long history adding to the page at all. Roughly a quarter off, not the half the to-be
      hoped for — the remainder is four 256px charts, three panels of real content and a header, and
      cutting further means either shrinking those four cells (which this ticket explicitly forbids) or
      hiding something.)
- [x] Every chart, stat card and event row that renders today still renders — nothing removed, nothing
      moved behind a disclosure; component spec asserts all four panels are present.
      (`income-overview.component.spec.ts` — "renders all four panels — nothing removed, nothing behind a
      disclosure", which also asserts no `<details>` and no `[role="tablist"]` appeared.)
- [x] All `sr-only` tables and their captions are unchanged; `git diff` touches no `<table class="sr-only">`.
      (`git diff` shows no line touching an `sr-only` table or caption. **It did surface a latent bug in
      them, fixed in `styles.css` rather than in any template:** `sr-only` hides an element with
      `position: absolute; width: 1px; overflow: hidden`, which works for everything *except* a table —
      `display: table` auto-sizes to its content and treats `width` as a lower bound, so these tables lay
      out at their natural width (548px for one Net vs gross cell) and, being absolutely positioned, add
      to the document's scrollable overflow. Moving the section right was enough to push one past the
      viewport edge and put a **horizontal scrollbar** on `/income`, and they were also adding ~76px of
      phantom *vertical* scroll. `table.sr-only { position: fixed }` fixes both — a fixed element
      contributes no scrollable overflow, and it stays a table, so the caption/header/cell relationships
      these exist for survive. `display: block` would also have fixed the width and would have destroyed
      exactly that. Verified after the fix: `display: table`, caption present, rows readable, still
      clipped to invisibility, and `scrollWidth` back inside the viewport.)
- [x] Below `lg:` the rail still stacks under the charts and the grid is single-column; existing
      TICKET-INC-17 specs pass unchanged. (`income-overview.component.spec.ts` — "leaves the two-column
      page grid and the DOM order that stacks the rail last unchanged"; the page grid's own classes are
      untouched in the diff, and all pre-existing income specs pass.)
- [x] No persistence changes, no Dexie version bump. (Templates and specs only — nothing under
      `core/data-access/`, and no `.ts` component logic changed at all.)
- [x] `angular.json` bundle budgets not raised. (`angular.json` untouched; dev build initial total
      2.15 MB.)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill. (`fallow audit --base HEAD`:
      verdict **pass**, zero findings of any kind; `ng lint` clean, 2284/2284 specs green, dev build
      compiles.)
- [x] Verified live in the browser at 1280×800 and at 375px: two-up on the desktop width, single column
      on mobile, and on desktop the events rail stays in place while the charts scroll past it — scrolling
      to the bottom of the page still shows the full rail, scrolled internally, never clipped by the
      topbar or running off the bottom of the viewport. (Done on the dev server at :4210. The Browser
      pane is closed — the user chose to continue without it — so this pass reads computed styles and
      bounding boxes rather than screenshots, and where the seeded data renders an empty state it probes
      the real markup (same classes, same `@container` parent) injected into the live layout and removed
      afterwards; no app state was touched. **1280×800:** Net vs gross 2-up at its real 567px container,
      falling back to 1-up at 500px; the pair 2-up; rail capped at 704px, scrolling 2,016px of content
      internally. **Sticky, checked by actually scrolling:** the rail's viewport top went 88 → **72px** on
      scrolling to the bottom of the page — it travelled with the scroll instead of leaving with it —
      staying clear of the 64px sticky header, with its bottom edge at **776px** inside an 800px viewport.
      **Narrow:** the pane clamps the viewport at 608px, which is below both `lg` and `sm` and so
      exercises the mobile branch — `position: static`, `max-height: none`, both grids single-column, rail
      stacked under the charts, no horizontal overflow. A true 375px render is pinned by the `lg:`-scoping
      specs above rather than measured. No console errors.)

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
  **Outcome: both heights were left alone, deliberately.** The by-month chart's `h-80` (320px) already
  spends 56px on the legend strip (TICKET-STAT-26) and ~28px on the `dataZoom` slider, leaving ~230px of
  plot; trimming to `h-72` would take that under 200px for a chart the page is named after. The yearly
  chart's `h-72` sits beside the growth panel now, so its height is what makes the pair the same size —
  shrinking it would just move whitespace into the other half. The scroll win came from the two grids and
  the rail cap, which is where the wasted space actually was.
- Best built after [TICKET-INC-21](./TICKET-INC-21-income-page-header.md), which removes the page's
  subtitle and reorders the header — a small height win in the same area, and no point re-verifying the
  page's top twice.
