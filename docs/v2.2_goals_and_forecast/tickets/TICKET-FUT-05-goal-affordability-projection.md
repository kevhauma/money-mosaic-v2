# TICKET-FUT-05 — When can I afford it: an ETA per goal, funded in the order I set

- **Area:** Forecast
- **Type:** Feature
- **Traceability:** adds **FR-FUT-4**, consuming FR-FUT-1's velocity
  ([TICKET-FUT-01](./TICKET-FUT-01-saving-velocity-aggregate.md)) and FR-FUT-2's goals
  ([TICKET-FUT-02](./TICKET-FUT-02-goals-persistence.md)). Rendered onto
  [TICKET-FUT-04](./TICKET-FUT-04-goals-list-crud-reorder.md)'s rows. Privacy-mode compliance per
  [TICKET-PRIV-01](../../v2/tickets/TICKET-PRIV-01-privacy-mode-dashboard.md).

## User story

As someone eyeing a €1.800 purchase, I want the app to tell me the month I could pay for it if I
keep saving the way I have been, so I can decide whether to buy it, wait, or drop something else
down the list.

## Description

The answer this whole version exists for: a pure aggregate that walks the ordered goals forward
month by month from today's spendable balance at the measured saving rate, and a per-goal readout —
"affordable now", "around March 2027, in 7 months", or "not at this rate" — plus an on-track/behind
verdict for any goal with a wanted-by date.

## Current situation (as-is)

- [TICKET-FUT-01](./TICKET-FUT-01-saving-velocity-aggregate.md) gives `perMonth`; nothing turns it
  into a date.
- [TICKET-FUT-04](./TICKET-FUT-04-goals-list-crud-reorder.md) renders goals in a user-set order but
  the order changes nothing yet.
- `AccountsStore.netWorth()` ([accounts.store.ts](../../../src/app/core/state/accounts.store.ts))
  is the app's point-in-time combined figure — opening balances plus every transaction, joint
  accounts weighted by `ownershipShare` and reimbursed transfer legs suppressed. It is what the
  Dashboard's "Net worth" stat card shows
  ([dashboard-overview.component.ts](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.ts)).
- `AccountsStore.dataReady` already exists precisely so a view doesn't present an
  opening-balance-only figure as final while transactions hydrate.
- `ForecastSettings.safetyNetAmount` exists from
  [TICKET-FUT-02](./TICKET-FUT-02-goals-persistence.md) and defaults to 0; its control ships in
  [TICKET-FUT-06](./TICKET-FUT-06-forecast-controls.md), so this ticket reads it and works fine
  before that lands.
- `MS_PER_DAY`/`parseIsoDate`/`formatIsoDate` and the calendar-correct month stepping in
  [recurring-projection.ts](../../../src/app/core/stats/recurring-projection.ts) are the existing
  date-stepping primitives; nothing needs re-inventing.

## Desired result (to-be)

- New pure aggregate `core/stats/goal-affordability.ts`, exported from
  [`core/stats/index.ts`](../../../src/app/core/stats/index.ts):

  ```ts
  export type GoalAffordabilityReason =
    | 'already-affordable'   // spendable balance already covers it (and everything above it)
    | 'projected'            // reachable at this rate, on `affordableOn`
    | 'never-at-this-rate';  // velocity <= 0, or the horizon is exceeded

  export type GoalAffordability = {
    goalId: number;
    /** Sum of this goal's target and every target above it — what the order actually costs. */
    cumulativeTarget: number;
    reason: GoalAffordabilityReason;
    /** Month-end date it becomes affordable; null unless `reason` is 'projected'. */
    affordableOn: string | null;
    /** Whole months from today; 0 for 'already-affordable', null for 'never-at-this-rate'. */
    monthsAway: number | null;
    /** Only when the goal has a `targetDate`: does `affordableOn` land on or before it? */
    onTrack: boolean | null;
  };

  export const computeGoalAffordability = (
    goals: SavingsGoal[],              // already in funding order
    options: {
      today: string;
      startingBalance: number;         // AccountsStore.netWorth()
      safetyNetAmount: number;
      perMonth: number;                // SavingVelocity.perMonth
      horizonMonths?: number;          // default 600 (50 years) — a backstop, not a product limit
    },
  ): GoalAffordability[] => { /* … */ };
  ```

- **Sequential funding.** Goal *n*'s `cumulativeTarget` is the sum of targets 1..*n* in the given
  order. A goal is affordable on the first month-end where
  `startingBalance − safetyNetAmount + perMonth × months ≥ cumulativeTarget`. Dragging a goal up
  therefore delays every goal below it — the point of the ordering.
- **Today counts.** `cumulativeTarget ≤ startingBalance − safetyNetAmount` → `already-affordable`,
  `monthsAway: 0`, no date. Someone who already has the money is told so instead of being given a
  savings plan.
- **`perMonth ≤ 0` is answered, not divided by.** Every not-yet-affordable goal reports
  `never-at-this-rate` with `affordableOn: null` and `monthsAway: null`. No `Infinity`, no `NaN`, no
  year-9999 date ever reaches the template.
- **Calendar-correct month stepping**, reusing the same approach as `projectOccurrences` — a month
  is a calendar month, not 30.44 days, so a 7-month answer names a real month-end.
- Rendering, on FUT-04's rows: a short phrase per goal — "You can buy this now",
  "≈ March 2027 · in 7 months", or "Not at this rate" — plus the cumulative total the goal implies,
  and, when a wanted-by date is set, an on-track/behind chip. A summary line gives the last goal's
  ETA: "all four goals covered by ≈ August 2028".
- Honest states, each with its own copy: no goals yet; velocity with `hasEnoughHistory: false`
  ("not enough complete months yet — import more history or shorten the window"); velocity ≤ 0
  ("you've been spending more than you earned over this window, so nothing here has a date yet").
- The component gates on `AccountsStore.dataReady` before presenting any figure, and supplies
  "today" itself — the aggregate stays clock-free.
- All amounts through `formatCurrency()`, all dates through `localeDate`, all amounts masked under
  privacy mode.

## Acceptance criteria

- [ ] Each goal shows one of: "affordable now", a projected month plus months-away, or an explicit
      "not at this rate" — never a raw number, an `Infinity`, or an invalid date.
- [ ] `cumulativeTarget` is the running sum in the user's order, and reordering the goals changes
      the ETAs of the goals below the moved one (asserted by a spec that reorders and re-computes).
- [ ] A goal whose cumulative target is already covered by `startingBalance − safetyNetAmount` is
      `already-affordable` with `monthsAway: 0` and no date.
- [ ] `perMonth ≤ 0` yields `never-at-this-rate` for every unaffordable goal and does not throw or
      divide by zero; `perMonth > 0` with an unreachable target inside `horizonMonths` also yields
      `never-at-this-rate` rather than an absurd date.
- [ ] `safetyNetAmount` reduces the spendable balance, and raising it can push a goal from
      `already-affordable` to `projected` (asserted).
- [ ] Month stepping is calendar-correct: a projection from 31 January lands on a real month-end,
      and `monthsAway` counts whole calendar months.
- [ ] A goal with a `targetDate` gets `onTrack: true/false` by comparing `affordableOn` to it, and
      `null` when it has no date or no ETA.
- [ ] The summary line reports the last goal's ETA, or says plainly that not every goal has one.
- [ ] The three honest states (no goals, not enough history, negative velocity) each render their
      own message rather than a blank or a zero.
- [ ] Figures are only presented once `AccountsStore.dataReady` is true.
- [ ] The aggregate is a pure function in `core/stats/`, clock-free (`today` is a parameter), with
      no store, repository or Dexie import; the component reads `GoalsStore`/`AccountsStore`/
      `ForecastSettingsStore`/`TransactionsStore` from `@/core/state` only.
- [ ] Every amount honours privacy mode; amounts use `formatCurrency()` and dates `localeDate`.
- [ ] Unit tests cover: cumulative targets in order; reorder changing downstream ETAs; the
      already-affordable branch; `perMonth` of exactly 0 and negative; horizon exceeded; safety net
      flipping a verdict; calendar-correct stepping from a 31st; on-track vs behind against a
      `targetDate`; and each of the three empty/degenerate states in the component.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json`
      budgets untouched.
- [ ] Verified live in the browser: with real imported data, a goal priced just under the current
      spendable balance reads "now", and one priced just above reads a plausible month.
      *(Ask the user first; if declined, note it here rather than ticking.)*
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- **Why net worth is the starting balance and not "savings accounts only".** Net worth is the
  figure the Dashboard already shows and the user can check against their banking app; picking a
  different starting number here would give the app two answers to "how much do I have". The
  safety net is what expresses "but I'm not spending all of it".
- **Why sequential and not parallel funding.** Splitting the monthly rate across goals is a
  plausible alternative and produces earlier dates for later goals — but it needs a per-goal
  allocation the user would have to define, and "in what order would you actually buy these" is a
  question people can answer without being taught a model. Parallel/weighted funding is recorded in
  the version overview as a considered, un-ticketed follow-up.
- **The forecast is a straight line, on purpose.** No compounding, no inflation, no interest, no
  known upcoming bills. Each of those makes the number *look* more precise while making it harder
  to explain, and none of them is measurable from imported bank CSVs alone. FUT-06's spread readout
  (median, min, max) is the honesty mechanism instead.
- Removes FUT-01's temporary `unused-export` suppression — this is its first consumer.
- Needs FUT-01, FUT-02 and FUT-04.
