# TICKET-EXP-05 — 3D spending landscape (months × categories × amount)

> **CLOSED 2026-08-06 as *won't do*. Kill criterion 1 fired at the feasibility gate**, before any UI
> work: `echarts-gl` cannot be built against the installed ECharts 6 / zrender 6 without patching it.
> Full finding in [Notes](#notes) below; `echarts-gl` was installed to run the gate and has been
> uninstalled again, so the working tree carries no trace of it. If the appetite for the visual
> remains, the follow-up named at the bottom of this ticket — a WebGL-free isometric SVG landscape
> over the same `computeCategoryCompositionTrend` output — is the replacement, and is deliberately
> not specced here.

- **Area:** Explore
- **Released in:** [v2.1 Extra graphs](../../releases/v2.1_extra_graphs/overview.md)
- **Type:** Feature
- **Traceability:** new capability, adds **FR-EXP-3**. Graduated from the "Extra graphs" idea in [v9999_ideas/requirements.md](../../v9999_ideas/requirements.md) ("cool fancy 3d graph?"). Constrained by CLAUDE.md's hard rule: **the `angular.json` bundle budget is never raised.**

## User story

As someone who enjoys looking at my own data, I want a rotatable 3D landscape of what I spent per category per month, so the shape of a year of spending is something I can look at from an angle rather than read off a grid.

## Description

Adds a second Explore section: an `echarts-gl` `bar3D` surface with months on one axis, top categories on the other, and amount as height — orbitable with the mouse. This is the version's one deliberately-for-delight ticket, and it ships **only** if it can be proved not to cost the main bundle anything; the kill criteria below are part of the deliverable, not a caveat.

## Current situation (as-is)

- [package.json:41-42](../../../package.json) has `echarts@^6.1.0` and `ngx-echarts@^21.0.0`. There is no `echarts-gl`, no WebGL renderer, and no 3D chart anywhere in the app.
- [echarts-setup.ts](../../../src/app/shared/echarts/echarts-setup.ts) is a **shared** registration module: `provideEchartsCore({ echarts })` is declared at each feature's route level, so whatever it registers is paid for by every feature chunk that renders a chart (Dashboard, Accounts, Income, and now Explore). Its own comment states that intent.
- [angular.json:35-46](../../../angular.json) budgets `initial` (500 kB warn / 1 MB error) and `anyComponentStyle` only — **lazy chunks are not budgeted**. That is a gap in the guard rail, not permission: the rule in CLAUDE.md is to solve size problems with lazy-loading and dependency dieting, and a multi-hundred-kilobyte dependency in a lazy chunk is still a real cost on the first visit to that page.
- `computeCategoryCompositionTrend` ([category-composition-trend.ts](../../../src/app/core/stats/category-composition-trend.ts)) already returns exactly the data a `bar3D` needs: `bucketKeys` (chronological, at a chosen `Granularity`) × top-N `CategorySeriesEntry` with per-bucket values, everything routed through `classifyForStats`. **No new aggregate is needed.**
- After [TICKET-EXP-01](./TICKET-EXP-01-explore-page-scaffold.md) the Explore page exists with its own range and lazy echarts providers.

## Desired result (to-be)

- **Feasibility gate, first commit of the ticket.** `echarts-gl`'s current release targets ECharts 5's internal APIs; this repo is on ECharts 6. Before any UI work, verify in a scratch branch that `echarts-gl` registers and renders against the installed ECharts 6. The outcome is recorded in this ticket's Notes either way. If it does not work, **do not** downgrade ECharts and **do not** pin an older ngx-echarts — take a fallback (below) instead.
- `echarts-gl` added as a dependency and registered **only inside `feature-explore`**, never in [echarts-setup.ts](../../../src/app/shared/echarts/echarts-setup.ts), via a dynamic `await import('echarts-gl')` inside the 3D section's component so it becomes its own chunk, fetched when that section first renders. The Dashboard, Accounts and Income chunks must not gain a byte.
- New `app-spending-landscape-panel` under `feature-explore/components/spending-landscape-panel/`:
  - x = time buckets (months by default, from `computeCategoryCompositionTrend` at the Explore range, with a granularity control seeded by `pickGranularityForSpan`);
  - y = top-5 expense categories (the aggregate's existing cap);
  - z = amount; bar colour from the category's own `color`;
  - orbit/zoom enabled, auto-rotate **off** by default and disabled outright under `prefers-reduced-motion`, consistent with `resolveChartAnimation()`'s existing respect for motion preferences.
- **Progressive enhancement, not a hard dependency.** The section renders a lightweight placeholder with a "Show 3D view" affordance; the `echarts-gl` chunk loads on that interaction. If the dynamic import fails, or `WebGLRenderingContext` is unavailable (older device, disabled WebGL, headless test env), the section falls back to the flat category-composition rendering and says so in one line — it never shows a blank canvas or a stack trace.
- The visually-hidden table (bucket × category × amount) is mandatory here, not optional: a rotatable canvas is unreadable to assistive tech, and the table is the section's only accessible representation.
- Privacy mode blurs the table's amounts and suppresses tooltip amounts, as elsewhere; the bars stay.

## Acceptance criteria

**Every criterion below except the first is now moot — the ticket is closed as won't-do and no
implementation exists.** They are left unchecked rather than deleted, so the shape of what was
*not* built stays legible next to the reason it wasn't.

- [x] The feasibility gate is executed and its result recorded in this ticket's Notes **before** implementation proceeds: `echarts-gl` either renders against the installed ECharts 6, or the fallback path is taken. (Executed 2026-08-06; full finding in Notes. Result: it does **not** build against ECharts 6, kill criterion 1 fires, and the ticket closes with no UI work done.)
- [ ] `angular.json` budgets are unchanged, and a production build shows the `initial` bundle unchanged (±0 kB attributable to this ticket) — recorded as before/after figures in the ticket.
- [ ] `echarts-gl` is imported dynamically from within `feature-explore` only; a build shows it in its own chunk, and the Dashboard/Accounts/Income chunk sizes are unchanged. `echarts-setup.ts` is not modified by this ticket.
- [ ] The 3D chunk is fetched only when the user opens the 3D section — not on `/explore` load.
- [ ] The chart reuses `computeCategoryCompositionTrend` — no new aggregate, and its figures match the Dashboard trend chart for the same range and granularity.
- [ ] Auto-rotate is off by default and unavailable under `prefers-reduced-motion`.
- [ ] With WebGL unavailable or the dynamic import failing, the section falls back to a flat rendering with a one-line explanation; no blank canvas, no console error surfaced to the user.
- [ ] A visually-hidden table mirrors every bucket × category figure, with `role="img"` and a summary label on the canvas host.
- [ ] Privacy mode suppresses every absolute amount in the section.
- [ ] Unit tests cover: the option builder (pure, no chart instance) for bucket/category/value mapping and colour resolution; the reduced-motion branch; the no-WebGL fallback branch; the failed-import fallback branch.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass, and the ECharts-GL chunk does not break the Vitest/jsdom setup ([echarts-jsdom.testing.ts](../../../src/app/shared/echarts/echarts-jsdom.testing.ts) may need extending — jsdom has no WebGL context).
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: the landscape renders and orbits on `/explore` with real data, heights match the trend chart's figures, and the fallback path renders correctly with WebGL disabled in the browser's flags.

## Kill criteria (any one ends the ticket as *won't do*, not as a workaround)

- `echarts-gl` cannot render against ECharts 6 without downgrading ECharts, pinning an older `ngx-echarts`, or patching the dependency.
- Shipping it would require registering anything in the shared `echarts-setup.ts`, or would grow the production `initial` bundle at all.
- The `echarts-gl` chunk is large enough that opening the section is visibly slow on a mid-range machine — as a rule of thumb, over ~400 kB gzipped for one decorative view.

If a kill criterion fires, close the ticket with the finding recorded here and, if the appetite for the visual remains, open a follow-up for a WebGL-free pseudo-3D rendering (an isometric SVG landscape built from the same `computeCategoryCompositionTrend` output, no new dependency) — deliberately *not* specced here, because that is a different ticket with a different risk profile.

## Notes

### Feasibility gate result, 2026-08-06 — FAILED (kill criterion 1)

Run against `echarts-gl@2.1.0` (published 2026-05-28, the current release) on this repo's
`echarts@6.1.0` / `zrender@6.x` / `ngx-echarts@21.0.0`.

**What works.** The premise in the to-be — "`echarts-gl`'s current release targets ECharts 5's
internal APIs" — is out of date. 2.1.0 declares `peerDependencies: { echarts: "^5.1.2 || ^6.0.0" }`,
it imports cleanly under Vite's resolver, and ECharts 6 genuinely accepts its series types: a
`setOption` carrying `type: 'bar3D'` was handed straight to the GL renderer, which got as far as
compiling GLSL. So the *API* compatibility the ticket was worried about is real.

**What fails, and why it is fatal.** `ng build` cannot resolve the package at all:

```
X [ERROR] Could not resolve "zrender/lib/core/matrix"
X [ERROR] Could not resolve "zrender/lib/animation/requestAnimationFrame"
X [ERROR] Could not resolve "echarts/lib/util/layout"
X [ERROR] Could not resolve "echarts/lib/data/Graph"        … and more
```

`echarts-gl`'s ESM sources import **16 distinct deep paths into `echarts`/`zrender` without a `.js`
extension**. Both packages ship a strict `exports` map whose catch-all is `"./*": "./*"` — an exact
mapping with no extension probing — so every one of those specifiers resolves to a file that does
not exist. Vitest passes only because Vite's dev resolver is more forgiving than the esbuild
resolver Angular builds with; the *build* is what ships.

Three ways out, all excluded:

1. **Patch `echarts-gl`** (add the extensions, or vendor it) — named verbatim in kill criterion 1.
2. **Downgrade ECharts / zrender, or pin an older `ngx-echarts`** — also named verbatim, and the
   to-be says "**do not**" twice.
3. **Import the prebuilt UMD bundle** (`echarts-gl/dist/echarts-gl.min.js`) instead of the package
   entry. This *does* build — measured at a **4.25 MB dev chunk**, from a 625 kB minified / 175 kB
   gzipped artifact. Rejected on two counts: it embeds its own copy of echarts and zrender, so it
   would ship a second copy of a library already in the bundle *and* register `bar3D` on its own
   embedded instance rather than the app's `provideEchartsCore({ echarts })` one — meaning the chart
   would not render on the app's chart at all. A build that succeeds and a chart that stays blank is
   the worst of both outcomes.

**Two by-products of the gate were kept**, because both are corrections independent of this ticket:

- `echarts-jsdom.testing.ts` now answers `null` for `getContext('webgl' | 'webgl2' | …)`, as a real
  jsdom canvas does. Its catch-all proxy previously claimed WebGL existed, which is how the gate got
  as far as a GLSL compile error instead of a clean "no WebGL" signal — a stub that lies about a
  capability is worse than one that admits it lacks it.
- `echarts-setup.ts`'s comment now records that `echarts-gl` is deliberately *not* a dependency, and
  points here, so the next person to reach for it starts from this finding.

**Cost of the investigation:** `echarts-gl` was installed to run the gate and uninstalled afterwards;
`package.json`, `package-lock.json` and `angular.json` are all unchanged, and no `initial` bundle
figure moved.

### Original notes

- **Why this is ticketed despite the risk.** The user asked for it explicitly, having been shown the bundle trade-off. The ticket therefore carries the constraints as acceptance criteria rather than the ambiguity as a caveat: the guard rails are the deliverable.
- **Why `bar3D` over a `surface`.** Months × categories is a genuinely discrete grid; a smoothed surface would interpolate between two unrelated categories and imply a continuum that isn't there.
- **Why no new aggregate.** `computeCategoryCompositionTrend` is the same data the Dashboard trend chart renders, which also guarantees the two can't disagree — a 3D view that silently reported different figures than the 2D one would be worse than no 3D view.
- Needs TICKET-EXP-01 only. Deliberately last in the version's build order: it is the riskiest and the least load-bearing.
