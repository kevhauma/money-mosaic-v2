# TICKET-SET-10 — Default locale ships US date order to a Belgian user

- **Area:** Settings / Formatting
- **Type:** Bug fix
- **Traceability:** UX review (UXR-5); follows [TICKET-NG-10](../v2_code_review/tickets/TICKET-NG-10-locale-aware-formatting.md) (CR4-6), which fixed the formatters but left the default itself US

## User story

As the app's only user, based in Belgium and importing Belgian bank exports, I want dates to render in the order I read them, so that I do not have to decode every date on every screen.

## Current situation (as-is)

[format-settings.ts:13](../../../src/app/shared/utils/format-settings.ts) declares:

```ts
export const DEFAULT_LOCALE = 'en-US';
```

It seeds `locale` at line 23 and is the fallback whenever a user setting is absent (line 42). Every unconfigured install therefore renders `MM/DD/YYYY`.

The result across the app: `08/20/2026` on `/transactions`, `/recurring`, `/income` and `/loans`. On a loan card, `07/01/2046` is genuinely ambiguous — 1 July or 7 January. [date-range-input.component.spec.ts:72](../../../src/app/shared/ui/date-range-input/date-range-input.component.spec.ts) records that this default **replaced** a `DD/MM/YYYY` one, so the current value was chosen, not inherited.

[PRODUCT.md](../../../PRODUCT.md) is unambiguous about who this is for: a single Belgian user, KBC and Belfius exports, EUR. CR4's TICKET-NG-10 already did the hard part — the formatters honour the locale setting. Only the default is wrong.

A UX review also observed four date formats live at once across the app (`08/20/2026`, `2026-08-03`, `2026-04`, `August 2046`); this ticket fixes the default, not that spread.

## Desired result (to-be)

- A fresh install renders dates and numbers the way its actual user reads them, without a trip to Settings.
- The default is derived rather than hardcoded to one country where that is safe — `navigator.language` when it resolves to something supported, falling back to a Belgian default rather than a US one.
- An existing user's stored locale setting is untouched.

## Acceptance criteria

- [ ] A fresh install (empty settings) renders `DD/MM/YYYY` date order and EUR-appropriate number grouping by default.
- [ ] An existing install with a stored `locale` setting keeps that setting — no migration overwrites a user choice.
- [ ] If `navigator.language` detection is used, an unsupported or absent value falls back to the Belgian default, never to `en-US`.
- [ ] The Settings locale control still overrides whatever the default resolved to.
- [ ] Unit tests cover: empty settings resolve to the Belgian default; a stored setting wins over detection; an unrecognised `navigator.language` falls back rather than throwing; the existing NG-10 formatter behaviour is unchanged.
- [ ] Verified live in the browser: `/transactions`, `/loans` and `/recurring` dates all read in day-first order on a fresh profile.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Deliberately not in scope: unifying the four coexisting date formats. That is a wider typographic decision and deserves its own ticket once this default lands.
- Worth checking whether any spec asserts `'en-US'` as an expected value and updating it with a comment, so the default is not silently restored later — the same failure mode as [TICKET-ACC-12](./TICKET-ACC-12-unstack-balance-history-chart.md), where a spec pinned the bug.
