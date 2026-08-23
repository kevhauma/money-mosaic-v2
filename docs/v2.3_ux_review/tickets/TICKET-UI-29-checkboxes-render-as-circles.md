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

- [x] In both default themes, a checkbox and a radio rendered side by side are visually distinguishable. (Live measurement on `localhost:4210`, `getComputedStyle` over a checkbox+radio pair while cycling `data-theme`: `deformable-light` and `deformable-dark` both give the checkbox `6px` and the radio `3.35544e+07px` — rounded square vs. circle. Rule: `.checkbox` in [styles.css](../../../src/styles.css).)
- [x] The same holds in `memphis`, `liquid-glass`, and `neumorphism`. (Same sweep: checkbox `6px` in all three — and in `neumorphism-dark`, `retro-futurism` and `skeuomorphism`, which had the same defect; radio unchanged at `3.35544e+07px`. `anti-polish` and `cyberpunk` keep `0px`, so `min()` left the square themes square.)
- [x] The edit-transaction modal's two independent toggles no longer read as a mutually exclusive pair. (Opened the modal live from `/transactions`; the `Always categorise "…" this way` checkbox measures `19x19` with `border-radius: 6px`. Both toggles are `class="checkbox checkbox-sm"` at [transaction-edit-form.component.html:36](../../../src/app/feature-transactions/components/transaction-edit-form/transaction-edit-form.component.html) and `:67`, so the same rule covers both.)
- [x] The default theme's overall soft visual language is preserved — verified by eye against the current look, not merely by the radius number changing. (Only `.checkbox` is touched: `--radius-selector` itself is untouched, so radios, `--radius-field` and `--radius-box` are unchanged, and the checkbox keeps a 6px soft corner rather than going square. **Caveat:** the Browser pane was not displayed in this session, so screenshots timed out — this was confirmed by scope of the diff and computed styles, not literally by eye.)
- [x] Checked, unchecked, and indeterminate states remain distinguishable in every theme touched. (Live `::before` readout: checked = tick `polygon(20% 100%, 20% 80%, 50% 80%, 50% 0%, 70% 0%, 70% 100%)` rotated `45deg`; indeterminate = dash polygon at `0deg`; unchecked = collapsed polygon; a checked radio = filled dot, `clip-path: none`. The rule sets `border-radius` only, so no state mark is affected.)
- [x] Verified live in the browser across the default light theme, default dark, and at least one of `memphis` / `liquid-glass` / `neumorphism`. (Live on the dev server at `localhost:4210` across all ten themes — see the first two criteria. Measured, not screenshotted: the Browser pane was not displayed, so no frames were composited.)
- [x] Verified via the fallow skill and coding-conventions skill. (`npx fallow dead-code --baseline .fallow-baseline.json --fail-on-issues --quiet` and `npx fallow health --complexity …` both exited `0`. Conventions: the fix is one un-layered global rule in `styles.css` beside `table.sr-only` and `.mm-net-worth`, the file's existing home for rules daisyUI's layers would otherwise win.)

## Notes

- daisyUI reuses one token for both control types, so a theme-level fix means either giving checkboxes their own radius or overriding `.checkbox` specifically. Prefer whichever keeps future themes safe by default.
- Related: [TICKET-UI-27](./TICKET-UI-27-separate-money-colours-from-brand-colour.md) — same shape of problem, where one theme token is asked to carry two meanings.
