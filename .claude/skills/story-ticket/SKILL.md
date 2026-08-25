---
name: story-ticket
description: Create a new ticket (user story + description, as-is, to-be, detailed acceptance criteria) when the user asks for a bug, refactor, or feature. Use whenever someone says "add a user story", "write a ticket", "create a story for this bug/refactor/feature", or describes work that should be captured as a ticket.
---

# Create a new ticket

When the user asks to capture a **bug**, **refactor**, or **feature**, produce two linked pieces in the **feature area** it belongs to:

1. A detailed **ticket** in `docs/<area>/tickets/` — carrying its own **user story** plus description, as-is, to-be, and detailed acceptance criteria.
2. A one-line **entry** (title + checkbox) in `docs/<area>/overview.md`, linking to the ticket.

Tickets are organised by area, **not** by release — see `docs/README.md`. A new ticket hasn't shipped, so it belongs to no release yet; `docs/releases/` is a historical record and you do **not** add to it here. **Never assume the folder layout or which areas exist; it changes.** Discover the current structure at runtime and mirror the ticket *formatting*, but always create both pieces.

## Step 1 — Resolve the area, and with it the prefix

**This is the first and most important question. Do not guess.** Tickets are named by an **area prefix** (e.g. `TXN`, `IMP`, `STAT`), and **a prefix maps to exactly one area folder** — so resolving the prefix resolves the destination folder. Derive it, don't recite it:

1. List `docs/` to see the area folders that actually exist right now.
2. Determine the story's area from what it touches (the feature/domain it changes in `src/app/`).
3. Read that area's `overview.md` to find the prefix already in use. **If the area is already ticketed, reuse that exact prefix** so it stays consistent.
4. **If it fits no existing area**, ask the user (via `AskUserQuestion`) which area it belongs to, presenting exactly the folders you found. Only if they confirm it's genuinely new: mint a short prefix (2–4 uppercase letters, unambiguous against existing ones), create `docs/<area>/overview.md` + `docs/<area>/tickets/` mirroring an existing area, and record the new prefix→area mapping in `docs/README.md`.

Then find the **highest existing number for that prefix across the whole project** (numbers are unique per prefix, not per release) and use the next one, zero-padded to match. Filename: `TICKET-<PREFIX>-<NN>-<kebab-slug>.md`.

Also confirm the **type** if ambiguous: `Bug fix`, `Refactor`, or `Feature`. It affects the story wording and the ticket's `Type` line.

## Step 2 — Open a neighbour for formatting

Open an existing ticket in the same `docs/<area>/tickets/` folder to learn the current ticket format (metadata header, section order, Notes conventions) and mirror it. Its metadata header carries a `- **Released in:**` line; a new ticket gets `- **Released in:** _unreleased_` instead, which the `work-ticket` skill replaces once it actually ships.

## Step 3 — Write the ticket

Create the ticket file mirroring the structure of the existing tickets in that area. The required sections are **User story**, **Description**, **Current situation (as-is)**, **Desired result (to-be)**, and detailed **Acceptance criteria** — plus whatever metadata header and Notes section the existing tickets carry:

```markdown
# TICKET-<PREFIX>-<NN> — <Title>

- **Area:** <Area>
- **Released in:** _unreleased_
- **Type:** <Bug fix | Refactor | Feature>   ← include for bugs/refactors; features may omit
- **Traceability:** <FR-ID / spec §>

## User story

As a <role>, I want <capability>, so <benefit>.

## Description

<1–3 sentences: what this delivers and why, in plain language.>

## Current situation (as-is)

- <How it works today. Link real files with clickable relative paths. For bugs, pinpoint the root cause.>

## Desired result (to-be)

- <The target behaviour after this ticket lands.>

## Acceptance criteria

- [ ] <Specific, testable outcome.>
- [ ] <Persistence goes through the store/repository, never direct Dexie table writes — if data is touched.>
- [ ] <Unit tests cover: … (name the cases).>
- [ ] <Verified via the fallow skill and coding-conventions skill>

## Notes

- <Edge cases, design trade-offs, related tickets, or scope caveats.>
```

Writing rules:
- **User story** is the classic `As a <role>, I want <capability>, so <benefit>` line — this is now the one and only place the story text lives (it no longer also lives in `overview.md`).
- **As-is** must reference actual code with clickable relative links and, for bugs, name the exact root cause (function, early return, wrong binding). Grep the codebase to find the real files — don't invent paths.
- **Acceptance criteria** are checkboxes, each independently verifiable. Fold in the repo's Definition of Done touchpoints where relevant: store/repository (not raw table) writes, `categoryManual` preservation if categories are involved, additive Dexie migrations, unit tests naming their cases, and a live browser check for UI changes. Never propose raising the `angular.json` bundle budget.
- Match the concise, traceable style of the existing tickets — no filler.

## Step 4 — Add the ticket to `overview.md`

`overview.md` only carries a **title + checkbox + link** per ticket — not the full story (that lives in the ticket now):

- **Feature / refactor:** `- [ ] [TICKET-<PREFIX>-<NN>](./tickets/TICKET-<PREFIX>-<NN>-<slug>.md) — <Title> (<FR-ID>)`
- **Bug:** `- [ ] [TICKET-<PREFIX>-<NN>](./tickets/...) — <Title> (bug fix, <FR-ID> — <one-line root cause>)`

Keep a traceability reference (FR-ID or spec/UI-layout section) in the trailing parenthetical — every existing entry has one. If no FR-ID applies, cite the section or note it extends an existing FR.

An area `overview.md` is an **index**, ordered by ticket number within each prefix — so a new ticket's line goes at the end of its prefix's section, since it takes the next free number. Close it with ` · _unreleased_` where shipped tickets carry their release label.

**Dependencies belong in the line's trailing note, not in the ordering.** If it needs another ticket first, say so inline (e.g. "— needs TICKET-X"); if it's independent, say that ("— independent, can ship any time"). The build-order narrative that release overviews carry is a property of a release, and this ticket doesn't have one yet.

## Step 4.5 — Add a roadmap entry

Invoke the **`roadmap-entry`** skill's convention to append one entry to
`src/app/feature-changelog/data/roadmap-entries.ts` for the ticket just added — `ticketId`, a plain-language `title` derived from the ticket's **User story**, and `area`. Skip
this step only if the Roadmap tab/skill doesn't exist yet in the repo (i.e. this ticket predates
TICKET-PUB-05 landing).

## Step 5 — Report back

Tell the user which **area** the ticket was added to, and link both the new ticket file and its line in `docs/<area>/overview.md`. Do not run lint/test/build — these are docs, not code.

Note: this new ticket does **not** get a Changelog entry now — it hasn't shipped yet. A changelog entry is added later, by the `work-ticket` skill's Step 6.5, once this ticket's acceptance criteria are actually all `[x]`; that same step also removes the Roadmap entry Step 4.5 just added, since a ticket is either planned or shipped, never both. See the `changelog-entry` and `roadmap-entry` skills.
