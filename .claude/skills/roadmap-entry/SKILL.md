---
name: roadmap-entry
description: Add or remove an entry on MoneyMosaicVibe's in-app Roadmap tab (on the Changelog page). Invoked as a step inside the `story-ticket` skill (add, on creation) and the `work-ticket` skill (remove, on shipping) — not used standalone.
---

# Add or remove a roadmap entry

The Roadmap tab (`/changelog`, `src/app/feature-changelog/`, alongside the Changelog tab) renders
a hand-maintained list of planned/upcoming work — the forward-looking counterpart to the
Changelog's backward-looking list. **Not** a build/deploy-time generator that parses
`overview.md` (same scoping decision `changelog-entry`/TICKET-CHG-01 made, extended by
TICKET-PUB-05). It stays current because:

- creating a ticket via the `story-ticket` skill includes adding one entry (Step 4.5), and
- finishing a ticket via the `work-ticket` skill includes removing that same entry (Step 6.5,
  right after that ticket's changelog entry is added) — a ticket is either planned or shipped,
  never both.

## Where the data lives

`src/app/feature-changelog/data/roadmap-entries.ts` exports:

```ts
export type RoadmapEntry = {
  readonly versionFolder: string; // the docs/ folder the ticket lives in, e.g. "v2"
  readonly ticketId: string; // e.g. "TICKET-SET-05" — one entry per open ticket, never batched
  readonly title: string; // plain language, see below
  readonly area: string; // short tag, e.g. "App Settings", "Public / Onboarding"
  readonly isTopic?: boolean; // true for a topic-level entry — see "Topic-level entries" below
};

export const ROADMAP_ENTRIES: readonly RoadmapEntry[] = [
  // ...append/remove entries here
];
```

No `date`/`status` field — unlike Changelog entries, these haven't shipped, so there's nothing to
sort by beyond each version's own build order (`groupRoadmapEntries` in
`group-roadmap-entries.ts` groups by `versionFolder`, preserving first-appearance order — it does
not sort). Group headings are derived from `versionFolder` via `formatRoadmapHeading` (also in
`group-roadmap-entries.ts`), which strips a leading `v<N>_` version prefix and title-cases the
remainder (`"v1.6_income_growth"` → `"Income Growth"`); a folder with no such prefix (e.g. `"v2"`,
the current near-term backlog) renders unchanged.

## The convention

- **One entry per open ticket, never batched** — this is the normal case, added via
  `story-ticket`'s Step 4.5 for a version that's actually being built ticket-by-ticket (e.g. `v2`).
  Roadmap entries map 1:1 to a currently open ticket here — there's no "already shipped,
  summarize it" case the way Changelog allows.
- **Added by `story-ticket`'s Step 4.5**, right after the new ticket is added to `overview.md` —
  append one entry for the just-created ticket, using its own `versionFolder`/`ticketId`.
- **Removed by `work-ticket`'s Step 6.5**, right after that ticket's Changelog entry is added —
  delete the row whose `ticketId` matches. If no matching row exists (the ticket predates
  TICKET-PUB-05, or it was created before this skill existed), there's nothing to remove — skip
  silently.
- **Plain-language `title`, not ticket-ID jargon** — same rule as Changelog: derive it from the
  ticket's **User story**, rewritten so a non-technical reader understands what's coming, not a
  copy of the internal ticket title.
- **`area`** is a short, human-readable tag — usually the ticket's own `Area:` field, unless that
  reads too internal.
- **Order in the array should track each version's `overview.md` build order** (top to bottom) —
  when adding a new entry, insert it near entries from the same `versionFolder` if practical;
  exact position doesn't affect rendering (`groupRoadmapEntries` preserves whatever order the
  array has), but it keeps the file easy to eyeball against `overview.md`.

## Example

```ts
{
  versionFolder: 'v2',
  ticketId: 'TICKET-SET-05',
  title: 'Foundation for app settings (accent color, currency, locale, privacy mode)',
  area: 'App Settings',
},
```

## Topic-level entries (exception)

A **topic-level entry** (`isTopic: true`) is the one deliberate exception to "one entry per open
ticket": a single row summarizing an entire future version/track that hasn't been broken into
tickets yet (e.g. `v1.6_income_growth` before any `TICKET-INC-*` work starts on it), or a raw,
still-unticketed idea straight from `docs/v9999_ideas/requirements.md`. Its `ticketId` holds a
short `topic-<slug>` placeholder instead of a real `TICKET-*` id (e.g. `topic-income-growth`),
since there's no single ticket to track.

- `work-ticket`'s Step 6.5 never matches or removes a topic-level entry (its `ticketId` matching
  is exact-`TICKET-*`-only) — a topic-level row has to be removed/replaced by hand once that
  version actually gets ticketed via `story-ticket` (at that point, add one normal per-ticket
  entry per new ticket instead, and delete the old topic-level row).
- Bundle several topic-level entries under the same `versionFolder` when a track/backlog covers
  more than one idea (e.g. several rows all under `versionFolder: 'v9999_ideas'`) — they group
  together under one heading (`formatRoadmapHeading('v9999_ideas')` → `"Ideas"`).
- Keep the `title` scoped to one idea per row rather than one long comma-separated summary, so
  each shows as its own line under the shared heading.

No lint/test/build step is needed beyond the existing Roadmap tab test suite (which reads
`ROADMAP_ENTRIES` directly) — adding or removing a well-formed literal in the array is enough.
