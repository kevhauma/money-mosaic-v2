# TICKET-UI-29 — Checkboxes render as circles and read as radio buttons

- **Area:** UI / Theming
- **Type:** Bug fix
- **Traceability:** UX review (UXR-16); `--radius-selector: 1.75rem` on a 20px box makes checkbox and radio visually identical

## User story

As someone ticking options in a form, I want checkboxes to look like checkboxes, so that I can tell independent toggles from a one-of-several choice.

## Current situation (as-is)

Both default themes set the daisyUI selector radius to a value larger than the control itself:

- [styles.css:270](../../../src/styles.css) — `--radius-selector: 1.75rem` (28px)
- [styles.css:348](../../../src/styles.css) — same, for the dark default

daisyUI applies `--radius-selector` to **checkboxes and radios alike**, so at 28px on a 20px box a `.checkbox` is fully round and indistinguishable from a `.radio`.

The consequence is a real misreading, not just an aesthetic one. The edit-transaction modal presents two **independent** toggles — "Exclude from income/expense" and "Always categorise 'FreshMarket' this way" — as two circles, which reads as a mutually exclusive pair. A user who wants both may believe they must choose.

This is systemic to the default theme's design language (soft, pill-shaped, gel), not a one-off slip, and other themes inherit the same risk: `memphis` (999px), `liquid-glass` (2rem), `neumorphism` (2rem). `anti-polish` (0) and `cyberpunk` (0rem) are unaffected.

## Desired result (to-be)

- A checkbox is visually distinguishable from a radio at a glance in every theme.
- The default theme keeps its soft visual language — this is about the shape distinction, not about flattening the aesthetic.
- Checked state remains unambiguous (a tick reads differently from a filled dot).

## Acceptance criteria

- [ ] In both default themes, a checkbox and a radio rendered side by side are visually distinguishable.
- [ ] The same holds in `memphis`, `liquid-glass`, and `neumorphism`.
- [ ] The edit-transaction modal's two independent toggles no longer read as a mutually exclusive pair.
- [ ] The default theme's overall soft visual language is preserved — verified by eye against the current look, not merely by the radius number changing.
- [ ] Checked, unchecked, and indeterminate states remain distinguishable in every theme touched.
- [ ] Verified live in the browser across the default light theme, default dark, and at least one of `memphis` / `liquid-glass` / `neumorphism`.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- daisyUI reuses one token for both control types, so a theme-level fix means either giving checkboxes their own radius or overriding `.checkbox` specifically. Prefer whichever keeps future themes safe by default.
- Related: [TICKET-UI-27](./TICKET-UI-27-separate-money-colours-from-brand-colour.md) — same shape of problem, where one theme token is asked to carry two meanings.
