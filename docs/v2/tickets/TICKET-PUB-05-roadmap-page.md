# TICKET-PUB-05 — Roadmap tab (on the Changelog page), kept current by the ticket workflow

- **Area:** Public / Onboarding
- **Type:** Feature
- **Traceability:** new capability from [v9999_ideas/requirements.md](../../v9999_ideas/requirements.md) ("Public Ready" — public content track); no existing FR-* covers this

## User story

As a user, I want to see what's planned next for the app, so I know a feature I want might already be coming rather than assuming I have to request it or do without.

## Description

Adds a Roadmap tab listing planned/upcoming work, living on the same `/changelog` route as TICKET-CHG-01's Changelog tab (which is backward-looking, showing what's already shipped) rather than as its own `/roadmap` route — the two are one page with two tabs, not two pages. Per the same scoping decision CHG-01 made, this is **not** a build/deploy-time generator that parses `docs/*/overview.md`; it's a maintained data file kept current by extending the same `story-ticket` (adds an entry when a ticket is created) and `work-ticket` (removes the entry when that ticket ships, since it now belongs in the Changelog instead) skills CHG-01 already touches.

## Current situation (as-is)

- No roadmap tab or roadmap data exists anywhere in the app or docs.
- [.claude/skills/story-ticket/SKILL.md](../../../.claude/skills/story-ticket/SKILL.md) currently ends at **Step 5 — Report back**, right after adding the new ticket's line to `overview.md`. There is no step that adds anything to a roadmap.
- [.claude/skills/work-ticket/SKILL.md](../../../.claude/skills/work-ticket/SKILL.md), once TICKET-CHG-01 lands, has a step between checking off the ticket and reporting done that appends a Changelog entry — this ticket adds a sibling action to that same step: remove the just-completed ticket's Roadmap entry, since it's no longer "planned," it's shipped.
- `docs/*/overview.md` files already carry every open ticket's title + link + FR-ID in build order — the raw material a roadmap entry is derived from, currently only ever read by a developer/AI working a ticket, never surfaced to an end user.
- [src/app/feature-changelog](../../../src/app/feature-changelog) already exists from TICKET-CHG-01: a single-route (`/changelog`) feature with a `ChangelogPageComponent`, a `changelog-entries.ts` data file, and a `groupChangelogEntries` helper. This ticket adds a Roadmap tab to that same page/route rather than a sibling feature folder.
- This ticket depends on TICKET-CHG-01 existing first (both the Changelog data-file/component pattern and the `work-ticket` step it adds) — build after CHG-01, not in parallel, since this ticket's `work-ticket` step change sits right next to CHG-01's.

## Desired result (to-be)

- A new `roadmap-entries.ts` (or `.json`) data file, in `src/app/feature-changelog/data/` alongside `changelog-entries.ts`, holds an array of entries: `{ versionFolder: string, ticketId: string, title: string, area: string }` (mirroring the fields already present on an `overview.md` line, so populating an entry is transcription, not new authoring) — no `date`/`status` field the way Changelog entries have one, since these haven't shipped yet.
- The existing `/changelog` route gains a **Roadmap** tab alongside the existing **Changelog** tab (Changelog remains the default/first tab) — no new route, no new top-level nav entry; `ChangelogPageComponent` (or a thin tab wrapper around it) renders whichever tab's entries are active, grouped by version/track in the same build order they appear in each version's `overview.md`, in plain language derived from each ticket's title (no raw ticket IDs or FR-* jargon in the visible copy).
- A new skill, `.claude/skills/roadmap-entry/SKILL.md`, documents the single source of truth for **how** to add/remove an entry (the data file's location and shape, one entry per open ticket, plain-language title derived from the ticket's title rather than raw ticket-ID jargon) — mirrors `changelog-entry/SKILL.md`'s shape from CHG-01.
- `.claude/skills/story-ticket/SKILL.md` gains a new step after the existing Step 4 ("Add the ticket to `overview.md`") — e.g. **"Step 4.5 — Add a roadmap entry"** — invoking the `roadmap-entry` skill's convention to append one entry for the just-created ticket.
- `.claude/skills/work-ticket/SKILL.md`'s changelog step (added by CHG-01) gains a sibling action in the same step: once the changelog entry is added, remove that ticket's entry from `roadmap-entries.ts` (a ticket is either planned or shipped, never both).
- The Changelog page's nav entry (already reachable the same way as How-to's/FAQ per TICKET-CHG-01 — footer or a low-key nav location, not the primary sidebar) is unchanged; the Roadmap tab adds no new nav entry of its own.

## Acceptance criteria

- [x] `roadmap-entries.ts`/`.json` data file created in `src/app/feature-changelog/data/` with the documented entry shape.
- [x] The `/changelog` route renders a Roadmap tab alongside the existing Changelog tab (Changelog is the default), with no new route added; Roadmap entries render grouped by version/track, in each version's existing build order, in plain-language titles.
- [x] `.claude/skills/roadmap-entry/SKILL.md` created, documenting the data file location/shape and the "one entry per open ticket, plain language" convention.
- [x] `.claude/skills/story-ticket/SKILL.md` updated with a new step (after the existing Step 4) that adds a roadmap entry for the just-created ticket.
- [x] `.claude/skills/work-ticket/SKILL.md`'s existing changelog step updated to also remove the completed ticket's roadmap entry.
- [x] This version's still-open tickets (SET-05, SET-02/03/04, PRIV-01, SET-06, PUB-04, this very ticket — the live-current open list, since PUB-01/02/03 shipped since this AC was written) get roadmap entries added retroactively as part of finishing this ticket, as a live proof the data actually reflects the current backlog at ship time.
- [x] Unit tests cover: the Roadmap tab rendering a sample set of entries grouped/ordered correctly, and tab switching between Changelog and Roadmap.
- [x] Verified via the fallow skill and coding-conventions skill.
- [x] Verified live in the browser: open `/changelog`, switch to the Roadmap tab, confirm entries render grouped by version in build order.

## Notes

- Skill-file edits (`.claude/skills/*/SKILL.md`) have no automated verification — `ng lint`/`ng test`/`ng build` don't touch them. Reviewing the edited skill files by re-reading them end-to-end for internal consistency (step numbering, cross-references) is the closest available check; call this out explicitly when reporting this ticket done, same exception CHG-01 already calls out.
- Depends on TICKET-CHG-01 landing first — both for the Changelog data/component pattern this ticket mirrors and extends in-place, and because its `work-ticket` skill edit sits directly beside CHG-01's.
- Deliberately a tab on the existing Changelog page rather than a new `/roadmap` route or `feature-roadmap/` folder — Changelog (shipped) and Roadmap (planned) are the same "state of the backlog" concept viewed two ways, so one page/route with two tabs avoids a second low-key nav entry for what a user experiences as one destination.
- Deliberately not a build/deploy-time generator, same trade-off CHG-01 made — if entries are found to go stale or drift from the real backlog in practice, an automated generator remains a reasonable future ticket, likely replacing rather than extending this manual-entry mechanism.
- Out of scope: showing *when* something is planned (no dates/ETAs) — this is a "what's on the list, in rough order" view, not a committed timeline, since this app has no team/release process to make a date meaningful.
