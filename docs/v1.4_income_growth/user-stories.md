# Money Mosaic — v1.4 Income growth

Every prior stat release (v1.0's FR-STAT-1..7, v1.3's FR-STAT-8..13) treats income as one lump figure per
period, folded into the dashboard — a single number on a stat card, one line on the income/expense trend
chart, one bucket in the category breakdown. v1.4 pulls income out into its **own routed page and feature
area** and turns it from a number into a *trend the user can trust*: is it actually growing, shrinking, or
just noisy — broken down by source, tracked year over year and across multiple years, smoothed against
one-off noise (including *real but lumpy* income like a 13th month or vacation pay), flagged when
something structurally changes (a raise, a pay cut, a stream that quietly stopped), and checked against
gross pay so a shifting take-home ratio doesn't hide inside "net income is up."

**Scope is personal income only** (transactions in a `kind: 'income'` category — Salary, Other Income,
any custom income category the user adds). This is deliberately *not* the household/joint-account
view: `joint-contributor-breakdown.ts` (v1.1/v1.3-in-progress) already answers "who put money into this
joint account," which is a different question living on the account detail page. Conflating the two would
make "my income is up 8%" mean something different depending on whether a partner happened to pay in
extra that month — so this vision keeps them as two separate concepts.

**No new recurring/one-off classification for *whether* something counts as income.** Rather than
inferring cadence, v1.4 reuses the existing income *categories* the user already assigns, and lets the
user choose which ones count toward "my income growth" (FR-INC-3) — e.g. excluding "Other Income" if
it's mostly noisy one-off gifts/refunds, so a bonus month doesn't get read as sustained growth without
the user's say-so. The same selection feeds the gross/net ratio (FR-INC-11), so "net income" always means
the same thing across the whole page. Separately, FR-INC-4 lets the user flag a category as *lumpy but
real* (an annual bonus that should still count as income, just not as a monthly spike) — that's a display
smoothing choice, not an inclusion/exclusion choice, so it's kept as its own story rather than overloaded
onto FR-INC-3.

**Architecture:** a new routed feature, `/income` → `feature-income/` (own `income.store.ts`,
`income.routes.ts`, nav entry — same shape as `feature-accounts`/`feature-transactions`), *not* a
dashboard panel. New pure aggregation lives in `core/stats/` alongside the existing helpers (yearly
rollup, multi-year comparison, annual-smoothing, step-change/gap detection). Two schema-level additions:
- The "annual lump sum" flag (FR-INC-4) is a new optional, non-indexed field on `Category` (e.g.
  `smoothAnnually?: boolean`) — additive with no Dexie version bump needed, since Dexie's `.stores()`
  only declares indexes, not the full field set.
- The gross wage figure (FR-INC-10) is the one new piece of **user input** this version adds — bank CSVs
  never contain gross pay, so it can't be derived. That needs an actual new table,
  `grossWageEntries` (schema **v7**, no `.upgrade()` needed — new empty table), with its own thin
  repository (`gross-wage.repository.ts`) following the existing one-repository-per-entity convention,
  keyed by month (`yearMonth: 'YYYY-MM'`, `grossAmount`).

## 9. Income (FR-INC — new)

- [ ] As a user, I want a dedicated Income page (its own nav item, its own store), so tracking how my
      income moves over time isn't squeezed into the general dashboard alongside expenses
      ([TICKET-INC-01](./tickets/TICKET-INC-01-income-page-scaffold.md), adds FR-INC-1)
- [ ] As a user, I want an income-by-category trend chart on this page (one line/area per income
      category, bucketed at my chosen granularity), so I can see whether growth is coming from my
      salary or from elsewhere, rather than staring at one lumped-together income line
      ([TICKET-INC-02](./tickets/TICKET-INC-02-income-by-category-trend-chart.md), adds FR-INC-2,
      reuses `trend-buckets.ts`'s pattern)
- [ ] As a user, I want to choose which income categories count toward "my income growth" (default: all
      `kind: 'income'` categories), so a one-off gift or refund I don't consider real income doesn't
      distort my growth trend or my gross/net ratio
      ([TICKET-INC-03](./tickets/TICKET-INC-03-income-category-selection.md), adds FR-INC-3)
- [ ] As a user, I want to optionally mark an income category as an **annual lump sum** (13th month,
      vacation pay, a holiday bonus — real income, but deposited once a year), so that single deposit
      doesn't read as a spike on the by-category trend (FR-INC-2), a false spurt in the growth-rate panel
      (FR-INC-5), or a phantom raise/step-change alert (FR-INC-8): when enabled, that category's yearly
      total is spread evenly across the calendar year's months for those views. It still counts in full,
      un-smoothed, toward the yearly and multi-year views (FR-INC-6/FR-INC-7) — those are already
      annual-granularity, so a within-year spike isn't a concern there — and toward the gross/net ratio
      (FR-INC-11) in the actual month it landed, since that's the month the matching gross figure was
      entered for ([TICKET-INC-04](./tickets/TICKET-INC-04-annual-lump-sum-smoothing.md), adds FR-INC-4)
- [ ] As a user, I want a growth-rate panel showing period-over-period and year-over-year growth % for
      my selected income categories (smoothed per FR-INC-4 where applicable), so I can tell "am I
      actually getting ahead" apart from "this month was an outlier"
      ([TICKET-INC-05](./tickets/TICKET-INC-05-income-growth-rate-panel.md), adds FR-INC-5, distinct
      from v1.3's generic YoY delta badge which covers income/expense/net as one dashboard figure, not
      income specifically or per-source)
- [ ] As a user, I want a yearly view — one bar per calendar year across my full history, each with its
      %-change vs. the previous year — so I can see my income trend at a glance without mentally
      averaging monthly buckets ([TICKET-INC-06](./tickets/TICKET-INC-06-yearly-income-view.md), adds
      FR-INC-6)
- [ ] As a user, I want to compare income across a chosen multi-year span (e.g. last 3, last 5, or
      all-time), seeing the aggregate change from the first year in the span to the last, so I can
      answer "how has my income changed over the last few years" rather than only "vs. last year"
      ([TICKET-INC-07](./tickets/TICKET-INC-07-multi-year-income-comparison.md), adds FR-INC-7, distinct
      from FR-INC-6's adjacent-year deltas)
- [ ] As a user, I want to be notified when one of my recurring income categories has a sustained
      step-change in its typical amount (e.g. my salary category jumps from ~€2,500/mo to ~€2,800/mo
      for several consecutive periods), so a raise or pay cut is surfaced instead of buried in a chart —
      categories flagged per FR-INC-4 are evaluated on their smoothed series, so their annual lump sum
      is never mistaken for a step-change
      ([TICKET-INC-08](./tickets/TICKET-INC-08-raise-pay-cut-step-change-detection.md), adds FR-INC-8)
- [ ] As a user, I want to be warned when an income category that used to show up regularly has gone
      quiet longer than its usual cadence, so a lost income stream (job change, ended contract, lapsed
      side income) doesn't just silently drop out of my growth trend
      ([TICKET-INC-09](./tickets/TICKET-INC-09-lost-income-stream-warning.md), adds FR-INC-9)
- [ ] As a user, I want to attach a gross wage amount to each month (manual entry, editable/deletable),
      so I have a gross figure to compare against what actually lands in my account — something no bank
      CSV will ever tell me
      ([TICKET-INC-10](./tickets/TICKET-INC-10-monthly-gross-wage-entry.md), adds FR-INC-10)
- [ ] As a user, I want a gross/net ratio per month (my selected income categories' net total ÷ that
      month's entered gross wage), trended alongside the growth charts, so I can see if my take-home
      rate is drifting — months without a gross entry show no ratio rather than a misleading one
      ([TICKET-INC-11](./tickets/TICKET-INC-11-gross-net-ratio.md), adds FR-INC-11)

## Considered, not ticketed yet

- **Household/joint income view** — deliberately out of scope here; it's the existing account-detail
  concern (`joint-contributor-breakdown.ts`), not a "growth" question. Could get its own v1.4-adjacent
  ticket (a contribution trend over time, not just a snapshot) but that's a different vision than this
  one and shouldn't be numbered under the same FR-INC stories, to avoid conflating "my income" with
  "household inflow."
- **Recurring/one-off inference at the transaction level** (cadence detection per counterparty rather
  than per category) — explicitly deferred; the category-selection control (FR-INC-3) covers the same
  need with much less new logic, by letting the user just exclude noisy categories.
- **Auto-detecting lump-sum/annual categories** (inferring "this looks like a once-a-year bonus" from
  amount/cadence patterns) — explicitly deferred in favour of the manual per-category flag (FR-INC-4);
  consistent with the "no new inferred classification" principle already applied to FR-INC-3.
- **Auto-deriving gross wage** (payslip import/OCR, tax-bracket estimation from net alone) — manual
  monthly entry only for v1.4; deriving gross from net would need country-specific tax-bracket logic
  that's a whole feature on its own.
- **Forecasting/projected income** — already parked in [../v2/requirements.md](../v2/requirements.md)
  under v3 "forecasting/insights"; step-change detection (FR-INC-8) is retrospective only, not a
  predictive model, and the gross/net ratio (FR-INC-11) is a historical trend, not a tax projection —
  neither should grow into one here.
- **Income vs. expense growth comparison** ("is my income growing faster than my spending") — natural
  follow-on once FR-INC-5 exists, but adds a second axis (expense growth) this vision doesn't need to
  carry; worth a ticket once income growth alone has shipped and proven useful.
- **User-configurable step-change/gap-detection thresholds** — FR-INC-8/FR-INC-9 ship with fixed
  constants (±15% / 3-month window; 75% cadence / 6-month minimum). A settings surface for tuning them
  is a reasonable v1.5 follow-up once real usage shows whether the defaults are too noisy or too quiet.
