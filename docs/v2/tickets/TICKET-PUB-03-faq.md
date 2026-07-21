# TICKET-PUB-03 — FAQ for complex features

- **Area:** Public / Onboarding
- **Type:** Feature
- **Traceability:** new capability from [v9999_ideas/requirements.md](../../v9999_ideas/requirements.md) ("Public Ready" — FAQ about more complex features of the app); no existing FR-* covers this

## User story

As a user confused by one of the app's less obvious behaviors, I want a FAQ page that explains it in plain language, so I don't have to guess why the app is doing what it's doing.

## Description

Several shipped features have genuinely subtle, non-obvious behavior by design (contribution-based net worth for joint accounts, transfer auto-matching, manual category overrides that rules won't touch). This ticket adds a FAQ page answering the questions those behaviors actually raise, distinct from the step-by-step How-to's (TICKET-PUB-02) — FAQ answers "why does it work this way," how-to's answer "how do I do X."

## Current situation (as-is)

- No FAQ or equivalent exists in the app.
- The features most likely to generate "why is this happening" confusion, per the v1.1 joint-accounts overview's own explanation of its trade-offs ([v1.1_joint_accounts/overview.md](../../v1.1_joint_accounts/overview.md)): contribution-based net worth for joint accounts (why a partner's spending shows up as reducing *my* net worth, why "my partner owes the pot" can appear as informal net worth), transfer auto-matching (why two transactions got linked automatically, why a linked transfer doesn't count as income/expense), and manual category overrides (why a rule change doesn't recategorize a transaction the user manually set — the `categoryManual` flag).
- These design decisions are currently only documented in developer-facing `docs/` files (ticket/overview prose), not surfaced to end users anywhere in the app itself.

## Desired result (to-be)

- A new FAQ page (part of `feature-help/` alongside TICKET-PUB-02's how-to's, or its own small feature — same "decide once PUB-01/02 exist" flexibility as PUB-02) lists question/answer pairs, expandable (daisyUI `collapse`/accordion pattern) rather than one long scroll.
- Initial question set, each answered in plain language (no internal jargon like "FR-STAT-1" or ticket IDs): "Why did my net worth change when my partner spent money from our joint account?" (contribution model), "Why were two transactions linked as a transfer automatically — and how do I undo it if it's wrong?" (transfer matching + manual review), "I set a transaction's category manually — why didn't a new rule change it?" (`categoryManual` protection), "Is my data ever sent anywhere?" (local-first, no backend — short answer here, full detail + export/import lives in TICKET-PUB-04's messaging, this entry just links to it).
- FAQ is reachable from the same nav/footer location as How-to's.

## Acceptance criteria

- [x] FAQ page created, rendering expandable question/answer pairs (daisyUI accordion/collapse pattern).
- [x] At least the four initial questions (joint net worth, transfer auto-matching, manual category protection, data privacy) are answered accurately against actual current app behavior.
- [ ] The data-privacy answer links to TICKET-PUB-04's fuller messaging/export-import UI rather than duplicating its full explanation. (TICKET-PUB-04 hasn't shipped yet — per this ticket's own Notes, the entry ships self-contained for now; revisit once PUB-04 lands.)
- [x] FAQ is reachable from the app's nav or footer, alongside How-to's.
- [x] Unit tests cover: the FAQ list rendering the expected questions; expand/collapse interaction state.
- [x] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: open the FAQ page, expand each question, confirm answers render and the privacy answer's link navigates correctly.

## Notes

- Pairs naturally with TICKET-PUB-02 (shared static-content page pattern) but has no hard build-order dependency on it.
- The data-privacy FAQ entry assumes TICKET-PUB-04 exists to link to; if PUB-04 hasn't landed yet when this ticket is built, ship the entry with a short self-contained answer instead of a broken link, and update it to link out once PUB-04 ships.
- As with TICKET-PUB-02, FAQ answers can drift if the underlying behavior changes (e.g. if a future ticket changes how transfer matching works) — treat updating the relevant FAQ entry as part of that future ticket's scope, not a separate audit task.
