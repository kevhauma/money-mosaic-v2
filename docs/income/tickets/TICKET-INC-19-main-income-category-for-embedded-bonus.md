# TICKET-INC-19 — Subtract an embedded bonus from your main income category, not from all of them

- **Area:** Income
- **Released in:** [v1.6 Income & growth](../../releases/v1.6_income_growth/overview.md)
- **Type:** Bug fix
- **Traceability:** revises TICKET-INC-13 (embedded-bonus smoothing) / extends FR-INC-3, FR-INC-10

## User story

As a user with more than one income category, I want to name the category my salary actually lands in, so
the bonus I recorded on a month's salary details is taken off *that* category instead of being shaved off
every income stream I had that month.

## Description

`SalaryMetadata.bonus` says "part of my salary deposit was a 13th month". Today the smoothing pass has no
way of knowing which category that deposit landed in, so it removes the bonus *pro rata across every
income series that was non-zero in that month* — a freelance invoice or a rental payment in the same month
silently loses a slice of a bonus it never paid. This adds one setting, a **main income category**, and
makes the removal come off that category alone.

## Current situation (as-is)

- [embedded-bonus-smoothing.ts](../../../src/app/core/stats/embedded-bonus-smoothing.ts)'s `reshapeSeries`
  removes `bonuses[index] * value / bucketTotals[index]` from **each** series — that series' share of the
  month's total across all selected income categories.
- **Root cause, and a deliberate one:** TICKET-INC-13 chose pro rata because nothing in the model records
  which category a recorded bonus belongs to, and its own docblock says pro rata "keeps it well-defined
  when it isn't [a single income category], without guessing which category the deposit landed in". The
  guess is the missing piece — there is no setting for the user to remove the guesswork with.
- Consequence today, with Salary 3,000 + Freelance 1,000 in a June carrying `bonus: 2000`: 1,500 comes off
  Salary and **500 comes off Freelance**, and 500 of freelance income is then redistributed across the year
  as if it had been a bonus. The annual totals still balance, so nothing looks broken — the month-to-month
  shape of a stream that never paid a bonus is simply wrong.
- Nothing in `appSettings` names a primary income category. The four fields it carries for this page are
  `excludedIncomeCategoryIds`, `smoothedBonusCategoryIds`, `careerStartDate` and `grossColor`
  ([app-db.ts](../../../src/app/core/data-access/app-db.ts)).
- The Income settings page ([income-settings-page.component.ts](../../../src/app/feature-income/components/income-settings-page/income-settings-page.component.ts))
  renders one section component per setting — career start, counted categories, smoothed categories, gross
  colour — which is where a fifth belongs.

## Desired result (to-be)

- New optional `appSettings` field **`mainIncomeCategoryId?: number`** — additive and non-indexed, so **no
  Dexie version bump**, exactly the precedent `smoothedBonusCategoryIds` set. Repository setter
  `setMainIncomeCategoryId`, `AppSettingsStore.setMainIncomeCategoryId`, and on `IncomeStore` a
  `mainIncomeCategoryId()` computed plus a `setMainIncomeCategoryId()` method, following
  `grossColor`/`setGrossColor` line for line.
- New section component `feature-income/components/income-main-category/` on `/income/settings` (a new
  setting ships as its own section component, never another block on the page): a single-select over the
  categories that **count toward growth** (FR-INC-3 — a category the user already excluded has nothing to
  subtract from), plus an explicit **"No main category — split proportionally"** option which is the
  default and reproduces today's behaviour exactly. Copy explains what the setting changes, in the same
  register as the sections beside it.
- `smoothEmbeddedBonuses(trend, salaryMetadataByMonth, granularity, mainIncomeCategoryId?)` takes the id as
  a new optional last parameter:
  - **Set, and that category has a series in the trend:** the whole month's bonus comes off that one
    series, capped at that series' own value in that bucket.
  - **Bonus larger than the main category's value that month:** the remainder falls back to pro rata across
    the other non-zero series, still capped at the month's total (today's `removableBonuses` cap). A month
    where the main category paid less than the recorded bonus is real — the deposit can straddle two
    categories — and it must not silently drop the excess, or the year's total stops balancing.
  - **Unset, or the id names a category not in the current selection** (excluded, archived, deleted):
    identical to today's pro rata, no error state.
- Redistribution is untouched by this ticket — whatever comes off a series is handed back to that same
  series across the year (TICKET-INC-20 changes where it lands).
- `IncomeStore.incomeTrend` passes `mainIncomeCategoryId()` through; `rawIncomeTrend` stays untouched, so
  FR-INC-9's gap detection and FR-INC-11's take-home panel keep reading the real deposit in its real month.
- Deselecting the main category from the growth selection clears the setting, mirroring how
  `toggleIncomeCategory` already prunes `smoothedBonusCategoryIds` — a setting the user can no longer see
  must not keep acting.

## Acceptance criteria

> **Implementation note, 2026-08-02 — the per-series annual-total criterion is superseded.** This
> ticket shipped together with [TICKET-INC-20](./TICKET-INC-20-embedded-bonus-own-series.md), which
> moves the removed bonus onto a series of its own instead of handing it back to the series it came
> off. TICKET-INC-13's "each series' annual total is preserved exactly" property is therefore gone by
> design, and the fourth criterion below is amended to the guarantee that survives: the totals summed
> **across all series** (including the new bonus band), per bucket and per year, are unchanged. Every
> other criterion here is unaffected — this ticket still only decides where the bonus is *taken from*.

- [x] `mainIncomeCategoryId` is added to `AppSettings` + `DEFAULT_APP_SETTINGS` (as `undefined`) with a
      repository setter, and **no new `.version()` block** appears in `app-db.ts`.
      (`app-db.ts:559-573` field + `:604` default, `app-settings.repository.ts:58-62`
      `setMainIncomeCategoryId`; `git diff app-db.ts` shows no `.version(` line added — the last block
      is still `.version(13)`. Repository specs: "setMainIncomeCategoryId writes the singleton row
      without one existing yet", "…preserves unrelated settings and stays a single row",
      "setMainIncomeCategoryId(undefined) clears it without touching the rest of the row".)
- [x] Persistence goes through `AppSettingsRepository` → `AppSettingsStore` → `IncomeStore`; no component
      touches `appDb` directly, and no other store writes the field.
      (`app-settings.store.ts` `setMainIncomeCategoryId` awaits the repository then `patchState`;
      `income.store.ts` exposes `mainIncomeCategoryId` computed + `setMainIncomeCategoryId`;
      `IncomeMainCategoryComponent` only calls the store. `conventions-reviewer` confirmed the chain
      and found no direct `appDb` access outside `core/data-access/`.)
- [x] With a main category set, a month carrying a bonus has the **entire** bonus removed from that
      category's series and **nothing** removed from any other series — unit test over a June with
      Salary 3,000 + Freelance 1,000 and `bonus: 2000`, asserting Freelance's June value is unchanged at
      1,000 before redistribution.
      (`embedded-bonus-smoothing.spec.ts`, "takes the whole bonus off that category and nothing off any
      other series": Salary June 3,000 → 1,000, Freelance's whole series `toEqual` its input.)
- [x] With a main category set, ~~each series' annual total is still preserved exactly, and~~ the year's total
      is unchanged from the raw series — unit test on the same fixture. **Amended per the note above:**
      per-series preservation is superseded by TICKET-INC-20; the test asserts per-bucket and per-year
      totals summed across all series instead.
      (`embedded-bonus-smoothing.spec.ts`, "leaves the year's total unchanged from the raw series, per
      bucket and per year": every bucket's stacked total matches the raw one, year sums to 48,000.)
- [x] A bonus larger than the main category's value that month is capped at that value, with the remainder
      taken pro rata from the other non-zero series and the whole removal still capped at the month's total
      — unit test (Salary 1,000 + Freelance 1,000, `bonus: 1500` → 1,000 off Salary, 500 off Freelance;
      and `bonus: 5000` → the month goes to zero, no series negative, no `NaN`).
      (`embedded-bonus-smoothing.spec.ts`, "caps the removal at the main category's own value, taking the
      rest pro rata from the others" and "drives the month to zero — not below it, and not to NaN — for a
      bonus past the month's total".)
- [x] An unset id, an id for an excluded/archived category, and an id matching no category all fall back to
      today's pro-rata behaviour — unit tests asserting the same output as the no-id call.
      (`embedded-bonus-smoothing.spec.ts` → "falling back to the pro-rata split": three `toEqual(proRata())`
      cases, plus "and the pro-rata split really is the shaving-off-everything behaviour" as the negative
      control. `bonusRemovals` returns `proRataRemovals` whenever `findIndex` misses.)
- [x] `granularity !== 'month'` and "no month in range carries a bonus" still return the input object **by
      reference**, with the new parameter set — the two existing pass-through guards keep holding.
      (`embedded-bonus-smoothing.spec.ts`: "returns the input series unchanged at %s granularity" and
      "returns the input object by reference when no month in range carries a bonus" both now assert the
      `toBe` identity twice — once without the id, once with `mainIncomeCategoryId: 1`.)
- [x] `IncomeStore.toggleIncomeCategory` clears `mainIncomeCategoryId` when the main category is
      deselected — store unit test.
      (`income.store.ts:243-245`; `income.store.spec.ts` → "IncomeStore: mainIncomeCategoryId
      (TICKET-INC-19)": "deselecting the main category from the growth selection clears the setting",
      plus "leaves the setting alone when a different category is deselected" and "re-selecting a
      category does not make it the main one" as the negative controls.)
- [x] The `/income/settings` section renders every counted income category plus the "No main category"
      option, marks the stored one selected, and persists on change — component test; the section is its
      own component under `feature-income/components/`, imported by `IncomeSettingsPageComponent`.
      (`feature-income/components/income-main-category/`, imported by `IncomeSettingsPageComponent` and
      exported from the components barrel. `income-main-category.component.spec.ts` — 9 cases covering
      the option list, the FR-INC-3 filter, archived exclusion, the default, the stored selection, and
      persistence both ways; `income-settings-page.component.spec.ts` → "main income category
      (TICKET-INC-19)" pins the same through the page.)
- [x] Unit tests cover: whole-bonus removal from the main category; other series untouched; per-series and
      per-year totals preserved; the over-cap remainder split; all three fallback cases; the toggle-clears
      pruning; and the settings section's render + persist.
      (All of the above; "per-series" reads as the amended per-bucket/per-year form. Full suite green:
      220 files, 2119 tests.)
- [x] `angular.json` bundle budgets not raised. (`angular.json` untouched — not in `git status`; the dev
      build reports no budget warnings.)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill.
      (`fallow audit --base HEAD` → verdict `pass`: 0 dead-code issues, 0 duplication, 0 boundary
      violations, and all 5 complexity findings `introduced: false`. `conventions-reviewer` reported no
      hard-rule violations; its four actionable findings were applied — `withCleanFormatSettings()` in
      the new spec, a shared `IncomeStore.countedIncomeCategories` computed replacing the derivation
      duplicated across two components, the refreshed `income-category-vm.ts` doc, and a corrected spec
      name.)
- [x] Verified live in the browser: with two income categories active in the same month, set a main
      category, record a bonus, and confirm the second category's month is unchanged on the trend chart.
      (Dev server on :4210, June 2026 carrying Salary 2,800 + Other Income 1,006.42 and `bonus: 1400`.
      **Before** — no main category: chart tooltip read Salary €1,770.16, Other Income **€636.26**, i.e.
      €370.16 shaved off a stream that paid no bonus. **After** — Salary picked under "Main income
      category": Salary €1,400.00, Other Income **€1,006.42, its full untouched deposit**. Per-bucket
      totals identical across both runs (280 / 4,080 / 2,686.42 / 4,080 / 4,080), the setting persisted
      as `mainIncomeCategoryId: 9` on the `appSettings` row, and no console errors.)

## Notes

- **Global setting only, no per-month override** — decided with the user when this was ticketed. A picker on
  the salary details form (visible only once a bonus is entered) was considered and rejected as re-asking
  the same question every bonus month; if a user turns out to have bonuses landing in different categories
  in different months, that's a follow-up on `SalaryMetadata`, not a reason to hold this.
- Pairs with [TICKET-INC-20](./TICKET-INC-20-embedded-bonus-own-series.md), which changes where the removed
  amount is *redistributed to*. This ticket only changes where it is *taken from*; the two are independent
  and either can ship first, but shipping this one first gives INC-20 a single well-defined source.
- The pro-rata fallback is kept rather than removed: it is the correct behaviour for a user who genuinely
  has one income stream (where it is indistinguishable from naming a main category) and the only sane
  answer when the setting is unset.
- No new inference. Guessing the main category from "the biggest income category" was considered and
  rejected for the same reason FR-INC-3 doesn't guess which categories count — the page's whole premise is
  that the user says what their income means.
