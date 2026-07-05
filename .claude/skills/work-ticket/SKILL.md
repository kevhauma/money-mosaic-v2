---
name: work-ticket
description: Work a ticket end-to-end — read it, plan the implementation, build it, tick each acceptance criterion as it verifiably passes, then check off the ticket's story in user-stories.md. Use whenever someone says "work on a ticket", "start ticket TICKET-XXX", "implement this ticket", "pick up TICKET-ACC-01", or points you at a ticket file to build.
---

# Work a ticket to done

Drive one ticket from "not started" to "story checked off". The ticket is the source of
truth: its **Acceptance criteria** are the contract, and each maps to a story line in the
version's `user-stories.md` that must be checked off once every criterion passes.

**Never assume the docs layout or which versions exist — discover it at runtime.** Tickets
live in `docs/<version>/tickets/TICKET-<PREFIX>-<NN>-*.md`; stories in
`docs/<version>/user-stories.md`. Mirror what you find; don't hardcode `v1`.

## Step 1 — Locate the ticket

- **If the user named a ticket** (ID like `TICKET-ACC-01`, a prefix+number, or a path),
  open that file. If only a partial ID was given, glob `docs/*/tickets/` to resolve it.
- **If no ticket was named**, scan `docs/*/tickets/` and the version's `user-stories.md`
  for **open** work — story lines still marked `- [ ]` that link to a ticket — and ask via
  `AskUserQuestion` which one to work. Present the real, currently-open tickets you found;
  don't recite a remembered list.

Confirm you have the right file before proceeding.

## Step 2 — Read and orient

Read the **whole** ticket, not just the criteria:

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

Work the plan criterion by criterion, following the `frontend-conventions` (coding
conventions), `data-model`, and `project-map` skills. Keep changes scoped to this ticket —
resist unrelated refactors; if you spot out-of-scope work, note it rather than doing it.

## Step 5 — Verify, then tick each criterion

A criterion gets ticked **only when it verifiably passes** — never on hope.

1. Run the full Definition-of-Done suite via the **`verifier` subagent**
   (`ng lint` + `ng test` + `ng build --configuration development`). Fix failures before
   ticking anything.
2. For any criterion phrased **"Verified live in the browser: …"**, do a real live check
   with the `preview_*` tools (launch config `dev`, port 4210): reproduce the scenario the
   criterion describes and capture proof (snapshot/screenshot/logs).
3. For each satisfied criterion, edit the **ticket file**, changing that line
   `- [ ]` → `- [x]`.
4. Do **not** tick a criterion that fails or that you couldn't verify — report it and keep
   working. Only genuinely-met criteria get checked.

Optionally run the **`conventions-reviewer` subagent** on the diff before finalizing to
catch convention drift.

## Step 6 — Check off the story (only when ALL criteria are `[x]`)

Once every acceptance-criteria checkbox in the ticket is `- [x]`:

- Open the `user-stories.md` for the ticket's version (from its **Source story** line).
- Find the story line whose ticket link matches this ticket ID — e.g. the line containing
  `[TICKET-ACC-01](./tickets/…)`. **Match on the ticket link, not the story wording.**
- Flip that line's `- [ ]` → `- [x]`.

The `tickets/README.md` index has no status column, so it needs no change.

## Step 7 — Report and stop

Summarize what changed, link the now fully-`[x]` ticket and the checked story line, and show
the verification proof (test/build result + any browser evidence). **Leave the working tree
for the user to review — do not commit** unless they ask.
