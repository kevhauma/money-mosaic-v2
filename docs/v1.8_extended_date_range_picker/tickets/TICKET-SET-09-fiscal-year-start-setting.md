# TICKET-SET-09 — Fiscal year start month in Settings

- **Area:** App Settings
- **Type:** Feature
- **Traceability:** new capability from [v1.8's requirements sketch](../requirements.md) (the
  "Previous fiscal quarter" / "Previous fiscal year" quick ranges); no existing FR-* covers a fiscal
  calendar. Follows the additive-`appSettings`-field pattern of
  [TICKET-SET-04](../../v2/tickets/TICKET-SET-04-locale-setting.md) and
  [TICKET-INC-12](../../v1.6_income_growth/tickets/TICKET-INC-12-career-start-date.md), and the
  one-component-per-section structure of
  [TICKET-SET-07](../../v2_code_review/tickets/TICKET-SET-07-settings-section-components.md).

## User story

As someone whose financial year doesn't start in January, I want to tell the app which month it does
start in, so "previous fiscal year" means my year rather than the calendar's.

## Description

One setting — the month a fiscal year begins — persisted on the existing `appSettings` row and
rendered in its own small Settings section. Nothing consumes it in this ticket; it exists so
[STAT-37](./TICKET-STAT-37-quick-range-catalogue.md)'s two fiscal quick ranges have a boundary to
resolve against.

## Current situation (as-is)

- Every period helper in the app assumes the calendar year. `resolvePresetRange`
  ([date-buckets.ts:147](../../../src/app/shared/utils/date-buckets.ts)) derives quarters as
  `Math.floor(month / 3) * 3` and years as January-to-December (lines 176–197); nothing anywhere
  reads a fiscal offset because none is stored.
- [`AppSettings`](../../../src/app/core/data-access/app-db.ts) (line 509) is the singleton settings
  row, already carrying nine independent optional fields (`primaryColor`, `currencySymbol`, `locale`,
  `excludedIncomeCategoryIds`, `careerStartDate`, `privacyMode`, …), each documented as an additive
  field needing **no Dexie version bump** because `.stores()` declares indexes, not fields.
- [`app-settings.repository.ts`](../../../src/app/core/data-access/app-settings.repository.ts) gives
  each field a read-merge-put setter — never `.update()`, because the table isn't seeded on
  `populate` — and [`AppSettingsStore`](../../../src/app/core/state/app-settings.store.ts) wraps each
  one with a `patchState` twin.
- [`settings-overview.component.html`](../../../src/app/feature-settings/components/settings-overview/settings-overview.component.html)
  composes five sibling section components (Theme, Currency & locale, Privacy, Data, About), each its
  own `app-settings-*-section` under `feature-settings/components/`.
- Section controls are reactive-form bound and written back through the shared
  [`linkControlToSetting`](../../../src/app/shared/utils/link-control-to-setting.ts) helper, which
  owns the `emitEvent: false` write-back.

## Desired result (to-be)

- `AppSettings` gains `fiscalYearStartMonth: number | undefined` — 1–12, where `undefined` means
  January, i.e. today's exact calendar-year behaviour. Required-but-possibly-`undefined` rather than
  optional, per the `withState` accessor-optionality note the neighbouring fields carry.
- A read-merge-put `setFiscalYearStartMonth` on `AppSettingsRepository` and its `patchState` twin on
  `AppSettingsStore`. **No `.version(n+1)`** — additive field only.
- New `app-settings-reporting-section` under `feature-settings/components/settings-reporting-section/`,
  `OnPush`, exported through the feature's components barrel, rendered between Currency & locale and
  Privacy in `settings-overview.component.html`.
- The control is a month `<select>` (`mm-select`, twelve locale-formatted month names via the
  existing date helpers), labelled so the consequence is legible — e.g. "Fiscal year starts in ·
  April → your fiscal year runs April 2026 – March 2027" with the derived span shown live under the
  field.
- Changing it persists immediately and survives a reload, like every other setting in the page.

## Acceptance criteria

- [ ] `fiscalYearStartMonth` is added to `AppSettings` and `DEFAULT_APP_SETTINGS` as `undefined`,
      with **no new `.version()` block** in `app-db.ts`.
- [ ] `AppSettingsRepository.setFiscalYearStartMonth` uses read-merge-put and leaves every other
      field on the row intact — asserted by writing it on a row that already carries a locale and a
      currency symbol and reading all three back.
- [ ] The setting is written through `AppSettingsStore` from `@/core/state`; the section component
      imports no repository and no Dexie symbol.
- [ ] The section renders twelve month options, reflects the persisted value on load, and falls back
      to January when the field has never been written.
- [ ] The live span readout updates with the selection and states both ends (April → "April 2026 –
      March 2027").
- [ ] Selecting January stores it explicitly rather than clearing to `undefined` — an unset field and
      a deliberate January must be indistinguishable in behaviour but the user's choice is still
      recorded.
- [ ] The value survives a reload.
- [ ] Nothing else in the app changes behaviour as a result of this ticket — the existing quarter and
      year presets stay calendar-based until
      [STAT-37](./TICKET-STAT-37-quick-range-catalogue.md) ships.
- [ ] Unit tests cover: the repository's read-merge-put not clobbering neighbours; the default when
      unwritten; a persisted value reflected on load; the derived span readout; the explicit-January
      case.
- [ ] `ng lint` + `ng test` + `ng build --configuration development` all pass; `angular.json`
      budgets untouched.
- [ ] Verified live in the browser: setting a non-January month and reloading Settings brings it back.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- **Why a new section rather than a field in Currency & locale.** That section is documented as
  display formatting — "display-only — nothing here converts between currencies". A fiscal boundary
  changes what a *period* means, not how a number is rendered. A "Reporting" section is also the
  obvious home for anything later in this family (week start, for instance). The cheaper alternative
  — one more field under Currency & locale — was rejected on that reading, not on effort.
- **Why the setting ships before anything reads it.** It is the only piece of
  [STAT-37](./TICKET-STAT-37-quick-range-catalogue.md) that touches persistence and Settings, and
  keeping it separate leaves STAT-37 purely a catalogue change. The tradeoff is one intentionally
  inert release — recorded above as an acceptance criterion so it isn't mistaken for a defect.
- **Scope: fiscal *quarters* follow the fiscal year start**, i.e. a fiscal year starting in April has
  Q1 = April–June. That is the only sensible reading and is what STAT-37 will implement; it is stated
  here because the setting's label must not imply it only affects the year.
- Independent of every other ticket in this version and shippable at any point before STAT-37.
