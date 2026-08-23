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

- [ ] `/help` and `/help/faq` render no literal markdown emphasis markers.
- [ ] All guide and FAQ strings are audited, not just the known `guides.ts:150` case — report how many were found.
- [ ] Emphasis intent is preserved through whatever mechanism the renderer supports.
- [ ] A guard prevents new content reintroducing unrendered markup — a lint rule or a unit test over the content data, not a review convention.
- [ ] Unit tests cover: the guard fails on a fixture string containing emphasis markers; existing content passes.
- [ ] Verified live in the browser on `/help` and `/help/faq`.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Two options: strip the markup from the content and express emphasis structurally, or teach the renderer a minimal subset. The former is smaller and matches how the data is currently modelled.
- Worth auditing [changelog-entries.ts](../../../src/app/feature-changelog/data/changelog-entries.ts) and [roadmap-entries.ts](../../../src/app/feature-changelog/data/roadmap-entries.ts) with the same guard — they are the same kind of hand-authored content string.
