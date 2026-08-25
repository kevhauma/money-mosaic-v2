# TICKET-FUT-08 — Only count these accounts: scope the forecast to the money I'd actually spend

- **Area:** Forecast
- **Released in:** [v2.2 Goals & forecast](../../releases/v2.2_goals_and_forecast/overview.md)
- **Type:** Feature
- **Traceability:** revises **FR-FUT-1** and **FR-FUT-4**, and gives meaning to
  `ForecastSettings.scopeAccountIds` declared by
  [TICKET-FUT-02](./TICKET-FUT-02-goals-persistence.md). Its control joins
  [TICKET-FUT-06](./TICKET-FUT-06-forecast-controls.md)'s cluster and its starting balance feeds
  [TICKET-FUT-05](./TICKET-FUT-05-goal-affordability-projection.md) and
  [TICKET-FUT-07](./TICKET-FUT-07-projected-net-worth-chart.md).

## User story

As someone whose net worth includes a joint account and a long-term savings pot I'm not going to
raid, I want to tell the forecast which accounts to consider, so both the money it starts from and
the rate it grows at reflect only what I'd actually spend on this purchase.

## Description

An account scope for the whole forecast: pick the accounts that count, and the starting balance, the
measured saving rate and the projected chart all narrow to them together — including the awkward
part, money crossing the boundary between a scoped and an unscoped account.

## Current situation (as-is)

- [TICKET-FUT-05](./TICKET-FUT-05-goal-affordability-projection.md) starts from
  `AccountsStore.netWorth()` — *every* account, joint accounts folded in at the user's stake — and
  [TICKET-FUT-01](./TICKET-FUT-01-saving-velocity-aggregate.md) measures over *every* transaction.
  There is no way to say "just my checking account".
- `netWorth` ([accounts.store.ts](../../../src/app/core/state/accounts.store.ts)) is a
  per-transaction walk: weighted opening balances, then `resolveContribution(...).weight` per
  transaction, with reimbursed transfer legs suppressed. It is **decomposable per account** — every
  term is attributable to one `accountId` — but no per-account map is exposed.
- **The two per-account maps that do exist cannot be summed into it.** `balancesById` is real bank
  balance and, per its own comment, is "unchanged by the contribution model";
  `jointAccountStakeById` is `computeJointAccountStake`, a different computation (contributions
  minus a share of spending). Adding them would produce a number that disagrees with the Dashboard's
  net worth card — the exact trap TICKET-ACC-07 already recorded for
  [`computeAccountBalanceHistory`](../../../src/app/core/stats/account-balance-history.ts).
- [`classifyForStats`](../../../src/app/core/stats/classify-for-stats.ts) decides a leg's fate using
  `isSavingsMovement(transaction, ownSavingsIbans)` and `transaction.transferId != null` — both
  computed over the *whole* account universe. A savings movement returns `kind: 'savings'`, and a
  linked transfer leg returns `kind: 'skip'`. So naively filtering transactions by `accountId`
  before classification silently changes what a cross-account transfer means, without changing how
  it is classified.

## Desired result (to-be)

- **`AccountsStore.netWorthContributionById`** — the existing `netWorth` reduce + per-transaction
  loop refactored into a `Map<accountId, number>`, with `netWorth` becoming the sum of its values.
  A pure extraction: the total must be unchanged, and that is asserted rather than assumed.
- **`ForecastSettings.scopeAccountIds`** carries the selection; `undefined` or empty means every
  account, which is exactly today's behaviour.
- **Starting balance** (FUT-05) becomes the sum of `netWorthContributionById` over the scoped
  accounts. With no scope it equals `AccountsStore.netWorth()` — by construction, not by
  coincidence.
- **`computeSavingVelocity` gains an optional `scopeAccountIds`.** When set:
  - only transactions on scoped accounts are measured;
  - the **classification context stays the full universe** (`accountsById`, `categoriesById`,
    `ownSavingsIbans`), so no leg is reclassified as a side effect of the selection;
  - **but money crossing the scope boundary must move the projected balance.** A savings movement
    or a linked transfer leg whose counterpart account is *outside* the scope counts as an ordinary
    outflow (or inflow), instead of being netted to zero or skipped. Without this rule, scoping to a
    checking account would project a balance that keeps growing by money that has actually left it —
    the single most likely way this feature could be quietly wrong;
  - a leg between two accounts that are *both* in scope still nets to zero, exactly as today.
- **Control** (in FUT-06's cluster): a multi-select of accounts, defaulting to "All accounts". The
  zero-account state is not reachable — unticking the last account reverts to "All accounts" rather
  than producing an empty forecast. Archived accounts are offered only when they carry a non-zero
  net-worth contribution.
- **Stale ids are ignored, not fatal**: an id in `scopeAccountIds` whose account has since been
  deleted is dropped on read, and the selection is treated as whatever accounts still exist.
- **The scope is stated wherever it changes a figure.** FUT-05's summary and FUT-07's chart caption
  name it ("Checking + Savings only — not your full net worth"), so a starting balance that differs
  from the Dashboard's net worth card reads as the setting the user chose, not as a bug.

## Acceptance criteria

- [x] `netWorthContributionById` exists on `AccountsStore` and the sum of its values equals
      `netWorth()` — asserted on a fixture containing a joint account, an `attributionOverride` on a
      non-joint account, and a reimbursed transfer leg, i.e. every branch `resolveContribution` has.
      (Spec "sums to exactly netWorth() across every resolveContribution branch", on exactly that
      fixture; `netWorth` is now *defined* as the sum, so the two cannot drift.)
- [x] `netWorth()` is unchanged by the refactor — the existing `AccountsStore` and dashboard specs
      pass untouched. (The seven pre-existing `netWorth()` assertions in `accounts.store.spec.ts`
      were not edited and still pass, including the "byte-identical to today" regression guard.)
- [x] With no scope set, the forecast's starting balance equals `AccountsStore.netWorth()` exactly.
      (`ForecastStore.startingBalance` returns `netWorth()` itself when the scope is empty — the
      same value, not a re-derivation.)
- [x] With a scope set, the starting balance is the sum of the scoped accounts' contributions, and a
      joint account in scope contributes the user's stake rather than the whole pot. (Spec "holds one
      entry per account, with a joint account carrying only my stake" — 4000 at 50% less my half of
      the shared spend.)
- [x] `computeSavingVelocity` with `scopeAccountIds` measures only scoped accounts' transactions,
      and with the parameter absent produces results identical to before this ticket (asserted
      against the FUT-01 fixtures). (Specs "measures only the scoped accounts' transactions" and "is
      unchanged from FUT-01 when the parameter is absent or the scope is empty"; FUT-01's own 15
      cases were not edited.)
- [x] A transfer between two in-scope accounts nets to zero over the window, on both bases.
      (`it.each` over both bases: the scoped result equals the unscoped one.)
- [x] A transfer from an in-scope account to an out-of-scope account **reduces** the measured
      velocity, and one arriving from an out-of-scope account **increases** it — on both bases, each
      asserted with its own case. This is the ticket's central correctness claim. (Four cases via
      two `it.each` blocks, plus an exact-figure case: a €300 move to an unscoped savings account
      takes the net-cash-flow rate from €1.000 to €850/month, where unscoped it is invisible.
      Note on the arriving case: an inflow only registers on the *savings* basis when it comes from
      a savings account, so that fixture is a withdrawal out of unscoped savings — the case that
      actually exercises both bases.)
- [x] Selecting all accounts explicitly gives the same figures as selecting none. (Spec "is
      identical to no scope when every account is selected explicitly".)
- [x] The account multi-select renders in the forecast controls, persists across a reload, and
      recomputes the ETAs and the chart when changed. (Five component specs; live, scoping to
      "Everyday Checking" recomputed the rate, the rows, the summary and the chart together.)
- [x] Unticking the last remaining account reverts to "All accounts" rather than yielding an empty
      or zero forecast. (Spec "reverts to all accounts when the last one is unticked"; an empty
      array is stored as `undefined` so "all accounts" has one representation. Verified live.)
- [x] A `scopeAccountIds` entry for a deleted account is ignored without an error, and the remaining
      selection still applies. (Spec "ignores an id whose account has since been deleted" — the
      store filters the selection against `accountsById` on read.)
- [x] FUT-05's summary and FUT-07's chart caption name the active scope whenever it is not "all
      accounts". (One shared `scopeSentence` helper used by both. Live: "Everyday Checking only —
      not your full net worth." appeared on both, and disappeared on revert.)
- [x] All settings writes go through `ForecastSettingsStore`; the aggregates stay pure and
      clock-free, with no store or Dexie import. (`setScopeAccountIds` on the store/repository;
      `computeSavingVelocity` takes the scope as a plain `ReadonlySet<number>` option.)
- [x] Unit tests cover: the contribution map summing to net worth across every
      `resolveContribution` branch; scoped vs unscoped starting balance; the joint-account stake in
      scope; the four boundary-crossing cases (in→in, in→out, out→in, both bases); parameter-absent
      equivalence with FUT-01; the last-account revert; the stale-id case; and the caption naming
      the scope. (3 store cases, 8 velocity-scope cases, 5 control cases.)
- [x] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json`
      budgets untouched. (Lint clean; 2953 tests / 264 files green on two consecutive runs;
      `Initial total` unchanged at 2.16 MB.)
- [x] Verified live in the browser: scoping to a single checking account visibly lowers both the
      starting balance and the rate, and the caption explains the difference from the Dashboard's
      net worth card. (Scoping to "Everyday Checking" took the measured rate from **€1.600,10** to
      **€1.297,96/month** — the boundary rule at work, since money moved to the unscoped savings
      account now counts as having left — and flipped "Kitchen" out of *You can buy this now*, since
      the scoped starting balance no longer covers it. Both captions named the scope; unticking it
      restored €1.600,10 and dropped the sentence. No console errors.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow audit --base HEAD` →
      verdict `pass`, 0 introduced findings; the single remaining complexity finding is
      `introduced: false` (a pre-existing `app-db.ts` upgrade block). Five findings were fixed by
      extraction on the way — `weightedOpeningBalance` out of the contribution map, and
      `accountIdsByIban`/`legsByTransfer`/`counterpartOf`/`scopedTransactions` out of the velocity's
      scope handling. Two of my own specs also proved flaky under full-suite load and were made
      deterministic: the whole-page ones now poll with `vi.waitFor` under an explicit per-test
      timeout, and the chart fixtures are destroyed after each test so zrender cannot paint into a
      torn-down canvas.)

## Notes

- **Why `netWorth` is refactored rather than approximated.** The alternative — summing
  `balancesById` for own accounts and `jointAccountStakeById` for joint ones — is one line and is
  wrong: those two maps come from different models, and the total would not match the Dashboard's
  card. Extracting the per-account term out of the computation that already produces the right total
  makes agreement structural. It is the same reasoning TICKET-ACC-07 applied when it kept balance
  history and net worth apart.
- **Why the classification context stays global while the measurement narrows.** Which bucket a leg
  belongs to is a fact about the data (is this a savings movement, is this a linked transfer); which
  legs *count* is the user's question. Conflating the two would mean a category or transfer link
  changing meaning depending on a dropdown, and would make a scoped figure impossible to reconcile
  with an unscoped one.
- **The boundary rule is where this feature earns or loses its trust.** "Money that leaves the scope
  is spent, money that arrives is income" is the only rule under which the projected line matches
  what the selected accounts' balances would actually do. It is deliberately stated as behaviour
  with its own four test cases rather than left to the implementation to discover.
- **This is a different question from the safety net**, and both can be set at once: the scope says
  *which* money the plan may draw on, the safety net says *how much of it* must stay untouched. A
  scope of "Checking" with a €2.000 safety net means "plan with my current account, and never take
  it below two thousand".
- **Not in scope: per-goal accounts.** "Fund the holiday from savings and the laptop from checking"
  is a real want and a much bigger model (per-goal balances, per-goal velocities). One scope for the
  whole forecast answers the question that was actually asked; the per-goal version is recorded in
  the version overview's "Considered, not ticketed yet".
- Needs FUT-05 (a starting balance to narrow) and FUT-06 (a control cluster to live in); it revises
  FUT-01's signature and FUT-07's caption, so it is deliberately last in the build order.
