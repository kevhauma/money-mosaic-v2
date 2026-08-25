# TICKET-UI-22 — One header per page: title plus its own controls, no subtitles

- **Area:** Shared UI
- **Released in:** [v1.6.2 Interface polish](../../releases/v1.6.2_interface_polish/overview.md)
- **Type:** Refactor
- **Traceability:** revises `docs/reference/ui-layout-spec.md` (page header), extends TICKET-UI-14 (app-shell visual pass)

## User story

As a user, I want every page to open with the same header — its title on the left and that page's own
controls on the right — so I always know where a page's options are, instead of hunting for them among a
sentence of marketing copy, a toolbar in the shell, and buttons scattered down the page.

## Description

Makes `mm-page-header` the single, mandatory home for a page's title *and* its page-level controls, and
drops the `subtitle` input entirely. This is the base ticket for the per-page header work — every page's
own header contents ship as their own ticket ([TICKET-STAT-25](../../dashboard/tickets/TICKET-STAT-25-dashboard-page-header.md),
[TICKET-ACC-08](../../accounts/tickets/TICKET-ACC-08-accounts-page-header.md),
[TICKET-INC-21](../../income/tickets/TICKET-INC-21-income-page-header.md),
[TICKET-CAT-09](../../categories/tickets/TICKET-CAT-09-categories-rules-page-header.md),
[TICKET-ML-18](../../learning/tickets/TICKET-ML-18-learning-page-header.md)) — and this one covers the primitive plus every
page that only needs a title.

## Current situation (as-is)

- [page-header.component.ts](../../../src/app/shared/ui/page-header/page-header.component.ts) takes
  `title` (required) and `subtitle` (optional), and
  [page-header.component.html](../../../src/app/shared/ui/page-header/page-header.component.html) renders
  the subtitle as a `variant="caption"` paragraph under the heading, with two content slots —
  `[title-adornment]` (inline, beside the heading) and `[actions]` (right-aligned).
- **Eleven of the fourteen `mm-page-header` usages pass a subtitle**, and every one is a restatement of
  the title or of the app's marketing copy:
  - `"Every account you track, in one place."` — [accounts-overview.component.html:1](../../../src/app/feature-accounts/components/accounts-overview/accounts-overview.component.html)
  - `"Manage the categories transactions get sorted into."` — [categories-overview.component.html:1](../../../src/app/feature-categories/components/categories-overview/categories-overview.component.html)
  - `"Automatically categorise transactions as they come in."` — [rules-overview.component.html:1](../../../src/app/feature-categories/components/rules-overview/rules-overview.component.html)
  - `"Search, filter, and edit every transaction."` — [transactions-overview.component.html:1](../../../src/app/feature-transactions/components/transactions-overview/transactions-overview.component.html)
  - `"Make Money Mosaic yours"` — [settings-overview.component.html:1](../../../src/app/feature-settings/components/settings-overview/settings-overview.component.html)
  - `"Everything the auto-categoriser knows: its trained status, suggestions, and proposed rules."` — [learning-overview.component.html:1](../../../src/app/feature-learning/components/learning-overview/learning-overview.component.html)
  - `"How your income moves over time — by source, year over year, and against the noise."` — [income-overview.component.html:11](../../../src/app/feature-income/components/income-overview/income-overview.component.html)
  - plus `accounts-detail` (`account.type | titlecase`), `faq-page`, `guides-index`, `guide-detail`,
    `income-settings-page`, `salary-details-page`.
- Only `/dashboard` and `/changelog` already render a bare title.
- **Nothing enforces the shape.** `mm-page-header` is a convention, not a contract: a page can render it
  and still put its controls further down the body, and several do (see the per-page tickets).

## Desired result (to-be)

- **`subtitle` is removed from `PageHeaderComponent`** — the input, the template branch, and every
  call site. A page that genuinely needs an explanatory sentence keeps it in the body, where it belongs
  to the content rather than to the chrome (`/income/settings` and `/income/salary` explain their
  controls per section already, TICKET-INC-18).
- **The header keeps its three slots** — heading, `[title-adornment]`, `[actions]` — and gains one
  documented rule: **a page's page-level controls belong in `[actions]`, not in the body.** "Page-level"
  means anything that reconfigures the whole page (date range, view switch, create-new, show-archived,
  page settings, guide links, re-run); a control scoped to one panel stays on that panel (e.g. a chart's
  own bucket picker).
- **Every page that has no page-level controls renders `<mm-page-header title="…" />` and nothing
  else** — Transactions, Settings, Import, Changelog, FAQ, How-to's, guide detail, income settings,
  salary details, account detail.
- **Account detail keeps its title dynamic** (`[title]="account.name"`) and loses the
  `account.type | titlecase` subtitle — the type is already visible on the page's own balance block.
- `[actions]` wraps on narrow screens exactly as it does today (`mm-flex [wrap]="true"`), so a header
  with four controls degrades to two rows rather than overflowing.

## Acceptance criteria

**Implementation notes (2026-08-02), recorded where the build diverged from the wording above:**

1. **`guide-detail`'s summary is not already in the body** — the "Notes" claim below asked us to
   confirm that `GuideStepsComponent` shows it, and it does not:
   [guide-steps.component.html](../../../src/app/feature-help/components/guide-steps/guide-steps.component.html)
   renders only the numbered steps. Dropping the subtitle would therefore have lost the guide's own
   opening line, so it moved into the body as the first paragraph of the guide's `mm-paper` — which
   is exactly what the to-be section prescribes for "a page that genuinely needs an explanatory
   sentence", not a re-added one-off caption.
2. **"exactly one *self-closing* `<mm-page-header title="…" />`" holds for seven of the ten pages
   listed, not all ten.** Account detail, `/income/settings` and `/income/salary` do have header
   content — five record-level actions and a "Back to income" link respectively — which the
   per-page tickets (TICKET-ACC-08, TICKET-INC-21) explicitly keep. They render
   `<mm-page-header title="…">…actions…</mm-page-header>`, i.e. one header, no subtitle, no body-level
   page controls. The criterion below is amended to say that instead.
3. **`/import` had no `mm-page-header` at all** — it rendered a hand-rolled
   `<mm-text as="h1" class="mb-6 text-xl">Import CSV</mm-text>`. Converted to the primitive, since
   the criterion lists it as a page that must render one.

- [x] `PageHeaderComponent` no longer declares a `subtitle` input, and its template no longer has the
      caption branch. (`page-header.component.ts` is `title` only, with the contract in its doc
      comment; `page-header.component.html` has no `@if (subtitle())` branch.)
- [x] No `.html` in `src/app` passes `subtitle`/`[subtitle]` to `mm-page-header` — `grep` is clean.
      (`grep -rn "subtitle" src/app --include=*.html` returns only the explanatory comment in
      `guide-detail.component.html`; all 13 call sites updated.)
- [x] Every page listed under "no page-level controls" above renders exactly one `mm-page-header` —
      ~~self-closing~~ self-closing where the page has no header actions (Transactions, Settings,
      Import, Changelog, FAQ, How-to's, guide detail), with actions where the per-page tickets keep
      them (account detail, income settings, salary details) — and no page-level control is left in
      the body; component specs on Transactions and Settings assert the heading text and the absence
      of any caption element. (`transactions-overview.component.spec.ts` "opens with a bare
      'Transactions' header and no subtitle caption"; `settings-overview.component.spec.ts` "opens
      with a bare 'Settings' header and no subtitle caption".)
- [x] `page-header.component.spec.ts` covers: the heading renders; `[title-adornment]` projects beside
      the heading; `[actions]` projects into the right-hand group; and no caption/paragraph is rendered
      for any input combination. (Five cases under `describe('PageHeaderComponent: the header
      contract')`, including "renders no caption paragraph for any input combination".)
- [x] The header's action group still wraps rather than overflowing at 375px width; spec asserts the
      `wrap` binding survives. ("keeps the action row wrapping so four controls degrade to two rows at
      375px" asserts the `flex-wrap` class `mm-flex [wrap]="true"` emits.)
- [x] No persistence changes, no Dexie version bump. (Diff touches no file under `core/data-access/`.)
- [x] `angular.json` bundle budgets not raised. (`angular.json` is untouched; dev build reports no
      budget warnings.)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill. (`fallow audit --base HEAD`:
      verdict `pass`, 0 introduced dead-code/complexity/duplication findings; `conventions-reviewer`
      subagent run on the diff.)
- [x] Verified live in the browser: every page opens with a single title row, no subtitle anywhere, and
      no page's controls have gone missing in the move. (Dev server on :4210, swept `/dashboard`,
      `/accounts`, `/accounts/1`, `/transactions`, `/categories`, `/categories/rules`, `/income`,
      `/income/settings`, `/income/salary`, `/learning`, `/settings`, `/import`, `/changelog`, `/help`,
      `/help/faq`, `/help/importing-a-bank-statement` — every route reports its own `h1` and no `p`
      inside `.mm-page-title`; the guide's summary reads as the first body paragraph.)

## Notes

- Deliberately a **removal**, not a `subtitle` that themes hide: a nullable input nothing sets is dead
  surface, and the next page added would set it again.
- The per-page tickets depend on this one only for the contract; they can be built in any order after
  it, and each is independently shippable.
- ~~`guide-detail` currently passes the guide's `summary` as the subtitle. The summary is already the first
  thing `GuideStepsComponent` shows in the body, so removing it from the header loses nothing — confirm
  that while building rather than re-adding a one-off caption.~~ **Confirmed false while building
  (2026-08-02):** `GuideStepsComponent` renders only the numbered steps, so the summary appeared
  nowhere else. It moved into the guide's body paragraph instead — see implementation note 1 above.
