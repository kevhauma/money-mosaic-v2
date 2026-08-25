# TICKET-UI-24 — The header gets a start and an end action section

- **Area:** Shared UI
- **Released in:** [v1.6.2 Interface polish](../../releases/v1.6.2_interface_polish/overview.md)
- **Type:** Refactor
- **Traceability:** extends [TICKET-UI-22](./TICKET-UI-22-page-header-contract.md) (page header contract), revises `docs/reference/ui-layout-spec.md` §3

## User story

As a user, I want the controls that say *what I am looking at* to sit next to the page title, and the
controls that *act on it* to stay over on the right, so a header with four controls reads as two
purposeful groups instead of one undifferentiated row I have to scan end to end.

## Description

Splits `mm-page-header`'s single `[actions]` slot into `[actions-start]` (beside the title) and
`[actions-end]` (right-aligned, where today's `[actions]` sits), and moves the two scope controls —
the date range and the Categories/Rules view switch — into the start section. This is the contract
[TICKET-CHG-02](../../help/tickets/TICKET-CHG-02-changelog-roadmap-switch-in-header.md) and
[TICKET-PUB-09](../../help/tickets/TICKET-PUB-09-help-back-link-in-header.md) both build against.

## Current situation (as-is)

- [page-header.component.html](../../../src/app/shared/ui/page-header/page-header.component.html)
  renders a `navbar` bar with two children: a `.mm-page-title` block holding the `h1` plus a
  `[title-adornment]` slot, and a right-hand `.mm-page-actions` group holding `[actions]`.
- **`[title-adornment]` has no callers.** TICKET-STAT-25 was the last one — it turned the Dashboard's
  bare pencil into a labelled `[actions]` button — and `grep -rn "title-adornment" src/app` now
  matches only the primitive itself and its spec. It is dead surface with a slot's name.
- **Everything is in `[actions]`, regardless of what it does.** On `/accounts` that means the
  show-archived toggle, the date range and "Add account" share one right-hand group
  ([accounts-overview.component.html](../../../src/app/feature-accounts/components/accounts-overview/accounts-overview.component.html));
  on `/categories` the view switch sits first in that same group
  ([categories-overview.component.html](../../../src/app/feature-categories/components/categories-overview/categories-overview.component.html),
  [rules-overview.component.html](../../../src/app/feature-categories/components/rules-overview/rules-overview.component.html),
  TICKET-CAT-09); on `/dashboard` it is net worth, the date range and "Dashboard settings"
  ([dashboard-overview.component.html](../../../src/app/feature-dashboard/components/dashboard-overview/dashboard-overview.component.html)).
- So a control that **scopes** the page (which slice of time, which of two views) is visually
  indistinguishable from one that **acts** on it (create, re-run, open settings), and the scope
  controls sit furthest from the title they qualify.

## Desired result (to-be)

- **`mm-page-header` projects three slots:** the `h1`, then `[actions-start]` immediately after it in
  the same left-hand group, then `[actions-end]` right-aligned. `[actions-end]` is what `[actions]`
  is today, renamed.
- **`[title-adornment]` is removed** — the input, the `ng-content`, and its spec case.
  `[actions-start]` is the same position with a name that describes what now goes there, and nothing
  currently projects into it.
- **The rule that decides the section**, documented on the primitive alongside TICKET-UI-22's
  page-level rule: a control that changes **what the page is showing** — date range, view switch,
  back-to-parent — goes in `[actions-start]`; a control that **acts on what is shown** — create,
  re-run, show-archived, page settings — goes in `[actions-end]`.
- **The date range moves to `[actions-start]`** on `/dashboard` and `/accounts`.
- **The Categories/Rules switch moves to `[actions-start]`** on both routes.
- **Resulting header orders:**
  - `/dashboard` — title · date range ‖ net worth · Dashboard settings
  - `/accounts` — title · date range ‖ show archived · Add account
  - `/categories` — title · switch ‖ show archived · Add category
  - `/categories/rules` — title · switch ‖ Re-run rules · Add rule
  - `/income`, `/learning`, and every title-only page are unchanged (nothing scopes them).
- **Both groups wrap independently**, so a narrow screen drops the end group under the start group
  rather than overflowing — the `[wrap]` binding TICKET-UI-22 put on the action group applies to each.
- **Net worth stays in `[actions-end]`** for now; [TICKET-STAT-28](../../dashboard/tickets/TICKET-STAT-28-net-worth-stat-card.md)
  moves it out of the header entirely and can land before or after this.

## Implementation note (2026-08-03)

Beyond the to-be's explicit list, the three existing **back-to-parent** links — "Back to accounts" on
account detail, "Back to income" on `/income/settings` and `/income/salary` — also moved to
`[actions-start]`. The section rule this ticket documents names back-to-parent as a start control, so
leaving them right-aligned would have shipped the rule and its first counter-example in one commit,
and TICKET-PUB-09 places the help pages' back link by the same rule.

## Acceptance criteria

- [x] `PageHeaderComponent` renders `[actions-start]` inside the title group (after the `h1`) and
      `[actions-end]` in the right-hand group; `page-header.component.spec.ts` asserts each projects
      into its own group and neither leaks into the other.
      (`page-header.component.html` — `.mm-page-actions-start` wraps the `h1` + `[actions-start]`,
      `.mm-page-actions` holds `[actions-end]`; spec cases "projects [actions-start] beside the
      heading, not into the end group" and "projects [actions-end] into the right-hand group, not the
      start group" assert containment both ways, plus "orders the header title · [actions-start] ‖
      [actions-end]".)
- [x] `title-adornment` no longer exists in the primitive or anywhere in `src/app` — `grep` is clean,
      and its spec case is replaced by the `[actions-start]` one rather than deleted outright.
      (`grep -rn "title-adornment" src/app` returns nothing; `WithAdornmentHostComponent` became
      `WithBothSectionsHostComponent` and its two cases became the two `[actions-start]`/`[actions-end]`
      containment cases.)
- [x] No `.html` in `src/app` still passes the bare `actions` attribute — `grep` for `actions=` /
      ` actions ` returns only `actions-start`/`actions-end`.
      (`grep -rnE "(<[a-z-]+ |\s)actions(\s|>|/)" --include=*.html src/app` returns nothing outside
      daisyUI's own `card-actions` class; all 10 call sites now read `actions-start`/`actions-end`.)
- [x] `mm-range-grouping-switcher` renders in `[actions-start]` on `/dashboard` and `/accounts`;
      component specs assert the DOM order is title · range · (that page's end controls).
      (`accounts-overview.component.spec.ts` "renders exactly three controls, in the order range ·
      show-archived · add account (TICKET-UI-24)" + "puts the range in the start group…";
      `dashboard-overview.component.spec.ts` "orders the header title · range · net worth · settings
      (TICKET-UI-24)" + "puts the range in the start group and net worth plus settings in the end
      group".)
- [x] `mm-tabs` renders in `[actions-start]` on `/categories` and `/categories/rules`; component specs
      assert the switch is in the start group and each tab's own control is in the end group.
      (Both `categories-overview.component.spec.ts` and `rules-overview.component.spec.ts` gained
      "puts the switch in the start group and this tab's own controls in the end group (TICKET-UI-24)".)
- [x] Both groups carry the `wrap` binding; spec asserts `flex-wrap` on each, so a four-control header
      degrades at 375px rather than overflowing.
      (`page-header.component.spec.ts` "wraps the outer row and both action groups…" asserts
      `flex-wrap` on `mm-flex > div`, `div.mm-page-actions-start` and `div.mm-page-actions`.)
- [x] The section rule is documented in `PageHeaderComponent`'s doc comment, §3 of
      [ui-layout-spec.md](../../reference/ui-layout-spec.md), and the
      `coding-conventions` skill's page-header bullet — all three already carry the TICKET-UI-22
      contract and must not disagree.
      (All three now carry the same sentence: *what the page is showing* → `[actions-start]`,
      *acts on what is shown* → `[actions-end]`.)
- [x] No persistence changes, no Dexie version bump.
      (Diff touches only templates, specs and docs — `git diff --stat` lists no file under
      `core/data-access/`.)
- [x] `angular.json` bundle budgets not raised.
      (`angular.json` is untouched; `ng build --configuration development` reported no budget warnings.)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill.
      (`fallow audit --base HEAD` → verdict `pass`, 0 introduced dead-code/complexity/duplication
      findings across 20 changed files; `ng lint` + `ng test` (2174 tests) + dev build all green.)
- [x] Verified live in the browser: on `/accounts` the range sits beside the title and the toggle plus
      "Add account" stay right; at 375px the two groups stack instead of overflowing.
      (Measured on the dev server at :4210 — screenshots were unavailable this session, so the check
      is DOM geometry. `/accounts` at 1522px: `h1` x=272, `mm-range-grouping-switcher` x=381 on the
      same row and inside `.mm-page-actions-start`; `.mm-page-actions` x=1253 holding the toggle and
      "Add account". At 375px: start group y=72, end group y=158 — stacked — and the header's own
      `scrollWidth - clientWidth` is 0. The page's remaining 10px overflow is `mm-granularity-picker`
      in the chart panel below, which TICKET-ACC-10 removes. `/categories` at 1280px: `mm-tabs` x=397
      beside the `h1` at x=272, toggle + "Add category" in the end group at x=1006. `/dashboard`:
      range x=399 in the start group, net worth + "Dashboard settings" in the end group. No console
      errors on any of the three.)

## Notes

- **A rename with a rule, not just a second slot.** `[actions]` → `[actions-end]` touches all 14
  call sites, which is the cost of making the distinction impossible to ignore at the next one.
  Renaming rather than keeping `[actions]` as an alias is deliberate: an alias would let a new page
  keep dumping everything in one group and stay technically correct.
- Pairs with [TICKET-UI-25](./TICKET-UI-25-sticky-page-header.md) (the same bar, made sticky) — order
  between them doesn't matter, but doing both before the per-page tickets below avoids re-verifying
  every header twice.
- The `/income` header's three links are all destinations rather than scope controls, so they stay in
  `[actions-end]` — TICKET-INC-21's ordering is untouched by this ticket.
