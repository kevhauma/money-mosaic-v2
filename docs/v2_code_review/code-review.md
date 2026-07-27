# Money Mosaic — Code Review 4 (CR4)

**Date:** 2026-07-27 · **Baseline:** `1e06094` (post-v2 Public Ready: settings, changelog, home/help content all shipped) · **Method:** Fallow 3.3 static analysis (complexity, duplication, dead code, boundaries) + manual reading pass focused on readability/maintainability, developer experience, complexity hotspots, oversized components, structural consistency, and documentation.

Per the `docs/README.md` naming rule this is CR4, named `v2_code_review` after the most recently shipped milestone (v2 Public Ready). Sibling to [CR3](../v1.3_code_review/code-review-fallow.md).

Every finding below is structured **What / Why / How it shows** — deliberately *without* prescribed solutions. Option explorations for each finding live in [`solutions/`](./solutions/README.md) (one doc per finding, options + trade-offs, still not tickets). Ticketing (with as-is/to-be and acceptance criteria) is a separate follow-up step; nothing here presumes a specific fix.

---

## 0. What is healthy (verified, not assumed)

The three previous reviews clearly worked. Verified at this baseline:

- **Zero** circular dependencies, re-export cycles, or architecture-boundary violations (Fallow, 356 files).
- **0.7% code duplication** (146 of 20,592 lines) — 7 small clone groups, all below CR3's action threshold.
- Average maintainability index **93.1**; p90 cyclomatic complexity is **4**; 84% of functions are low-risk unit size.
- **73 of 79 components have a spec file**; the 6 without are trivial presentational primitives (`alert`, `badge`, `input`, `select`, two import display steps).
- Repository layering holds: no component or store touches `appDb` tables directly.
- `transactions-overview` — CR1/CR2's problem child — is now a thin coordinator (327 lines, mostly delegation to `createPagination`/`createSelectionModel`/store methods). The CR2 "split transactions overview" concern can be considered resolved in spirit.

**Deliberate non-actions carried forward from CR3 (do not re-raise):** `matchesTransactionFilters`' flat specced guard list, the `csv-row-mapper` dispatch functions, `tailwindcss` in `devDependencies`, and the small cross-domain clone groups listed in [CR3's overview §non-actions](../v1.3_code_review/overview.md).

---

## 1. Complexity hotspots

### CR4-1 — Complexity has migrated from classes into templates

**What:** After three reviews of extracting class-side logic, the app's highest cognitive-complexity units are now HTML templates, not TypeScript functions. Fallow's top per-unit findings: `category-comparison-panel.component.html` (cognitive 48), `import-wizard.component.html` (cognitive 45, cyclomatic 26), `accounts-overview.component.html` (26), `transactions-overview.component.html` (25), `accounts-detail.component.html` (25), `rule-form.component.html` (22). The worst *component rollups* (class + template combined) — import-wizard at 56, category-comparison-panel at 57 — are dominated by the template half; the worst class-side function in each is only cyclomatic 12–14.

**Why:** Template branching is the least-tested and least-tooled logic in the codebase — templates have no direct unit tests, no extract-function refactoring support, and `@if`/`@else if` ladders with `as` aliases are where subtle display bugs hide (the CR3-era `parseError`-vs-`headerMismatch` branch family in the wizard is exactly this shape). A review process that only measures `.ts` files would report this codebase as nearly done improving while its actual decision density has moved somewhere less visible.

**How it shows:** `import-wizard.component.html` line 3 onward is a single 126-line template unit whose branch ladder covers step × parse-state × batch-mode × error-kind combinations; `category-comparison-panel.component.html` renders nested `@for` loops with per-bar/per-delta conditionals on top of a `computed()` that already assembles view models. The dashboard and accounts overview templates repeat the pattern at slightly smaller scale.

### CR4-2 — The import wizard's commit/auto-commit flow is the hardest-to-reason-about code in the app

**What:** `ImportWizardComponent` coordinates a multi-file state machine through ~10 interacting signals (`step`, `queue`, `pendingDrafts`, `currentFileIndex`, `mapResult`, `batchMapping`, `manualOverrideActive`, `applyToRemaining`, `committing`, `accountCreationError`), one debounced RxJS parse pipeline, one auto-commit `effect()`, and two non-reactive re-entrancy guard fields (`autoCommittedFileIndex` here, `detectedFile` in the map step). `runCommit()` ([import-wizard.component.ts:300](../../src/app/feature-import/components/import-wizard/import-wizard.component.ts)) additionally rewrites mapping profiles from a placeholder account id (`-1`) to a just-created real id mid-commit, and strips profile metadata inline when arming batch mode.

**Why:** This is the file where correctness depends on *ordering interactions between signals and effects* rather than on any single function — the class's per-function complexity is modest (worst is cyclomatic 12), which is precisely why static metrics under-report it. The comments themselves document the fragility ("so the effect below doesn't re-fire and double-commit when an unrelated dependency changes"). It is also a persistent churn hotspot: 16 commits, 545 lines added over its life, and every import ticket (IMP-02/03/07/08/09) has touched it. Double-commit or wrong-account-attribution bugs here corrupt user financial data at import time, the app's front door.

**How it shows:** The auto-commit `effect()` at lines 226–243 must be read together with `runCommit()`, `resolveAccountId()`, `PENDING_ACCOUNT_PLACEHOLDER_ID`, and the parse pipeline's `startWith('parsing')` guard to convince yourself a fast click or a re-fired effect can't commit twice — five locations, three mechanisms (signal guard, plain-field guard, debounce-as-disable), one invariant.

### CR4-3 — `classifyForStats` is a single choke point accumulating special cases

**What:** [`classify-for-stats.ts:43`](../../src/app/core/stats/classify-for-stats.ts) — the shared per-transaction classifier CR3 deliberately created (STAT-19) — is one 54-line function at cyclomatic 26 / cognitive 26, and its joint-account path (`classify-joint-leg.ts`, 13/18) adds a second layer. It now encodes: range/nullified/zero/savings/transfer exclusion ordering, three attribution-override modes, a personal-flagged-leg special case, an untagged-refund-on-joint special case, and signed category-kind netting.

**Why:** Centralising the classifier was the right call — but the cost is that *every* joint-account or stats feature adds branches to the same function, and the branch *ordering* constraints (nullified before savings, transfer-link below savings) are load-bearing and expressible only as comments. The 22-line doc comment exists because the code cannot express its own invariants. One wrong branch here silently skews every dashboard number at once, and the two "special case" branches inside the joint path already interact with the override modes in ways only the spec file pins down.

**How it shows:** The function's comment block is nearly half as long as the function; new rules (e.g. TICKET-STAT-18's ordering fix) land as *position-sensitive* early returns; `resolveContribution` is called with a partially-empty context object (`emptyJointLegContext` spread) whose unused fields hint the signature serves a different caller's needs.

---

## 2. Large components doing too much

### CR4-4 — `import-map-step` is the app's largest component and owns nine jobs

**What:** [`import-map-step.component.ts`](../../src/app/feature-import/components/import-map-step/import-map-step.component.ts) is 506 lines plus a 225-line template. In one class: a 16-control form definition; preset/saved-profile detection and prefill; raw-preview parsing (`refreshPreview`); the guided-stepper state machine (`activeStepId`, `openStep`/`advanceFrom`/`returnFrom`/`markStepTouched`/`isStepBlocked`); per-field sample resolution; duplicate-column warnings; summary-row assembly; amount-mode switching with control-clearing rules; and serialization of the form into a `MappingProfile` result.

**Why:** It has been touched by five import tickets and shows a stable-high churn trend (15 commits, 576 lines added) — the classic "every feature lands here" magnet. The stepper mechanics (step defs, tracker states, touched/blocked rules) are generic flow logic interleaved with CSV-mapping domain logic, so a reader needing either one must page through both. Fallow independently ranks its sibling `import-select-step` as the repo's #1 refactoring target for the same reason (density 0.37, 4 dependents, accelerating trend).

**How it shows:** Six exported types (`ColumnFieldKey`, `ColumnFieldDef`, `MapperStepId`, `MapperStepDef`, `MapperStepTrackerState/Status/Item`) and two module constants live in the component file and are imported by four other components — the file is functioning as the import feature's de-facto domain module while also being its biggest view.

### CR4-5 — The Settings page is becoming an unbounded accumulator

**What:** `settings-overview` now hosts, in one component/template pair: the 9-theme picker, the accent-color setting, currency symbol + position, locale, an inline-embedded `<app-data-management-overview />` (settings-overview.component.html:168) and the GitHub link — 171-line class, 186-line template, growing with every SET-* ticket.

**Why:** The v2 backlog explicitly routes more settings here (PRIV-01 privacy mode is open; SET-04's notes foreshadow more locale work), and the embedded data-management panel means two features' change reasons converge on one file. Nothing structural currently pushes a new setting anywhere *other* than appending another section to this template — the growth is by default, not by decision.

**How it shows:** The component already injects four stores/services for unrelated concerns; the template is a linear stack of section papers where the data-management embed sits between locale and the GitHub link (see also CR4-8 on the leftover route from that embed).

---

## 3. Structural inconsistencies

### CR4-6 — Settings-driven formatting has three coexisting mechanisms, and one of them already drifted

**What:** Number/date formatting reaches components through three different channels: (a) module-level signal + setter pairs kept in sync by `AppSettingsStore` effects — *two independent copies* of this pattern, one in `currency-format.ts` and one in `date-format.ts`, each with its own private `locale` signal and its own `setGlobal*` setter ([app-settings.store.ts:94–111](../../src/app/core/state/app-settings.store.ts)); (b) pipes wrapping (a) (`SignedAmountPipe`, `LocaleDatePipe`); and (c) module-level `Intl` formatters hardcoded to `'en-BE'` that ignore the locale setting entirely: three near-identical `PERCENT_FORMATTER` constants ([dashboard-overview.component.ts:27](../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.ts), [category-breakdown-panel.component.ts:61](../../src/app/feature-dashboard/components/category-breakdown-panel/category-breakdown-panel.component.ts), [category-comparison-panel.component.ts:57](../../src/app/feature-dashboard/components/category-comparison-panel/category-comparison-panel.component.ts)), `RATIO_FORMATTER` ([weekday-weekend-split-panel.component.ts:7](../../src/app/feature-dashboard/components/weekday-weekend-split-panel/weekday-weekend-split-panel.component.ts)), and `MONTH_NAME_FORMATTER` ([date-buckets.ts:265](../../src/app/shared/utils/date-buckets.ts)).

**Why:** This is drift that has *already happened*, not a hypothetical: TICKET-SET-04 shipped a locale setting eleven days ago, and a user who picks a non-default locale now sees locale-formatted currency and dates next to `en-BE`-formatted percentages on the same dashboard. Structurally, the duplicated module-signal channel means the next formatter family (percent would be the third) has no single obvious home — the precedent is "clone the signal + setter + store effect again," multiplying hidden global state channels that only stay consistent because one store remembers to sync all of them.

**How it shows:** `grep -rn "Intl.NumberFormat('en-BE'" src` returns four production files post-SET-04; `app-settings.store.ts` needs three separate `onInit` effects and four imported setter functions to fan one settings row out to the formatting modules.

### CR4-7 — Shared helpers and domain types are exported from component files

**What:** Two naming/placement conventions leak: (1) `formatDisplayDate` — an alias of `shared/utils`' `formatDate` — is defined and exported from [`date-range-input.component.ts:17`](../../src/app/shared/ui/date-range-input/date-range-input.component.ts) in `shared/ui`, so dashboard panels import date formatting from the *UI* barrel while sibling code imports the same function under a different name from the *utils* barrel. (2) The import feature's shared vocabulary types (`PendingAccountDraft`, `QueuedImportFile` from `import-select-step`; `ColumnFieldKey`, `MapperStepId` and friends from `import-map-step`; `ImportMappingResult` likewise) live in component files with 4-file fan-in each.

**Why:** "Where do I import X from" should have one answer per category of thing; today date formatting has two, and the answer for import-domain types is "whichever component happened to define them," which both inflates those components (CR4-4) and makes any future split of the wizard a breaking change for four importers. It also means a pure-logic consumer of these types drags a component (and its template/imports) into its module graph.

**How it shows:** `category-comparison-panel.component.ts` imports `formatDisplayDate` from `@/shared/ui` and `formatCurrency` from `@/shared/utils` on adjacent lines — two formatting helpers, two barrels, no discernible rule.

### CR4-8 — The data-management route migration left its old wiring behind, half-contradicted

**What:** Data management moved *into* the Settings page as an embedded component (`<app-data-management-overview />`), but [`data-management.routes.ts`](../../src/app/feature-data-management/data-management.routes.ts) still exists and exports a now-unreferenced `DATA_MANAGEMENT_ROUTES`; no `/data` (or `/settings/data`) route exists in `app.routes.ts` or `settings.routes.ts`.

**Why:** A reader tracing routing finds a routes file that implies a routed feature which is unreachable; Fallow flags the export dead. Worse, the ticket that governed this move records a *different* implementation than what shipped — see CR4-13, the documentation half of this finding.

**How it shows:** Fallow `unused-export: DATA_MANAGEMENT_ROUTES` (data-management.routes.ts:3); `grep -rn "DATA_MANAGEMENT_ROUTES" src` finds only the definition and the feature's own barrel.

### CR4-9 — `bento-grid`/`bento-item` are shipped, specced, barrel-exported — and rendered nowhere

**What:** `shared/ui/bento-grid/` contains two components with spec files, exported from the `@/shared/ui` barrel, that no template in the app renders (Fallow `unrendered-component`; a repo-wide grep finds only their own files and the barrel).

**Why:** Dead UI primitives in the shared barrel are worse than dead code elsewhere: they show up in autocomplete as a sanctioned building block, their specs cost CI time forever, and — likely a remnant of the deformable-UI redesign — nothing records whether they're "coming soon" or "abandoned."

**How it shows:** `grep -rln "bento" src/app --include=*.html --include=*.ts` → four bento files plus `shared/ui/index.ts`, nothing else.

### CR4-10 — The store-placement rule has a documented two-way split, but a third kind exists

**What:** The documented rule (coding-conventions + project-map skills) is binary: cross-feature entity stores → `core/state/`, single-feature stores → that feature's folder. `range-state.store.ts` fits neither — it lives in `core/stats/`, and `AppSettingsStore` (in `core/state/`) is a settings singleton, not an entity store, consumed for side effects (theme/formatting sync) as much as for data.

**Why:** Placement rules earn their keep at the margins; both counter-examples are exactly where the next contributor will look for precedent ("where does my new cross-cutting store go?") and find two different answers, neither covered by the written rule.

**How it shows:** `git ls-files 'src/**/*.store.ts'` shows stores in four distinct locations (`core/state/`, `core/stats/`, and two feature folders' roots); the project-map skill's `core/state` paragraph enumerates five stores and omits `AppSettingsStore` entirely.

---

## 4. Documentation

### CR4-11 — The project-map skill — the designated "read this instead of exploring" doc — is materially stale

**What:** [`project-map/SKILL.md`](../../.claude/skills/project-map/SKILL.md) predates roughly half the current app. Specifics: its features table lists 7 of 11 routed features (missing `feature-home`, `feature-help`, `feature-changelog`, `feature-settings`); line 8 says `app.config.ts` "hydrates every store before render" (reversed by TICKET-PERF-07 — stores self-hydrate on first injection); the `/data` row explains a standalone route "since TICKET-SET-01 hasn't landed" (SET-01 was dropped, `feature-settings` exists, and `/data` no longer routes at all); `date-buckets.ts` is listed under `core/stats/` but lives in `shared/utils/`; the `shared/ui` inventory names ~16 of 27 primitives (no `paper`, `flex`, `table`, `tabs`, `dropdown`, `divider`, `fieldset`, `label`, `collapse`, `bento-grid`); the Docs section calls `docs/v2/` a "deferred v2+ backlog" though it is now the mostly-shipped Public Ready milestone; `AppSettingsStore`, `core/theme/`, `core/onboarding/`, `core/links/`, and `core/storage/` are absent.

**Why:** CLAUDE.md instructs both humans and agents to read this file *instead of re-exploring the codebase* — a wrong map is strictly worse than no map, because it is trusted. Several of this review's own dead ends (e.g. expecting all-upfront hydration) came from this file. Every stale line also silently propagates into new sessions' assumptions via the skill mechanism.

**How it shows:** `git log` on the file shows its last substantive update in the v1.4 data-management era; four shipped feature milestones and two reviews have landed since.

### CR4-12 — The coding-conventions skill contradicts itself about persistence and hydration

**What:** [`coding-conventions/SKILL.md`](../../.claude/skills/coding-conventions/SKILL.md) line 96 states "each store service's constructor registers an `effect()` that mirrors signal writes into IndexedDB" and "app bootstrap hydrates source signals from IndexedDB before the app renders" — while line 99 (added later, TICKET-NG-08) correctly describes the actual `withPersistedCrud` explicit-await pattern, and PERF-07 replaced bootstrap hydration with hydrate-on-first-injection everywhere.

**Why:** A conventions doc that describes two incompatible persistence patterns as current means a new store's author picks one at random — and the stale pattern (mirror-via-effect) is the one with known footguns (write ordering, effects firing during hydration) that the project already engineered away from.

**How it shows:** No store in `core/state/` or any feature folder registers a persistence `effect()` today; all persist through repository awaits (`withPersistedCrud` or hand-rolled methods), and every store carries the PERF-07 `hydrate()`-on-`onInit` pattern that line 96 says doesn't exist.

### CR4-13 — Ticket bookkeeping no longer matches shipped reality (SET-06 as the proven case)

**What:** [`TICKET-SET-06`](../v2/tickets/TICKET-SET-06-move-data-nav-into-settings.md) has its implementation acceptance criteria checked — "[x] `settings.routes.ts` adds a `path: 'data'` child route resolving to `DATA_MANAGEMENT_ROUTES`", "[x] `settings-overview.component.html` renders a link/card into `/settings/data`" — but the shipped code contains neither: there is no `data` child route, no link, and the component is embedded inline instead (CR4-8). Meanwhile the v2 overview still lists SET-06 as unchecked/open, and the ticket's browser-verification criterion is (accurately) unchecked.

**Why:** The ticket system is this project's institutional memory and drives the in-app Roadmap/Changelog via the `story-ticket`/`work-ticket` skills. A checked criterion describing code that doesn't exist poisons every future consumer — reviews like this one, the roadmap page, and any agent told "SET-06's route work is done." Whether the implementation legitimately diverged (embed instead of route) or the ticks were premature, the record and the code disagree, and nothing in the workflow caught it.

**How it shows:** Ticket lines 34–38 vs. `settings.routes.ts` (single `path: ''` route) and `settings-overview.component.html:168`; `docs/v2/overview.md:16` still `[ ]`.

---

## 5. Developer experience

### CR4-14 — The Fallow gate is accumulating un-adjudicated noise again

**What:** A clean-tree `fallow` run reports 6 findings, of which at least three are known-false: `scripts/update-dependency-graphs.mjs` flagged unused (it's invoked by `.husky/pre-commit`, invisible to import analysis), and `import-map-step`'s `parseError`/`headerMismatchMessage` inputs flagged unused (template reads via `@else if (fn(); as alias)` — the component even carries a comment predicting this false positive instead of the suppression that would silence it). The remaining findings (`DATA_MANAGEMENT_ROUTES`, the two bento components) are real (CR4-8/9), but they render at the same severity as the noise.

**Why:** CR3's TICKET-CLEANUP-02 established the discipline: verified false-positive families get codified in `.fallowrc.json` so the `fallow:audit` script and pre-commit usage stay signal-only. That discipline has lapsed for post-CR3 additions — and a gate that's "known to have a few false ones" is a gate people learn to skim past, which is how the real dead code in this run survived unnoticed.

**How it shows:** `.fallowrc.json`'s ignore lists were last extended 2026-07-15; the in-code comment at [import-map-step.component.ts:145–147](../../src/app/feature-import/components/import-map-step/import-map-step.component.ts) documents the false positive in prose rather than registering it where the tool looks.

---

## Reading order for a future ticketing pass

Correctness-adjacent first: CR4-6 (user-visible formatting drift) and CR4-13 (record/code disagreement) are the two items where something is *wrong today*, not merely costly tomorrow. CR4-2/CR4-4 are the highest-value structural investments (same feature, same churn ridge — best done together while import is quiet). CR4-11/12 are cheap and multiply the effectiveness of every future session. The rest are opportunistic.
