# TICKET-PUB-10 — Help guides render literal markdown asterisks

- **Area:** Help / Guides
- **Type:** Bug fix
- **Traceability:** UX review (UXR-22); follows TICKET-PUB-02 (how-to guides), TICKET-PUB-03 (FAQ)

## User story

As someone reading a how-to, I want the text to render as text, so that emphasis markup does not show up as punctuation.

## Current situation (as-is)

Guide content is authored as plain strings and rendered verbatim, but at least one string contains markdown emphasis. [guides.ts:150](../../../src/app/feature-help/data/guides.ts):

```ts
'The Income page takes the money coming *in* and turns it into a trend you can trust: ...'
```

renders on `/help` as literally `the money coming *in*`. The author intended emphasis; the renderer has no markdown support, so the asterisks are shown.

This is a content/renderer mismatch rather than a one-character typo — nothing prevents the next guide string from doing the same, and the guide data is otherwise some of the best writing in the product.

## Desired result (to-be)

- No guide or FAQ string renders stray markup characters.
- Emphasis is expressed in a way the renderer actually supports, so the intent survives.
- The mismatch cannot silently recur as new content is authored.

## Acceptance criteria

- [x] `/help` and `/help/faq` render no literal markdown emphasis markers. (Live scan of `main`'s `innerText` for `*…*`, `` `…` `` and `[…](…)` across all eight help surfaces — the index, all six guide detail pages, and the FAQ: `markers: []` on every one.)
- [x] All guide and FAQ strings are audited, not just the known `guides.ts:150` case — report how many were found. (**Two**, across four datasets and roughly 200 strings. `guides.ts:150`'s `*in*`, and — from the Notes' suggestion to check the changelog too — `changelog-entries.ts:707`'s `a price *cut*`, live on `/changelog` since 2026-08-08. `faq.ts` and `roadmap-entries.ts` were clean.)
- [x] Emphasis intent is preserved through whatever mechanism the renderer supports. (Nothing in the app parses markdown — every one of these strings is interpolated directly, `{{ guide.summary }}` — so both were reworded to carry the contrast lexically, which is how the rest of this content already does it. `the money coming *in*` → `the money coming in — not what goes out`; `a price *cut* is flagged the same way` → `a price cut is flagged the same way, not only a rise`.)
- [x] A guard prevents new content reintroducing unrendered markup — a lint rule or a unit test over the content data, not a review convention. (`shared/utils/unrendered-markup.testing.ts`'s `findUnrenderedMarkup`, asserted over all four datasets: `guides.spec.ts` covers `GUIDES` and `FAQ_ENTRIES`, the new `feature-changelog/data/changelog-content.spec.ts` covers `CHANGELOG_ENTRIES` and `ROADMAP_ENTRIES`. It catches `*em*`, `**strong**`, `_em_`, `` `code` ``, `[label](target)` and heading markers.)
- [x] Unit tests cover: the guard fails on a fixture string containing emphasis markers; existing content passes. (`unrendered-markup.testing.spec.ts`: six fixtures it must flag — including this ticket's own `the money coming *in* and out` — and six real sentences from the shipped content it must leave alone, `snake_case` and `2 * 3 is 6` among them. The four dataset assertions are the "existing content passes" half, and each reports every offender with its location rather than just failing.)
- [x] Verified live in the browser on `/help` and `/help/faq`. (Plus `/changelog`, for the second finding: `markers: []`, and both rewritten sentences render as written.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow dead-code` and `fallow health --complexity` both exit 0 — the new export is a `.testing.ts` helper, the same shape as the existing `format-settings.testing.ts`; `ng lint` clean.)

## Notes

- Two options: strip the markup from the content and express emphasis structurally, or teach the renderer a minimal subset. The former is smaller and matches how the data is currently modelled.
- Worth auditing [changelog-entries.ts](../../../src/app/feature-changelog/data/changelog-entries.ts) and [roadmap-entries.ts](../../../src/app/feature-changelog/data/roadmap-entries.ts) with the same guard — they are the same kind of hand-authored content string. **Done, and it paid for itself**: the changelog held the second of this ticket's two findings. Both files are now under the same guard as the guides.
- The guard is a *testing* helper rather than runtime code on purpose: the content is static and hand-written, so the moment to catch this is when a spec reads the data, not on every render.
