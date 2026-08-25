# TICKET-INC-23 — Income's onboarding gate is a wall, and skipping it lands on em-dashes

- **Area:** Income
- **Released in:** [v2.3 UX review](../../releases/v2.3_ux_review/overview.md)
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

### Implementation note, 2026-08-24 — this reverses TICKET-PUB-08's placement, not its content

TICKET-PUB-08 put the getting-started guide in front of `/income` on a first visit. The words were
good; standing them in front of the page was the mistake, and the ticket's Notes said so. The gate
(`feature-income/components/income-intro/`) is **deleted**, and the guide is where it always
belonged — one click away in the header, and at length on `/help`.

What replaces it is `app-income-inference-note`: one sentence stating an assumption, beside the
figure that assumption produced, with a disclosure that opens the **real** control. Three of them:

| Assumption | Where it is stated | What opens |
|---|---|---|
| Which categories are annual lump sums | under the trend chart it shapes | `app-income-lump-sum-checklist` |
| Main income category | under the same chart | `app-income-main-category` |
| Career start | on the growth panel, beside "vs. …" | `app-income-career-start` |

Each of the three was a step in the wall. The controls are **projected**, never re-implemented, so
`/income` and `/income/settings` render one of each bound to one store method — the settings page is
still where they are explained at length, it is just no longer the only place they can be reached.
Convention review caught that the lump-sum one was the exception (`income-category-checklist` is
presentational, so both callers were repeating its wiring); `income-lump-sum-checklist` is the
store-bound wrapper that made the claim true.

**"vs. start of career" was the sharpest case.** With no career start set, the baseline is the first
month the *imported history* paid anything — not a career start — and the card said "vs. start of
career" over it anyway. That is the inference the wall existed to prevent and did not. The label now
reads **"vs. your first month on record"** until the user supplies a real date, at which point it
becomes "vs. start of career". Verified live: setting a date flips the label on the spot.

**"(Beta)" is dropped from the sidebar.** It had been there since v1.6 landed and promised nothing
checkable — not "figures may be wrong", not "this will change", just a word. What is still moving is
on the Roadmap tab, which is a claim a reader can act on.

**Three deletions that came with it**, each because leaving them would be code with nothing behind
it: `?from=setup` on `/income/settings` and the banner it showed (the gate was its only producer, so
the branch was unreachable and its spec kept green by setting the input by hand);
`AppSettingsStore.markGuideSeen` and its repository method (the gate was their only caller). The
persisted `appSettings.seenGuideSlugs` field **stays**, with a comment saying nothing writes it —
dropping it would be a migration that buys nothing.

- [x] A first visit to `/income` renders the page's actual content; no blocking gate stands between the user and their income data. (Live on :4210 against a profile whose `appSettings` row did not exist — the genuine first-visit state: the page rendered its header, its trend chart and its three panels. `income-overview.component.spec.ts` → *"renders the page itself on a first visit, not an intro"*, and *"shows the real empty state on a first visit with nothing to count"* — the gate used to take precedence there too, so a user with no income categories saw a wall instead of the one message that would have told them what to do.)
- [x] Every value derived from an inference (career start, main income category, recording method) is corrigible from the panel where it is used. (The three notes above, all three observed live opening their control in place. "Recording method" is read as the lump-sum question — which categories pay out once a year, i.e. whether a 13th month is smoothed — since that is the recording choice the page's own figures depend on; the other half of it, a bonus typed into Salary details, is reached from the chart click that opens that month.)
- [x] Panels with insufficient data state what is missing and what would fill them, rather than rendering "—". (`NO_PERCENT_SHOWN = '—'` became `NO_COMPARISON_YET = 'Not yet'`, with the sub-label already naming the gap — live: *"vs. same month last year · Not yet · no data from a year ago yet"*. The growth panel's own empty state now says what would fill it too. **One "—" is kept on purpose**: `income-yearly-panel`'s `NO_CHANGE_SHOWN`, which labels a compact bar with no room for a sentence and puts the reason in its tooltip — recorded here rather than left implicit, on convention review's prompting.)
- [x] The "vs. start of career" comparison either shows a meaningful figure or explains why it cannot yet — never a bare 0%. (It is no longer bare: the card names the baseline it actually used, and the note directly beneath it says *"No career start set, so this counts from 01/05/2026 — the first month your imported history paid anything"* with the control to correct it. On the seed data the figure is a true 0% — two months that both paid €2,800 — and it now says so about a baseline the reader can check and change.)
- [x] Long-form explanation remains available from `/help` and is not duplicated inline. (The guide is untouched in `feature-help/data/guides.ts` and still linked from the page header; pinned by *"keeps the Guide link in the header, so the long-form explanation stays reachable"*. The notes are one sentence each, about this user's own data, not a copy of the guide.)
- [x] Existing users who already completed setup see no change to their configured values. (No setting's meaning, name or default changed, and the page writes nothing on load — pinned by *"writes nothing on a first visit — a configured user's settings are untouched"*, which asserts `AppSettingsRepository.update` is never called and that a configured career start is what the note reports back. The gate, by contrast, wrote `markGuideSeen` on both of its exits.)
- [x] Unit tests cover: first visit with transactions renders content, not a gate; an inferred career start is surfaced as corrigible; a data-poor panel renders its explanatory empty state; a configured user's stored settings are untouched. (All four in `income-overview.component.spec.ts` → *"no first-visit gate (TICKET-INC-23)"*, plus `income-inference-note.component.spec.ts` for the note's own behaviour — it states the assumption without opening anything, names what its toggle changes, reveals the projected control and closes again — and the growth panel's updated cases for the label switch and "Not yet". 349/349 pass across `feature-income`.)
- [x] Verified live in the browser on a profile that has never visited `/income`. (dev server :4210, 2026-08-24, on a profile with no `appSettings` row at all. Observed: no intro, the page's own content, three inference notes with the wording above, "(Beta)" gone from the sidebar, and the growth cards reading "Not yet" instead of "—". Opening the career-start note and entering 01/03/2024 flipped the card's label to "vs. start of career" and the note to "Counting from 01/03/2024, the career start you set"; Clear put both back. `/income/settings` still renders its five sections, including the lump-sum control now shared with the page.)
- [x] Verified via the fallow skill and coding-conventions skill. (Both fallow CI gates exit 0. `conventions-reviewer` returned eight findings, all applied: the lump-sum control was duplicated rather than shared — the one place the new component's own doc comment was untrue; `?from=setup` was unreachable dead code; `markGuideSeen` had outlived its only caller; three doc comments still described the deleted gate; the coding-conventions and project-map skills both cited the deleted file, and `docs/dependency-graph.md` still had its subgraph (regenerated); `INCOME_GUIDE_SLUG` was exported with no consumer; and the new component had no spec. `ng lint` clean, `ng build --configuration development` compiles, 3504/3504 tests pass.)

## Notes

- This partly reverses TICKET-PUB-08's "guide on first visit" decision. That is deliberate and should be recorded in the ticket's own notes when worked — the guide content is good, its placement as a gate is what fails.
- Decide explicitly what "(Beta)" in the sidebar promises the user, and either explain it in-product or drop it.
- Related: [TICKET-REC-11](../../recurring/tickets/TICKET-REC-11-recurring-needs-correction-affordances.md) — the same pattern of automation the user cannot correct.
