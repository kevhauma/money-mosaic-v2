---
name: changelog-entry
description: Add an entry to MoneyMosaicVibe's in-app Changelog page once a ticket has genuinely shipped. Invoked as a step inside the `work-ticket` skill — not used standalone for docs/planning, only for a ticket that's actually done.
---

# Add a changelog entry

The Changelog page (`/changelog`, `src/app/feature-changelog/`) renders a hand-maintained,
append-only list of shipped, user-facing changes — **not** a build/deploy-time generator that
parses `overview.md` (TICKET-CHG-01's scoping decision). It stays current because finishing a
ticket via the `work-ticket` skill includes adding one entry, the same way checking off
`overview.md` already is.

## Where the data lives

`src/app/feature-changelog/data/changelog-entries.ts` exports:

```ts
export type ChangelogEntry = {
  readonly date: string; // ISO YYYY-MM-DD, the day the entry was added
  readonly versionFolder: string; // the docs/ folder the ticket(s) live in, e.g. "v2"
  readonly ticketIds: readonly string[]; // e.g. ["TICKET-CHG-01"] — more than one for a batched entry
  readonly title: string; // plain language, see below
  readonly area: string; // short tag, e.g. "Changelog", "Transactions", "Settings"
};

export const CHANGELOG_ENTRIES: readonly ChangelogEntry[] = [
  // ...append here, do not reorder or edit existing entries
];
```

## The convention

- **Normally one entry per just-completed ticket** (the `work-ticket` flow, Step 6.5) — `ticketIds`
  holds that single ticket's ID. Add it only once every acceptance criterion on that ticket is
  genuinely `[x]` — mirrors the same gate `work-ticket`'s Step 6 uses for checking off
  `overview.md`.
- **A batched entry (`ticketIds` with more than one ID) is for backfilling history**, not for new
  work going forward — e.g. summarizing "everything v1.2 Auto-categorise shipped" as one entry
  instead of one row per `TICKET-ML-*`. Reach for this only when adding entries retroactively for
  a whole already-shipped version/milestone in one pass; a single ticket finishing today still
  gets its own single-`ticketIds` entry via Step 6.5.
- **Append, don't reorder.** The page itself groups and sorts by `date` newest-first
  (`groupChangelogEntries` in `group-changelog-entries.ts`) — the array's own order doesn't
  matter, so always add new entries at the end and never edit or reorder past ones.
- **Plain-language `title`, not ticket-ID jargon.** Derive it from the ticket's (or, for a batched
  entry, the version's) **User story**/description, rewritten so a non-technical reader
  understands what changed — e.g. `TICKET-CHG-01`'s own title "Changelog page, kept current by
  the ticket workflow" becomes an entry title like "Added a Changelog page showing what's
  shipped." Never just copy the raw ticket title verbatim if it reads like an internal spec line.
- **`area`** is a short, human-readable tag — usually the ticket's own `Area:` field from its
  ticket file (or the version's overall theme for a batched entry), unless that reads too
  internal (prefer "Settings" over an internal module name).
- **`date`** is today's date (ISO `YYYY-MM-DD`) at the time a fresh entry is added; for a
  backfilled batched entry, a reconstructed approximate date (e.g. from git history) is fine —
  it only needs to be close enough for correct newest-first ordering, not exact.

## Example

Single-ticket entry (the normal case, added via `work-ticket` Step 6.5):

```ts
{
  date: '2026-07-22',
  versionFolder: 'v2',
  ticketIds: ['TICKET-CHG-01'],
  title: "Added a Changelog page showing what's shipped",
  area: 'Changelog',
},
```

Batched entry (backfilling an already-shipped version in one pass):

```ts
{
  date: '2026-07-17',
  versionFolder: 'v1.4_data_management',
  ticketIds: ['TICKET-DAT-01', 'TICKET-DAT-02', 'TICKET-DAT-03'],
  title: 'Added full local data export/import (JSON backup & restore), a persistent-storage request, and delete-all-data',
  area: 'Data management',
},
```

No lint/test/build step is needed beyond the existing Changelog page test suite (which reads
`CHANGELOG_ENTRIES` directly) — adding a well-formed literal to the array is enough.
