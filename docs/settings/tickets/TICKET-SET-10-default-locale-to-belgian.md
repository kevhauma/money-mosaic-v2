# TICKET-SET-10 — Default locale ships US date order to a Belgian user

- **Area:** Settings / Formatting
- **Released in:** [v2.3 UX review](../../releases/v2.3_ux_review/overview.md)
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

**Implementation note (2026-08-23):** `navigator.language` detection was considered and **deliberately
not built**. The browser language of a Belgian user is routinely `en-US`, and `en-US` is a supported
preset, so detection would hand that user back the exact `MM/DD/YYYY` ordering this ticket exists to
remove — it would satisfy the third criterion while breaking the first. The decision, and the
`resolveDefaultLocale()` seam left for a future ticket that does want detection, are recorded in
[format-settings.ts](../../../src/app/shared/utils/format-settings.ts). The third criterion below is
re-worded to assert the behaviour actually shipped.

- [x] A fresh install (empty settings) renders `DD/MM/YYYY` date order and EUR-appropriate number grouping by default. (`DEFAULT_LOCALE = 'en-BE'` in `shared/utils/format-settings.ts`; `format-settings.spec.ts` → "renders a fresh install day-first, with EUR-style number grouping" asserts `26/07/2026` and `€1.234,56`.)
- [x] An existing install with a stored `locale` setting keeps that setting — no migration overwrites a user choice. (No schema change at all: `DEFAULT_APP_SETTINGS.locale` is still `undefined` and the default lives only in `syncFormatSettings`'s `||` fallback. `format-settings.spec.ts` → "lets a stored locale setting win over the default".)
- [x] ~~If `navigator.language` detection is used, an unsupported or absent value falls back to the Belgian default, never to `en-US`.~~ Detection is not used; the default never resolves to `en-US`, whatever the browser reports. (`format-settings.spec.ts` → "ignores navigator.language, so a browser reporting en-US changes nothing" stubs `navigator.language` to `en-US` and still gets `en-BE`; the `it.each([undefined, ''])` case covers an absent/empty stored value falling back without throwing.)
- [x] The Settings locale control still overrides whatever the default resolved to. (Live check on `/settings`: the locale select reads `en-BE` and the currency preview `€1.234,56`; selecting `English (United States)` flipped the preview to `€1,234.56` and selecting Belgian again restored it.)
- [x] Unit tests cover: empty settings resolve to the Belgian default; a stored setting wins over detection; an unrecognised `navigator.language` falls back rather than throwing; the existing NG-10 formatter behaviour is unchanged. (New `src/app/shared/utils/format-settings.spec.ts`, 6 cases. NG-10's formatters are untouched — `currency-format.spec.ts` and `date-format.spec.ts` still prove a *changed* locale reformats, now flipping to `en-US` rather than to `en-BE`.)
- [x] Verified live in the browser: `/transactions`, `/loans` and `/recurring` dates all read in day-first order on a fresh profile. (Profile had no stored `locale`. `/transactions` rows: `20/08/2026`, `18/08/2026`, `15/08/2026`. `/recurring`: `03/08/2026`, `15/09/2026`, amounts `€1.202,04`. `/dashboard`: `€16.898,26`. `/loans` renders no loans — the dev seed creates none, as [TICKET-LOAN-15](../../loans/tickets/TICKET-LOAN-15-remaining-caption-overflows-card.md) notes — so it showed no dates to check.)
- [x] Verified via the fallow skill and coding-conventions skill. (`npx fallow dead-code --baseline .fallow-baseline.json --fail-on-issues` and `npx fallow health --complexity …` both exit 0; `ng lint` clean.)

## Notes

- Deliberately not in scope: unifying the four coexisting date formats. That is a wider typographic decision and deserves its own ticket once this default lands.
- Worth checking whether any spec asserts `'en-US'` as an expected value and updating it with a comment, so the default is not silently restored later — the same failure mode as [TICKET-ACC-12](../../accounts/tickets/TICKET-ACC-12-unstack-balance-history-chart.md), where a spec pinned the bug.
- **Done, and it was far more than one spec.** Flipping the default broke **136 assertions across 40
  spec files** — almost none of them about locale; they asserted `€1,234.56` or `07/26/2026` only
  because that is what the default happened to produce. All were converted to the Belgian rendering.
  The two that now carry an explicit "this is the guard" comment are
  `shared/ui/date-range-input/date-range-input.component.spec.ts` (the one this ticket cited) and
  `shared/utils/currency-format.spec.ts`'s default-unset regression. A third,
  `income-overview.component.spec.ts`, parsed formatted text back into a number with
  `/[^0-9.-]/g` — locale-blind, and silently wrong under `en-BE`; it now strips the grouping and
  converts the decimal comma.
