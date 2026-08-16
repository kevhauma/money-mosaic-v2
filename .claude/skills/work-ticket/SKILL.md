---
name: work-ticket
description: Work a ticket end-to-end — read it, plan the implementation, build it, tick each acceptance criterion as it verifiably passes, then check off the ticket's line in overview.md. Use whenever someone says "work on a ticket", "start ticket TICKET-XXX", "implement this ticket", "pick up TICKET-ACC-01", or points you at a ticket file to build.
---

# Work a ticket to done

Drive one ticket from "not started" to "story checked off". The ticket is the source of
truth: its **Acceptance criteria** are the contract, and each maps to that ticket's own
**User story** section — and to the matching title+checkbox line in the version's
`overview.md` — which must be checked off once every criterion passes.

**Never assume the docs layout or which versions exist — discover it at runtime.** Tickets
live in `docs/<version>/tickets/TICKET-<PREFIX>-<NN>-*.md`; the version's `overview.md`
carries a title+checkbox line per ticket, **listed in recommended build order top to bottom
— not grouped by area**. Mirror what you find; don't hardcode `v1`.

## Step 1 — Locate the ticket

- **If the user named a ticket** (ID like `TICKET-ACC-01`, a prefix+number, or a path),
  open that file. If only a partial ID was given, glob `docs/*/tickets/` to resolve it.
- **If no ticket was named**, scan `docs/*/tickets/` and the version's `overview.md`
  for **open** work — lines still marked `- [ ]` that link to a ticket — and ask via
  `AskUserQuestion` which one to work. The **first open, ticketed line** in `overview.md`
  is the suggested next ticket (the list is already in build order); check its trailing
  note for an unmet dependency before suggesting it, and present the real, currently-open
  tickets you found — don't recite a remembered list.

Confirm you have the right file before proceeding.

## Step 2 — Read and orient

Read the **whole** ticket, not just the criteria:

- **User story** — who this is for and why, in the classic "As a … I want … so …" form.
- **Description** — what it delivers and why.
- **Current situation (as-is)** — follow its clickable file links to the *real* code so you
  understand today's behaviour (and, for bugs, the named root cause).
- **Desired result (to-be)** — the target behaviour.
- **Acceptance criteria** — every `- [ ]`; these are your checklist.
- **Notes** — edge cases, related tickets, scope caveats.

Pull project knowledge only as needed: the `project-map` skill to locate code, `data-model`
for schema/repository rules, and the `spec-navigator` subagent for FR-* / requirement
questions. Then **restate the ticket's intent in one or two sentences** so the user can
confirm you understood it.

## Step 3 — Plan, then pause for approval

Produce a concrete implementation plan **mapped to the acceptance criteria** — which
components/stores/repositories/services change, which unit tests get added (name the cases),
and which UI is touched. Respect the repo's hard rules while planning:

- Persistence goes through a repository/store in `core/data-access/` — **never** direct
  `appDb` table writes from components/stores.
- Dexie schema changes are **additive** (`.version(n+1).stores(...)` + `.upgrade()`), never
  edit a shipped version block.
- Rules never overwrite a user-set category (`categoryManual`).
- Cross-feature imports go through the feature barrel (`@/feature-x`), not deep paths.
- **Never** raise `angular.json` bundle budgets — lazy-load or diet dependencies instead.

Track the steps with `TaskCreate`/`TodoWrite`. **Present the plan and wait for the user's
go-ahead before editing any code.**

## Step 4 — Implement

Work the plan criterion by criterion, following the coding conventions in
`.claude/skills/coding-conventions/SKILL.md` (the `frontend-conventions` skill, which
auto-attaches when you edit `.ts`/`.html`/`.css`) plus the `data-model` and `project-map`
skills. Keep changes scoped to this ticket —
resist unrelated refactors; if you spot out-of-scope work, note it rather than doing it.

If this ticket meaningfully changes any behavior that's documented in the how-to guides, also update the matching how-to guide in
`src/app/feature-help/data/guides.ts` (TICKET-PUB-02) so its steps keep matching the real UI. If the ticket is big and complex enough, include it into a how-to guide

**If the implementation diverges from an acceptance criterion, record the divergence at the
moment you pivot** — edit the criterion then, in the same change, not at the end. Amend the
line to describe what you are actually building and why (strike through the superseded
wording, or add a dated implementation note above the criteria). A criterion is never
silently outgrown: a ticket whose boxes describe code that doesn't exist is worse than one
with open boxes, because it stops anyone from noticing. This is exactly how TICKET-SET-06
ended up with two checked route criteria and no route.

## Step 5 — Verify, then tick each criterion

A criterion gets ticked **only when it verifiably passes** — never on hope.

1. Run the full Definition-of-Done suite via the **`verifier` subagent**
   (`ng lint` + `ng test` + `ng build --configuration development`). Fix failures before
   ticking anything.
2. Run the two fallow CI gate commands and require both to exit clean before finishing the
   ticket — these are the same gates CI runs, so a ticket that fails them here would fail there:
   ```bash
   npx fallow dead-code --baseline .fallow-baseline.json --fail-on-issues --quiet
   npx fallow health --complexity --max-cognitive 30 --max-cyclomatic 30 --max-crap 1000 --fail-on-issues --quiet
   ```
   The first fails only on **new** dead-code findings against the tracked baseline (identity-based,
   not a raw count) — pre-existing issues elsewhere in the repo don't block this ticket. The second
   fails on any function over the complexity ceilings. On a failure: refactor the flagged function(s)
   (extract helpers, reduce branching) rather than raising the thresholds or suppressing the finding,
   unless the finding is a genuine false positive — in that case use an inline
   `// fallow-ignore-next-line <issue-type>` with a reason, not a blanket suppression. If the baseline
   command reports new unused exports for code this ticket *deliberately* ships unreferenced (e.g. a
   utility a later ticket in the same chain will consume), note that in the ticket's evidence rather
   than treating it as a blocker — but still confirm the command's own verdict/exit code, don't assume.
   Re-run both after any fix until they pass clean.
3. For any criterion phrased **"Verified live in the browser: …"**, do a real live check
   with the `preview_*` tools (launch config `dev`, port 4210): reproduce the scenario the
   criterion describes and capture proof (snapshot/screenshot/logs).
4. For each satisfied criterion, edit the **ticket file**, changing that line
   `- [ ]` → `- [x]` **and appending the evidence in parentheses** — the file, spec name, or
   observed behaviour that proves it. "Which file? which test? what did you observe?" must be
   answerable from the ticket alone, months later, without re-deriving anything. A tick with
   no evidence is not a tick.
5. Do **not** tick a criterion that fails or that you couldn't verify — report it and keep
   working. Only genuinely-met criteria get checked. If a criterion was deliberately skipped
   (the user waived a live browser check, say), leave it `- [ ]` and append **why** to the
   line — an honest open box, not a checked one.
6. **Final AC↔diff pass before Step 6.** Re-read every `- [x]` on the ticket against the
   actual working tree — `git diff`, the file, the passing spec. Any box whose evidence you
   cannot point at right now gets unticked and either finished or recorded as a divergence.
   Run this pass even when you ticked each box carefully on the way through; the failure mode
   it catches is a criterion that was true when ticked and stopped being true two steps later.

Optionally run the **`conventions-reviewer` subagent** on the diff before finalizing to
catch convention drift.

## Step 6 — Check off the story (only when ALL criteria are `[x]`)

Once every acceptance-criteria checkbox in the ticket is `- [x]`:

- Open the `overview.md` for the ticket's version.
- Find the line whose ticket link matches this ticket ID — e.g. the line containing
  `[TICKET-ACC-01](./tickets/…)`. **Match on the ticket link, not the title wording.**
- Flip that line's `- [ ]` → `- [x]`.

## Step 6.5 — Add a changelog entry, remove the roadmap entry (only when ALL criteria are `[x]`)

Once Step 6 has actually run (same gate: every acceptance criterion on this ticket is
genuinely `[x]`, not hoped-for), **ask the user via `AskUserQuestion`** whether this ticket
should get a Changelog entry — default the suggested answer to yes for a user-facing
feature/bugfix and to no for a purely internal refactor/infra ticket, but let the user decide.
If they say yes, invoke the **`changelog-entry`** skill's convention to append one entry to
`src/app/feature-changelog/data/changelog-entries.ts` for the ticket just completed — `date`
(today, ISO), `versionFolder`, `ticketIds` (this one ticket's ID), a plain-language `title`
derived from the ticket's **User story**, and `area`. If they say no, skip it and note that in
Step 7's report. Skip asking entirely only if the changelog feature/skill doesn't exist yet in
the repo (e.g. this ticket predates TICKET-CHG-01 landing).

Regardless of the changelog answer, also invoke the **`roadmap-entry`** skill's convention to
remove this ticket's row (matching on `ticketId`) from
`src/app/feature-changelog/data/roadmap-entries.ts` — it was added by `story-ticket`'s Step 4.5
when the ticket was created, and now that the ticket has shipped it's no longer "planned." If no
matching row exists (the ticket predates TICKET-PUB-05, or the roadmap feature/skill doesn't
exist yet in the repo), there's nothing to remove — skip silently.

## Step 6.6 — Update the knowledge skills if this ticket moved the map

The `project-map` and `coding-conventions` skills are what the next agent reads *instead of*
exploring, so a stale one actively misdirects — TICKET-DX-04 found the project-map describing
a hydration model that had been reversed a whole version earlier, plus a route that no longer
existed. Keeping them current is part of the ticket that changed them, not a later cleanup.

Update `.claude/skills/project-map/SKILL.md` in this same change if the ticket:

- added, removed, or moved a **route** or a feature folder;
- added, removed, or moved a **store** (and re-check the store registry table's placement column);
- added or removed a **`core/` module**, a **`shared/ui` primitive**, or a **`shared/utils` helper**
  other code is expected to reuse;
- changed **where a kind of file lives**.

Update `.claude/skills/coding-conventions/SKILL.md` in this same change if the ticket:

- changed a **pattern the skill describes** (persistence, hydration, state placement,
  component/template structure, styling, forms, testing), or
- established a **new convention** future work should follow — write it as one or two
  sentences in the matching section, not a paragraph.

Prefer pointing at a registry or an exemplar file over restating its contents: a link that
resolves stays true, a copied list does not.

## Step 7 — Report and stop

Summarize what changed, link the now fully-`[x]` ticket and the checked story line, and show
the verification proof (test/build result + any browser evidence). **Leave the working tree
for the user to review — do not commit** unless they ask.
