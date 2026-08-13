# Money Mosaic — v2.2 Goals & forecast (Overview)

One question, asked by the user on 2026-08-08: *"I want to buy this (worth X) — if I save like I did
over the past six months, when can I afford it, and what does my net worth look like then?"* Plus four
qualifiers that turn it from a calculator into a tool: **you have more than one thing you want, and
their order matters**; **you decide how far back "like I did" reaches**; **you can insist on having
some money left in the bank afterwards**; and **you can tell it which accounts to consider at all**.

And its inverse, asked on 2026-08-09: *"I already know when I need it — how much do I have to save
each month to get there?"* Same plan, same order, same safety net, read in the opposite direction:
fix the rate and solve for the date ([FUT-05](./tickets/TICKET-FUT-05-goal-affordability-projection.md)),
or fix the date and solve for the rate ([FUT-09](./tickets/TICKET-FUT-09-required-saving-rate-mode.md)).
A page-level **mode toggle** picks which question `/future` is answering; the measured rate stays on
screen in both, as the estimate in the first and as the thing you're falling short of in the second.

This is the app's first **forward-looking** feature. Everything shipped so far is hindsight — stats,
comparisons, heatmaps, Sankey, recurring detection — and the one thing that points at the future,
[TICKET-REC-03](../v2.1_extra_graphs/tickets/TICKET-REC-03-upcoming-bills-calendar.md)'s bill
calendar, projects known events rather than a plan. It closes gap #2 of
[competitive-analysis.md](../v9999_ideas/competitive-analysis.md) ("Goals: save €X for a house by
date Y… we track savings movements but give them no target or narrative"), the gap that analysis
ranked third on effort-to-value, and takes a first step into gap #4 (cash-flow forecasting) without
depending on the budgets of gap #1.

**The mechanic, in one paragraph.** Measure a saving rate from complete calendar months of real
history ([FUT-01](./tickets/TICKET-FUT-01-saving-velocity-aggregate.md)). Take today's net worth,
subtract a safety net the user sets, and walk it forward at that rate through an ordered list of
goals, funding them **top-down** — so goal 2 only starts accumulating once goal 1 is paid for
([FUT-05](./tickets/TICKET-FUT-05-goal-affordability-projection.md)). That single decision is what
makes reordering worth building: dragging a goal up pushes every goal below it further out, which is
exactly the trade-off the user is trying to reason about. Then draw it
([FUT-07](./tickets/TICKET-FUT-07-projected-net-worth-chart.md)) as a sawtooth — rising at the saving
rate, stepping down each time a goal is actually bought — because "when can I afford it" and "what am
I left with" are the same question asked twice. Run that same walk backwards from a date the user
sets and you get the second mode ([FUT-09](./tickets/TICKET-FUT-09-required-saving-rate-mode.md)): the
€/month each dated goal demands, and — because funding is sequential — one plan rate that is the
**maximum** of them, never the sum. The chart then draws that required rate against the measured one,
so the gap is the picture.

**Two limits the user sets on the money, and they are not the same limit.** The **safety net**
([FUT-06](./tickets/TICKET-FUT-06-forecast-controls.md)) is *how much* has to stay untouched — a floor
the projection may never cross, so a goal is only ever scheduled once the balance *above* it covers
the purchase, and the chart draws the floor as a line. The **account scope**
([FUT-08](./tickets/TICKET-FUT-08-account-scope.md)) is *which* money is in the conversation at all —
narrowing both the starting balance and the measured rate to the accounts you pick. "Plan with my
current account, and never take it below €2.000" is both of them at once.

**Two new requirement families**, `FR-FUT-1..6`, and a new area prefix, `TICKET-FUT`. Neither Goals
nor Forecast has been ticketed before.

**This version does change the Dexie schema** — the first since `.version(13)`. Goals are
user-authored rows with an order, which is the definition of an entity table, so
[FUT-02](./tickets/TICKET-FUT-02-goals-persistence.md) adds **one additive `.version(14)` block**
declaring `savingsGoals` and `forecastSettings` and nothing else, with no `.upgrade()` (both tables
are new and empty — the `appSettings`/`salaryMetadata` precedent). No shipped version block is
edited. `forecastSettings` is deliberately *persisted* rather than session-scoped, reversing
`ChartOptionsStore`'s in-memory rule for this one row: a legend that resets on reload is harmless, a
forecast window that silently resets is not. That reversal is argued in FUT-02's Notes rather than
made quietly, and it is why the mode toggle is a field on the same row: `mode` is declared in
`.version(14)`'s type from the start and is non-indexed, so [FUT-09](./tickets/TICKET-FUT-09-required-saving-rate-mode.md)
adds **no second schema change**.

**Honesty is a design constraint here, not a polish pass.** A forecast is the one thing in this app
that can be confidently wrong. So: the projection is a straight line with no compounding, inflation
or interest, and says so; the current partial month never enters the measurement; a lookback longer
than the imported history clamps and reports what it actually measured; a non-positive saving rate
produces an explicit "not at this rate" instead of a divide-by-zero, an `Infinity` or a year-9999
date; and the measured mean is always shown next to the median, min and max it came from
([FUT-06](./tickets/TICKET-FUT-06-forecast-controls.md)). Every one of those is an acceptance
criterion, not a note.

## Recommended order

A single dependency chain with two places it forks — FUT-01/02 are independent of each other, and
FUT-06/07 are independent of each other once FUT-05 lands. FUT-09 comes after FUT-07 because it makes
that chart mode-aware rather than adding one. FUT-08 is deliberately last: it revises FUT-01's
signature and FUT-07's caption, and is far cheaper to build against shipped, working versions of both
than to design around up front.

- [x] [TICKET-FUT-01](./tickets/TICKET-FUT-01-saving-velocity-aggregate.md) — Saving velocity: how much I actually saved per month, over a configurable lookback (adds FR-FUT-1) — first: the pure aggregate every projection consumes, no UI of its own; independent of FUT-02/03, can be built in parallel with them
- [x] [TICKET-FUT-02](./tickets/TICKET-FUT-02-goals-persistence.md) — Goals persistence: `savingsGoals` + `forecastSettings`, their repositories and stores (adds FR-FUT-2) — the version's only Dexie change, `.version(14)`, additive; independent of FUT-01
- [x] [TICKET-FUT-03](./tickets/TICKET-FUT-03-future-page-scaffold.md) — Future page: route, shell, nav item, no date range (adds FR-FUT-3) — the stage every UI ticket below renders into, and where the route-level ECharts provider lives; independent of FUT-01/02
- [x] [TICKET-FUT-04](./tickets/TICKET-FUT-04-goals-list-crud-reorder.md) — Goals list: add, edit, delete, drag into priority order (extends FR-FUT-2) — **needs FUT-02 + FUT-03**; the order it sets is what FUT-05 funds top-down, so it ships before the projection that depends on it
- [x] [TICKET-FUT-05](./tickets/TICKET-FUT-05-goal-affordability-projection.md) — When can I afford it: an ETA per goal, funded in the order I set (adds FR-FUT-4) — **needs FUT-01 + FUT-02 + FUT-04**; the headline ticket, and the one the whole version exists for
- [x] [TICKET-FUT-06](./tickets/TICKET-FUT-06-forecast-controls.md) — Forecast controls: lookback window, what counts as saving, safety net, and the spread behind the number (extends FR-FUT-1) — **needs FUT-05**; until it ships the forecast runs on FUT-02's defaults with no way to change them, which is why it lands early rather than as polish
- [x] [TICKET-FUT-07](./tickets/TICKET-FUT-07-projected-net-worth-chart.md) — Projected net worth: the sawtooth, stepping down as each goal gets bought (adds FR-FUT-5) — **needs FUT-05** + FUT-03's provider scope; independent of FUT-06, reads the same settings
- [x] [TICKET-FUT-09](./tickets/TICKET-FUT-09-required-saving-rate-mode.md) — What do I need to save: hit a goal by a date I choose, and see the gap against what I actually save (adds FR-FUT-6, revises FR-FUT-5) — **needs FUT-05 + FUT-07**; the second mode and its page-level toggle, reusing FUT-05's cumulative targets and making FUT-07's chart mode-aware; no Dexie change of its own
- [x] [TICKET-FUT-08](./tickets/TICKET-FUT-08-account-scope.md) — Only count these accounts: scope the starting balance *and* the measured rate to the accounts I pick (revises FR-FUT-1/FR-FUT-4) — **needs FUT-05 + FUT-06**; last on purpose, and the only ticket here that refactors shipped code (`AccountsStore.netWorth` into a per-account contribution map, so a scoped total can't drift from the Dashboard's card)

## Considered, not ticketed yet

- **Historical net worth as a band behind the projection.** The obvious "before and after" chart —
  and it needs an aggregate that doesn't exist. `computeAccountBalanceHistory`
  ([account-balance-history.ts](../../src/app/core/stats/account-balance-history.ts)) is *explicitly*
  real bank balance and not net worth: TICKET-ACC-07 removed its `JointLegContext`, so joint ownership
  shares, neutral partner inflows and attribution overrides are all out of it by design. Reusing it
  would draw a past that disagrees with both the Dashboard's card and FUT-07's own starting point. A
  proper `computeNetWorthHistory` is a real ticket — it is just not a chart ticket, and is deliberately
  not smuggled into FUT-07.
- **Parallel or weighted goal funding** ("put 40% toward the holiday and 60% toward the car"). It
  produces earlier dates for later goals, and it needs an allocation model the user has to be taught.
  "In what order would you actually buy these?" is a question people can answer unprompted, which is
  why sequential funding ships first. If the ordering proves too blunt against real use, this is the
  next iteration.
- **Solving for the date instead of the rate** — "you can't find another €120/month, but push the
  camera to September and you're already on track".
  [FUT-09](./tickets/TICKET-FUT-09-required-saving-rate-mode.md) answers "what would it take" with a
  number of euros; the third reading answers it with a date, and is the obvious next thing to want
  once the gap turns out to be unaffordable. It is left out because FUT-05 already computes that date
  — it is the goal's ETA — so the feature is a piece of copy and a "use this date" affordance rather
  than new maths, and it is worth designing once both modes have been read against real data.
- **Per-goal account scopes** ("fund the holiday from savings, the laptop from checking").
  [FUT-08](./tickets/TICKET-FUT-08-account-scope.md) gives the *whole forecast* one scope, which is
  what was asked for; per-goal scoping needs a balance and a velocity per goal, and the sequential
  funding model stops making sense once two goals draw on different pots. A real want, a much bigger
  model, and not this version.
- **A per-goal safety net**, on top of the global one. The global floor already guarantees the money
  is there after every purchase, since goals are funded sequentially and the floor holds throughout —
  a per-goal override would only express "I want *more* left after this particular one", which nobody
  has asked for yet.
- **Blending known recurring items into the velocity.** `projectOccurrences`
  ([recurring-projection.ts](../../src/app/core/stats/recurring-projection.ts)) already knows what
  bills are coming, and an annual insurance premium landing in month 4 genuinely changes the answer.
  It is left out because velocity is a *measured* rate: mixing measurement with projection would make
  the headline number impossible to explain, and double-counting a bill that is already inside the
  measured months is an easy way to be quietly wrong. Worth doing once the straight-line version has
  been read against real data.
- **A scratch "what if I bought this?" calculator** that doesn't save a goal. Genuinely tempting, but
  a goal is two fields and a delete button — a second, non-persistent path to the same answer is more
  UI to explain than it saves.
- **Marking a goal as bought, and archiving it.** `SavingsGoal.archived` exists from FUT-02 and gets
  no UI in this version. "I bought it, keep the record" wants a bought-on date and probably a link to
  the transaction that paid for it — a small ticket, but a real one, and not part of answering the
  question this version was built for.
- **Budgets** (gap #1) and **manual assets/liabilities for full net worth** (gap #5). Both were
  ranked alongside goals in the competitive analysis; both are their own versions. This version
  deliberately depends on neither — it forecasts from measured behaviour rather than from declared
  intent, which is what lets it ship without a budgeting model underneath it.

## Definition of Done (applies to every ticket)

Per [../../CLAUDE.md](../../CLAUDE.md): `ng lint` + `ng test` + `ng build --configuration development`
all pass, plus the `Fallow` code-quality check, plus a live browser check for any UI-visible change
(FUT-01 is a pure aggregate verified by its spec; FUT-02 is persistence verified by its repository,
store and data-management round-trip specs; FUT-03 is a scaffold verified by a route and navigation
check). **The one Dexie change in this version is FUT-02's additive `.version(14)`** — two brand-new
tables, no `.upgrade()`, no shipped version block edited, and both tables included in the
data-management export/import/wipe paths so a backup stays complete. Components and stores never touch
`appDb` directly — everything goes through a repository behind `GoalsStore`/`ForecastSettingsStore`,
and views read `@/core/state`. Every new aggregate is a **pure, clock-free function** in `core/stats/`
taking `today` as a parameter, the way `detectRecurringPayments` and `projectOccurrences` already do,
and reuses `computePeriodStats`/`classifyForStats` so a velocity figure can never disagree with the
Dashboard's stat cards for the same month. **`AccountsStore.netWorth()` is the single source for "how
much do I have"** — FUT-05 starts from it, FUT-07's first point *is* it, and FUT-08 may only decompose
it into a per-account map whose values still sum to the identical total. No ticket here derives a
second net-worth figure of its own. User-facing amounts and dates go through
`formatCurrency()`/`localeDate`, the chart through `@/shared/echarts`'s theme helpers, and it ships
the visually-hidden figure table [TICKET-STAT-20](../v1.3_code_review/tickets/TICKET-STAT-20-trend-chart-accessible-numbers.md)
established plus privacy-mode compliance per [TICKET-PRIV-01](../v2/tickets/TICKET-PRIV-01-privacy-mode-dashboard.md).
Reordering must work **from the keyboard**, not by drag alone. **The production bundle budget in
`angular.json` is never raised** — `/future` is lazy and its ECharts provider is route-level, exactly
as `/explore`'s is, and no new charting dependency is introduced.
