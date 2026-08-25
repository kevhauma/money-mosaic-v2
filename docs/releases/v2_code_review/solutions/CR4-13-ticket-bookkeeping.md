# CR4-13 — Ticket record vs. shipped code (SET-06): options

Finding: [CR4-13](../code-review.md#cr4-13--ticket-bookkeeping-no-longer-matches-shipped-reality-set-06-as-the-proven-case). TICKET-SET-06's implementation criteria are checked for a `/settings/data` child route that doesn't exist; the shipped code embeds the component instead; the overview line is still unchecked.

Two halves: **repair this record** and **stop the class of drift**. The code-side fork (embed vs. route) is [CR4-8](./CR4-08-data-management-route-remnants.md)'s decision; this doc assumes one of its options is picked and covers the bookkeeping.

## Part 1 — Repairing the SET-06 record

- **Option A — record the divergence (pairs with CR4-8 Option A, embed).** Amend the ticket: add a dated "Implementation note: shipped as an embedded section, superseding the route-based criteria below," re-mark the route/link criteria to reflect what actually shipped (either unchecking them with strikethrough context, or rewriting them to describe the embed and re-verifying), tick the overview line, and do the still-outstanding browser verification against the *embed* behavior. The record then tells the true story including the pivot — which is more useful to future readers than a cleaned-up fiction.
- **Option B — make the record true as written (pairs with CR4-8 Option B, route).** Implement the child route per the original AC; the checked boxes become honest retroactively; complete the browser-verification criterion; tick the overview line. Bookkeeping-wise the simplest outcome — the ticket needs no annotation at all.
- Under either: one sentence in the ticket naming *what happened* (premature tick vs. deliberate mid-implementation pivot that skipped the paperwork) if it can be reconstructed from the commit history — because which one it was determines how much weight to put on Part 2.

## Part 2 — Preventing recurrence

- **Option A — an AC↔diff cross-check step in the `work-ticket` skill.** Before a criterion is ticked, the skill requires citing the evidence (file/spec/behavior) that satisfies it; before the ticket closes, a final pass re-reads every `[x]` against the working tree. This targets the exact failure: boxes describing code are checkable without the code existing. Cost: friction per ticket — small, and the skill format already walks criteria one by one, so it's an added discipline, not a new mechanism.
- **Option B — divergence is allowed but must be written.** A workflow rule: implementations *may* legitimately diverge from AC mid-ticket (SET-06's embed may well have been the better call), but the divergence gets recorded in the ticket at the moment of pivot — AC amended, not silently outgrown. This is the culture-level fix; Option A is its enforcement.
- **Option C — periodic drift audit.** At review time (CR5), sample recently-closed tickets' checked ACs against the code — a slow backstop that catches what A/B miss. Cheap to declare (one line in the next review's method), catches only samples. Worth listing in the review checklist regardless of A/B.

## Recommendation shape

Part 1 direction is decided by CR4-8, not here — the paired options above just keep the paperwork consistent with whichever wins. Part 2: A + B together are one small edit to the `work-ticket` skill (the same file CR4-11's process hook touches — do all skill edits in one pass); C costs a sentence in the next review's template. The one non-negotiable across all options: the current state — checked criteria describing nonexistent code — should not survive the next ticketing pass, because every future consumer of the backlog builds on it.
