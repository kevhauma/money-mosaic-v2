# TICKET-INC-21 — Income header: guide, settings and salary details, without the subtitle

- **Area:** Income
- **Released in:** [v1.6.2 Interface polish](../../releases/v1.6.2_interface_polish/overview.md)
- **Type:** Refactor
- **Traceability:** revises FR-INC-1 presentation / TICKET-INC-18, needs [TICKET-UI-22](../../design-system/tickets/TICKET-UI-22-page-header-contract.md)

## User story

As a user, I want the Income page's three page-level links — the guide, its settings and its salary
details — to read as one consistent set of header controls, so the page opens with its title and its
options and nothing else.

## Description

Brings `/income` and its two sub-pages onto the header contract: the three action links stay in the
header and are tidied to match the other pages' headers, and the explanatory subtitles come off all
three routes.

## Current situation (as-is)

- [income-overview.component.html:11](../../../src/app/feature-income/components/income-overview/income-overview.component.html)
  already renders all three in `mm-page-header`'s `[actions]` slot — "Guide" (`fullGuideLink`), "Income
  settings" (`/income/settings`) and "Salary details" (`/income/salary`), each a `variant="ghost"`
  `size="sm"` button with a tabler icon. So the *placement* the report asks for is in place; what isn't
  is the rest of the contract.
- **The subtitle is the longest in the app**: `"How your income moves over time — by source, year over
  year, and against the noise."` [TICKET-UI-22](../../design-system/tickets/TICKET-UI-22-page-header-contract.md) removes it.
- **The two sub-pages carry subtitles too** —
  [income-settings-page.component.html](../../../src/app/feature-income/components/income-settings-page/income-settings-page.component.html)
  and [salary-details-page.component.html](../../../src/app/feature-income/components/salary-details-page/salary-details-page.component.html) —
  which is doubly redundant there, since TICKET-INC-18's whole point was that each *section* on those
  pages explains its own control.
- **All three ghost buttons look alike**, so the guide (a reference link) is visually identical to the
  two destinations that change what the page computes.
- The header renders only outside the first-visit intro: the whole page is wrapped in
  `@if (showIntro()) { <app-income-intro /> } @else { … }` (TICKET-PUB-08), so a first-time visitor sees
  no header at all.

## Desired result (to-be)

- **Header order, left to right: Income settings · Salary details · Guide.** The two that change the
  page's numbers come first; the guide is last, as the reference escape hatch. Today the guide leads.
- **The guide reads as secondary**: it keeps `variant="ghost"` while the two settings destinations get
  the same weight as other pages' page-level controls, so the set isn't three identical ghosts.
- **No subtitle on `/income`, `/income/settings` or `/income/salary`.**
- **The two sub-pages keep a visible way back to `/income`** in their headers — check what they have
  today while building and add a "Back to income" action if they rely on the browser's back button.
- **No date range in this header.** `/income` deliberately ignores the shared range and scopes itself to
  `IncomeStore.incomeRange()` (full history clamped to the career start, TICKET-INC-12) — documented in
  [income-overview.component.ts](../../../src/app/feature-income/components/income-overview/income-overview.component.ts).
  [TICKET-UI-23](../../design-system/tickets/TICKET-UI-23-per-page-date-range.md) explicitly does not give this page one.
- **The first-visit intro is untouched** — it still replaces the whole page, header included.

## Acceptance criteria

- [x] The Income header renders the three actions in the order settings · salary · guide; component spec
      asserts DOM order. (`income-overview.component.spec.ts` "links to both configuration pages from
      the header" now expects `['/income/settings', '/income/salary', '/help/getting-started-with-the-income-page']`
      — the guide used to lead.)
- [x] The guide button is visually distinct from the two settings destinations; component spec asserts
      the differing variant. ("gives the guide a different visual weight from the two settings
      destinations" — the guide keeps `btn-ghost`, the two destinations carry the default button weight
      other pages give a page-level control, e.g. Rules' "Re-run rules".)
- [x] No subtitle renders on `/income`, `/income/settings` or `/income/salary`; component specs assert
      absence on all three. ("renders no subtitle on /income"; income-settings-page's "opens with a bare
      header, a way back, and no range control"; salary-details-page's "renders no subtitle and no range
      control".)
- [x] Each header link still navigates to its route (`/income/settings`, `/income/salary`, the guide);
      existing routing specs pass unchanged. (Same DOM-order spec reads the real `href`s; the
      TICKET-PUB-08 "keeps a Guide link in the header afterwards" case still passes untouched.)
- [x] Both sub-pages offer a visible route back to `/income`; component specs assert the link. (Already
      true before this ticket — salary-details-page's "is a real page with a header and a way back" is
      pre-existing, and the new income-settings-page case asserts the same for its route. Nothing had
      to be added to either template.)
- [x] No date-range control renders anywhere on the Income routes; component spec asserts absence.
      ("renders no date-range control anywhere — /income scopes itself to the career start" on the
      overview, plus the two sub-page cases above.)
- [x] The first-visit intro still replaces the page when `showIntro()` is true, and the header returns
      once it's dismissed; existing TICKET-PUB-08 specs pass unchanged. (The `@if (showIntro())` branch
      is untouched; that describe block is green.)
- [x] The action row wraps rather than overflowing at 375px; component spec asserts the wrap binding.
      ("keeps the header action row wrapping at 375px" asserts `flex-wrap` on `div.mm-page-actions`.)
- [x] No persistence changes, no Dexie version bump — `seenGuideSlugs` and every income setting are
      untouched. (Diff is one template block, one comment, and specs.)
- [x] `angular.json` bundle budgets not raised. (Untouched; dev build clean.)
- [x] Verified via the `fallow` skill and the `coding-conventions` skill. (Both pre-commit gate commands
      exit 0.)
- [x] Verified live in the browser: the header reads title · settings · salary · guide with no subtitle,
      and all three still navigate. (Dev server on :4210 — `/income` reports actions
      `["Income settings", "Salary details", "Guide (ghost)"]` with no subtitle and no range control;
      `/income/settings` and `/income/salary` each report their own title, a ghost "Back to income",
      no subtitle and no range control.)

## Notes

- Most of what the report asked for — "move the guide, settings, salary details to the header" — is
  already true; TICKET-INC-18 put them there. What's left is the ordering, the visual weight, and the
  subtitle, which is why this is a small refactor rather than a move.
- **The Income page has no date range on purpose.** Do not "fix" that while touching this header — it's a
  documented departure, and the guide copy (TICKET-PUB-07) explains it to the user.
- Pairs with [TICKET-INC-22](./TICKET-INC-22-income-page-shorter-scroll.md), which trims the page below
  the header; keep them separate so the header change can be verified on its own.
