# TICKET-FUT-09 — What do I need to save: hit a goal by a date I choose

- **Area:** Forecast
- **Type:** Feature
- **Traceability:** adds **FR-FUT-6**, the inverse of FR-FUT-4
  ([TICKET-FUT-05](./TICKET-FUT-05-goal-affordability-projection.md)). Consumes FR-FUT-1's velocity
  ([TICKET-FUT-01](./TICKET-FUT-01-saving-velocity-aggregate.md)) as the *comparison* rather than as
  the input, and FR-FUT-2's `targetDate` ([TICKET-FUT-02](./TICKET-FUT-02-goals-persistence.md)) as
  the constraint. Revises FR-FUT-5's chart ([TICKET-FUT-07](./TICKET-FUT-07-projected-net-worth-chart.md)).
  Privacy-mode compliance per
  [TICKET-PRIV-01](../../v2/tickets/TICKET-PRIV-01-privacy-mode-dashboard.md).

## User story

As someone who already knows *when* they need the money — a holiday in June, a car when the lease
ends — I want the app to tell me how much I'd have to put aside each month to get there, and how far
that is from what I actually save, so I can decide whether to change my spending or change my date.

## Description

The second forecast mode. [TICKET-FUT-05](./TICKET-FUT-05-goal-affordability-projection.md) fixes the
rate and solves for the date; this one fixes the date and solves for the rate. A page-level toggle
switches `/future` between the two, the goal rows swap their readout, and the projection chart draws
the required rate instead of the measured one — with the measured rate alongside it, so the gap is
the thing you actually look at.

## Current situation (as-is)

- [TICKET-FUT-05](./TICKET-FUT-05-goal-affordability-projection.md) answers one direction only:
  given `SavingVelocity.perMonth`, when does each goal's `cumulativeTarget` come within reach. A
  `targetDate` on a goal is used solely to stamp the result `onTrack: true/false` — the app never
  says what would *make* it on track.
- `SavingsGoal.targetDate` exists from [TICKET-FUT-02](./TICKET-FUT-02-goals-persistence.md) and is
  captured by [TICKET-FUT-04](./TICKET-FUT-04-goals-list-crud-reorder.md)'s form, but is optional and
  currently carries almost no weight.
- `computeGoalAffordability` ([TICKET-FUT-05](./TICKET-FUT-05-goal-affordability-projection.md))
  already establishes the two things this ticket must not re-derive: the **cumulative target** in the
  user's funding order, and the **spendable balance** (`AccountsStore.netWorth()` −
  `ForecastSettings.safetyNetAmount`).
- `ForecastSettings` ([TICKET-FUT-02](./TICKET-FUT-02-goals-persistence.md)) already declares `mode`
  and the `ForecastMode` union, defaults it to `'when-affordable'`, and leaves it unindexed and
  unread — so this ticket writes an existing field and needs **no Dexie version bump** (the CAT-10
  precedent FUT-02 cites for `scopeAccountIds`), adding only the store setter and reader.
- [TICKET-FUT-07](./TICKET-FUT-07-projected-net-worth-chart.md)'s projection rises at
  `SavingVelocity.perMonth` and steps down at each goal's computed `affordableOn`; nothing in it is
  parameterised by which question is being asked.
- The month-end stepping convention this must match is FUT-05's, itself reusing `projectOccurrences`
  ([recurring-projection.ts](../../../src/app/core/stats/recurring-projection.ts)).

## Desired result (to-be)

- New pure aggregate `core/stats/required-saving-rate.ts`, exported from
  [`core/stats/index.ts`](../../../src/app/core/stats/index.ts):

  ```ts
  // `ForecastMode = 'when-affordable' | 'required-rate'` is declared by FUT-02 in `app-db.ts`
  // (it types the persisted field) and re-used here rather than redeclared.

  export type RequiredSavingReason =
    | 'already-affordable'  // spendable balance already covers it (and everything above it)
    | 'required'            // a positive monthly amount reaches it by `targetDate`
    | 'due-now'             // `targetDate` is this month or past — no whole months left to save
    | 'no-target-date';     // the goal has no wanted-by date; there is nothing to solve for

  export type GoalRequiredSaving = {
    goalId: number;
    /** Identical to FUT-05's: the running sum of targets 1..n in the user's order. */
    cumulativeTarget: number;
    reason: RequiredSavingReason;
    /** Whole month-ends between today and `targetDate`; null when there is no date. */
    monthsAvailable: number | null;
    /** €/month needed to cover `cumulativeTarget` by `targetDate`; null unless 'required'. */
    requiredPerMonth: number | null;
    /** `requiredPerMonth − perMonth`; positive means short by that much. Null unless 'required'. */
    gapPerMonth: number | null;
    /** The whole amount still missing today; only set for 'due-now'. */
    shortfallNow: number | null;
  };

  export type RequiredSavingPlan = {
    goals: GoalRequiredSaving[];
    /** The binding constraint: the largest `requiredPerMonth` across dated goals. */
    planRequiredPerMonth: number | null;
    /** Which goal sets it — the one to move, or to move the date of. */
    bindingGoalId: number | null;
  };

  export const computeRequiredSavingRate = (
    goals: SavingsGoal[],              // already in funding order
    options: {
      today: string;
      startingBalance: number;         // AccountsStore.netWorth()
      safetyNetAmount: number;
      perMonth: number;                // SavingVelocity.perMonth — for the gap, not the maths
    },
  ): RequiredSavingPlan => { /* … */ };
  ```

- **Same cumulative target, same spendable balance, same month grid as FUT-05.** The two modes are
  two readings of one plan, so `cumulativeTarget` is computed the same way and reordering moves the
  required rates exactly as it moves the ETAs. `requiredPerMonth` =
  `(cumulativeTarget − (startingBalance − safetyNetAmount)) / monthsAvailable`.
- **`monthsAvailable` is whole month-ends**, counted the same way FUT-05 counts `monthsAway`: the
  month-ends strictly after `today` and on or before `targetDate`. A goal wanted by 15 March 2027,
  asked on 9 August 2026, has 7 of them — the March month-end falls after the date and does not
  count. The two modes therefore agree: if FUT-05 says a goal lands in 7 months, feeding that date
  back in produces a required rate at or below the measured one.
- **The plan rate is the maximum, not the sum and not the last goal's.** Under sequential funding a
  single rate that satisfies the tightest dated goal satisfies every dated goal above it, so
  `planRequiredPerMonth` is `max(requiredPerMonth)` over the `'required'` goals, and
  `bindingGoalId` names the one that sets it. Summing would be flatly wrong and is asserted against.
- **Every degenerate case is answered, never divided by.** `monthsAvailable === 0` (date in the
  current month or already past) → `'due-now'` with `shortfallNow`, no division. Cumulative target
  already covered → `'already-affordable'`, every figure `null`, and it is excluded from the maximum.
  No `targetDate` → `'no-target-date'`, excluded from the maximum, with the row prompting for a date.
  No `Infinity`, `NaN` or negative required rate ever reaches the template.
- **The measured rate is the comparison, not an input.** A `perMonth` of 0 or below does not break
  this mode — it makes `gapPerMonth` equal the whole required rate, which is the honest reading. This
  mode is therefore usable on histories too thin for FUT-05 to give a date, and says so.
- **Page-level mode toggle** on `/future`, above the goals section (rendered by
  `app-forecast-controls` from [TICKET-FUT-06](./TICKET-FUT-06-forecast-controls.md) when it exists,
  or by the shell otherwise): two options, "When can I afford it?" and "What do I need to save?",
  each with a one-line explanation. It writes `ForecastSettings.mode` through
  `ForecastSettingsStore` and survives a reload.
- **Goal rows swap their readout** with the mode — the same rows from
  [TICKET-FUT-04](./TICKET-FUT-04-goals-list-crud-reorder.md), never a duplicated list:
  - `'required'` → "Save ≈ €340/month to make June 2027" plus the gap
    ("€120/month more than you've been saving", or "€60/month less — you're ahead of this");
  - `'already-affordable'` → "You can buy this now";
  - `'due-now'` → "Wanted this month — you're €400 short right now";
  - `'no-target-date'` → "Add a wanted-by date to see what this needs", with the edit affordance
    pointing at it.
- **Plan summary line**: "To hit every date, save ≈ €340/month — €120/month more than the €220 you've
  averaged. *Camera* is the one setting the pace." Plus, when no goal has a date at all, one line
  explaining that this mode needs dates rather than an empty panel.
- **[TICKET-FUT-07](./TICKET-FUT-07-projected-net-worth-chart.md)'s chart becomes mode-aware**, and
  gains no second component:
  - in `'required-rate'` mode the projected line rises at `planRequiredPerMonth` and steps down at
    each dated goal's `targetDate` rather than at a computed ETA;
  - the measured-rate projection is drawn as a second, dashed comparison series, so the divergence
    between "what this plan needs" and "what I actually do" is the visible content of the chart;
  - the safety-net reference line, the visually-hidden figure table
    ([TICKET-STAT-20](../../v1.3_code_review/tickets/TICKET-STAT-20-trend-chart-accessible-numbers.md))
    and privacy masking all apply unchanged, the table gaining the second series' column;
  - goals with no date are omitted from the required-rate line and counted in the caption, exactly
    as goals with no ETA already are in the other mode.
- The component supplies "today" and gates on `AccountsStore.dataReady`, as FUT-05 does; the
  aggregate stays clock-free. Amounts through `formatCurrency()`, dates through `localeDate`, all
  masked under privacy mode.

## Acceptance criteria

- [ ] A page-level toggle switches `/future` between "When can I afford it?" and "What do I need to
      save?"; the choice persists through `ForecastSettingsStore` and survives a reload.
- [ ] Switching the mode changes the goal-row readout and the chart in the same tick, and does not
      render a second copy of the goals list.
- [ ] `requiredPerMonth` is `(cumulativeTarget − spendable) / monthsAvailable`, and `cumulativeTarget`
      matches `computeGoalAffordability`'s for the same goals and order — asserted against that
      function, not against hand-copied numbers.
- [ ] Reordering goals changes the required rates of the goals below the moved one.
- [ ] `planRequiredPerMonth` is the **maximum** required rate across dated goals, not the sum and not
      the last goal's, and `bindingGoalId` names the goal it came from (asserted with a case where
      an earlier, tighter goal binds).
- [ ] `monthsAvailable` counts whole month-ends after today up to and including `targetDate`, and a
      round trip holds: a date FUT-05 projects for a goal yields a required rate ≤ the measured
      `perMonth` when fed back in.
- [ ] A `targetDate` in the current month or in the past yields `'due-now'` with `shortfallNow` and
      no division; a goal already covered by the spendable balance yields `'already-affordable'`; a
      goal with no `targetDate` yields `'no-target-date'`. None of the three contributes to
      `planRequiredPerMonth`.
- [ ] `perMonth ≤ 0` still produces required rates and a gap equal to the full requirement — this
      mode is not disabled by a thin or negative history, and the copy says what it is comparing to.
- [ ] `safetyNetAmount` raises every required rate, and raising it can flip a goal from
      `'already-affordable'` to `'required'` (asserted).
- [ ] No `Infinity`, `NaN`, negative or absurd rate reaches the template in any of the above.
- [ ] In `'required-rate'` mode the chart rises at `planRequiredPerMonth`, steps down at each dated
      goal's `targetDate`, and draws the measured-rate projection as a dashed comparison series;
      undated goals are omitted and counted in the caption.
- [ ] The chart's first point is still exactly `AccountsStore.netWorth()` in both modes.
- [ ] The visually-hidden figure table covers both series per TICKET-STAT-20, and every amount in
      rows, summary, chart labels, tooltip and table honours privacy mode.
- [ ] No Dexie version bump: `mode` is a non-indexed field on the existing `forecastSettings` row,
      written through `ForecastSettingsStore`'s read-merge-put setter, and versions 1–14 are
      untouched.
- [ ] The aggregate is a pure, clock-free function in `core/stats/` (`today` a parameter) with no
      store, repository or Dexie import; components read `@/core/state` only.
- [ ] Unit tests cover: the required-rate formula; cumulative targets agreeing with
      `computeGoalAffordability`; reorder changing downstream rates; the maximum-not-sum plan rate
      with an earlier binding goal; the FUT-05 round trip; `monthsAvailable` from a 31st and across a
      year boundary; `'due-now'`, `'already-affordable'` and `'no-target-date'`; `perMonth` of 0 and
      negative; the safety net flipping a verdict; mode persistence; the chart's two series and its
      step-downs on `targetDate`; the no-dated-goals empty state; and privacy masking.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json`
      budgets untouched — no new component tree and no new charting dependency.
- [ ] Verified live in the browser: with real data, a goal dated a few months out shows a plausible
      monthly figure and a gap against the measured rate, and moving its date visibly changes both.
      *(Ask the user first; if declined, note it here rather than ticking.)*
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- **Why a mode toggle and not both answers on every row.** They are the same plan read in opposite
  directions, and showing both at once means every row carries a date the user didn't ask for next to
  a rate they didn't ask for. A toggle makes the page answer one question at a time, which is how the
  question actually arrives — you either know when you need it or you don't.
- **Why the plan rate is a maximum.** Sequential funding means goal *n* is only reached after every
  goal above it is paid; a rate that clears the tightest deadline therefore clears the looser ones by
  construction. The temptation is to sum the per-goal rates, which double-counts the same euros and
  produces a number roughly *k* times too large for *k* goals.
- **Why it is `mode` on `forecastSettings` and not component state.** It changes what every figure on
  the page means, so a silent reset to the other mode on reload would misread as the app changing its
  answer — the same argument FUT-02's Notes make for the lookback window, and the same reason
  `ChartOptionsStore`'s in-memory rule stays reversed for this row.
- **The required rate is exact in the aggregate and "about" in the copy.** `formatCurrency()` rounds
  to cents for display; the phrasing is "save ≈ €340/month" rather than an exact-looking figure,
  because a displayed rate rounded down would under-fund the goal by a rounding error per month.
- **This mode inherits every simplification in FUT-05's Notes** — straight line, no compounding, no
  inflation, no interest, no known upcoming bills — and one of its own: it assumes the required rate
  starts *this* month and holds every month until the date. It does not schedule a lump sum, and it
  does not front-load or back-load.
- **What it deliberately does not do:** solve for a *date change* instead of a rate change ("push the
  camera to September and you're already on track"), and solve per goal against separate rates. The
  first is a genuinely good follow-up and is recorded in the version overview; the second is the
  parallel-funding model already ruled out for this version.
- Needs FUT-05 (cumulative targets and spendable balance) and FUT-07 (the chart it makes mode-aware).
  [TICKET-FUT-08](./TICKET-FUT-08-account-scope.md)'s scoping reaches this aggregate for free — it
  takes `startingBalance` and `perMonth` as options, exactly as FUT-05 does.
