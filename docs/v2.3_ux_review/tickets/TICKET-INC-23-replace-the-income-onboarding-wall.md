# TICKET-INC-23 — Income's onboarding gate is a wall, and skipping it lands on em-dashes

- **Area:** Income
- **Type:** Bug fix
- **Traceability:** UX review (UXR-14); follows TICKET-PUB-07 / TICKET-PUB-08 (income getting-started guide, guide on first visit)

## User story

As someone opening the Income page for the first time, I want to see my income immediately with any assumptions shown inline, so that I am not asked to read and configure five concepts before the page will show me anything.

## Current situation (as-is)

`/income` gates first use behind roughly **500 words** of instruction. Step 3 alone is one unbroken ~150-word paragraph covering category kinds, un-ticking categories, annual lump sums, "13th month", two mutually exclusive recording methods, and picking a main income category — six concepts with no visual separation.

The gate ends in three competing buttons: "Set up the Income page", "Skip for now", and "Read the full guide" — the last implying that what the user just read was *not* the full guide.

Then the escape hatch fails too. "Skip for now" lands on a page where panels read "—", "no data from a year ago yet", and "No complete calendar year yet", and where "vs. start of career" shows **0%** because the app inferred a career start from the first CSV month. That inference is precisely the error the wall was written to prevent, so the wall does not work *and* it costs the first-run user the page.

The page is also labelled "Income (Beta)" in the sidebar without stating what Beta means for the user.

## Desired result (to-be)

- The page opens with real content on first visit, using stated inferences rather than demanding configuration first.
- Each inference the app makes is corrigible **where its consequence appears** — a "Career started May 2026 — change this" affordance on the panel that uses it, not a settings wall up front.
- Explanatory prose lives in `/help`, where the existing guides already cover this, rather than being duplicated as a gate.
- Panels with genuinely no data say what would populate them, instead of showing a row of em-dashes.

## Acceptance criteria

- [ ] A first visit to `/income` renders the page's actual content; no blocking gate stands between the user and their income data.
- [ ] Every value derived from an inference (career start, main income category, recording method) is corrigible from the panel where it is used.
- [ ] Panels with insufficient data state what is missing and what would fill them, rather than rendering "—".
- [ ] The "vs. start of career" comparison either shows a meaningful figure or explains why it cannot yet — never a bare 0%.
- [ ] Long-form explanation remains available from `/help` and is not duplicated inline.
- [ ] Existing users who already completed setup see no change to their configured values.
- [ ] Unit tests cover: first visit with transactions renders content, not a gate; an inferred career start is surfaced as corrigible; a data-poor panel renders its explanatory empty state; a configured user's stored settings are untouched.
- [ ] Verified live in the browser on a profile that has never visited `/income`.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- This partly reverses TICKET-PUB-08's "guide on first visit" decision. That is deliberate and should be recorded in the ticket's own notes when worked — the guide content is good, its placement as a gate is what fails.
- Decide explicitly what "(Beta)" in the sidebar promises the user, and either explain it in-product or drop it.
- Related: [TICKET-REC-11](./TICKET-REC-11-recurring-needs-correction-affordances.md) — the same pattern of automation the user cannot correct.
