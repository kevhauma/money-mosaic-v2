# TICKET-CHG-01 — Changelog page, kept current by the ticket workflow

- **Area:** Changelog
- **Type:** Feature
- **Traceability:** new capability from [v9999_ideas/requirements.md](../../v9999_ideas/requirements.md) ("Public Ready" — changelog page generated from tickets/user stories that are done... add to skills"); no existing FR-* covers this

## User story

As a user, I want to see a changelog of what's shipped, so I know what's new without reading commit history or ticket files myself.

## Description

Adds an in-app Changelog page rendering a list of shipped, user-facing changes. Per the scoping decision, this is **not** a build/deploy-time generator that parses `overview.md` checkboxes — it's a maintained data file kept current by extending the existing `work-ticket` (and `story-ticket`) skills so that whoever (human or AI) finishes a ticket is prompted to add its entry as a normal part of finishing the ticket, the same way checking off `overview.md` already is.

## Current situation (as-is)

- No changelog page or changelog data exists anywhere in the app or docs.
- [.claude/skills/work-ticket/SKILL.md](../../../.claude/skills/work-ticket/SKILL.md) currently ends at **Step 7 — Report and stop**, after Step 6 checks off the ticket's line in the version's `overview.md` once every acceptance criterion is `[x]`. There is no step that touches a changelog anywhere in that flow.
- [.claude/skills/story-ticket/SKILL.md](../../../.claude/skills/story-ticket/SKILL.md) ends at **Step 5 — Report back**, after adding the new ticket's line to `overview.md`. It has no changelog awareness either — appropriate, since a just-created ticket isn't "shipped" yet, but the skill should still know a changelog entry will be expected once the ticket is later completed via `work-ticket`.
- `docs/*/overview.md` files already carry a title + checkbox + FR-ID per ticket, in build order — the raw material a changelog entry is derived from, but currently only ever read by a developer/AI working a ticket, never surfaced to an end user.

## Desired result (to-be)

- A new `changelog-entries.ts` (or `.json`) data file, e.g. in `core/data-access/` or a new lightweight `feature-changelog/`, holds an append-only array of entries: `{ date: string, versionFolder: string, ticketId: string, title: string, area: string }` (mirroring the fields already present on an `overview.md` line — title, ticket ID, FR-ID/area — so populating an entry is transcription, not new authoring).
- A new `/changelog` route (`feature-changelog/`, standard feature-folder shape, lazy-loaded) renders entries grouped by date (or version), newest first, in plain language derived from each ticket's title.
- A new skill, `.claude/skills/changelog-entry/SKILL.md`, documents the single source of truth for **how** to add an entry (the data file's location and shape, one entry per completed ticket, plain-language title derived from the ticket's `User story`/title rather than raw ticket-ID jargon).
- `.claude/skills/work-ticket/SKILL.md` gains a new step between the existing Step 6 ("Check off the story") and Step 7 ("Report and stop") — e.g. **"Step 6.5 — Add a changelog entry"** — invoking the `changelog-entry` skill's convention to append one entry for the just-completed ticket, only after all acceptance criteria are genuinely `[x]` (mirrors Step 6's "only when ALL criteria are `[x]`" gate).
- `.claude/skills/story-ticket/SKILL.md`'s Step 5 ("Report back") gains a short note that a changelog entry is *not* added at creation time — it's added later by `work-ticket` once the ticket actually ships — so a reader of `story-ticket` understands where that responsibility lives instead of assuming it's missing.
- The Changelog page and nav entry are reachable the same way as How-to's/FAQ (TICKET-PUB-02/03) — footer or a low-key nav location, not the primary sidebar.

## Acceptance criteria

- [ ] `changelog-entries.ts`/`.json` data file created with the documented entry shape.
- [ ] `/changelog` route renders entries grouped by date/version, newest first, in plain-language titles.
- [ ] `.claude/skills/changelog-entry/SKILL.md` created, documenting the data file location/shape and the "one entry per shipped ticket, plain language" convention.
- [ ] `.claude/skills/work-ticket/SKILL.md` updated with a new step (between the existing Step 6 and Step 7) that adds a changelog entry for the completed ticket, gated on all acceptance criteria being genuinely `[x]` first.
- [ ] `.claude/skills/story-ticket/SKILL.md` updated with a short note clarifying changelog entries are added later, by `work-ticket`, not at ticket-creation time.
- [ ] This very ticket (TICKET-CHG-01) gets its own changelog entry added once it's completed, as a live proof the new `work-ticket` step works — added by whoever finishes this ticket, following the just-updated skill.
- [ ] Unit tests cover: the Changelog page rendering a sample set of entries grouped/sorted correctly.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: open `/changelog`, confirm entries render grouped and sorted newest-first.

## Notes

- Skill-file edits (`.claude/skills/*/SKILL.md`) have no automated verification — `ng lint`/`ng test`/`ng build` don't touch them. Reviewing the edited skill files by re-reading them end-to-end for internal consistency (step numbering, cross-references) is the closest available check; call this out explicitly when reporting this ticket done, since it's an exception to this repo's usual "verified via lint/test/build" bar.
- Deliberately not a build/deploy-time generator (the scoping decision this ticket follows), which trades some risk of a human/AI forgetting the step for much less implementation complexity (no docs-parsing script, no build pipeline change) — if entries are found to go stale in practice, an automated generator remains a reasonable future ticket, likely replacing rather than extending this manual-entry mechanism.
- Loosely pairs with TICKET-PUB-02/PUB-03 (another static-content page) but has no build dependency on them.
