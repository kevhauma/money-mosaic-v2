---
name: story-ticket
description: Create a new ticket (user story + description, as-is, to-be, detailed acceptance criteria) when the user asks for a bug, refactor, or feature. Use whenever someone says "add a user story", "write a ticket", "create a story for this bug/refactor/feature", or describes work that should be captured as a ticket.
---

# Create a new ticket

When the user asks to capture a **bug**, **refactor**, or **feature**, produce two linked pieces in the version they choose:

1. A detailed **ticket** in that version's `tickets/` folder — carrying its own **user story** plus description, as-is, to-be, and detailed acceptance criteria.
2. A one-line **entry** (title + checkbox) in that version's `overview.md`, linking to the ticket.

**Every version gets this same treatment** — an `overview.md` plus a `tickets/` folder — regardless of what any single version looked like before. **Never assume the folder layout or which versions exist; it changes.** Discover the current structure at runtime and mirror the ticket *formatting*, but always create both pieces.

## Step 1 — Ask which version it belongs to

**This is the first and most important question. Do not guess.** Before asking, list the `docs/` folder to find the version destinations that actually exist right now. Then ask the user (via `AskUserQuestion`) which one the story belongs to.

- Present **exactly the versions you found in `docs/`** as the options — read them live, don't recite any remembered list.
- Always include an option to create a **new version**; if they pick it, ask for its name and scaffold `docs/<version>/overview.md` + `docs/<version>/tickets/` mirroring the most recent existing version.

Once they pick a version, open its `overview.md` and an existing ticket in its `tickets/` folder to learn that version's conventions (ticket format, how the list is ordered). `overview.md` lists tickets in **recommended build order, not grouped by area** — don't reintroduce area/section headings when adding the new entry.

Also confirm the **type** if ambiguous: `Bug fix`, `Refactor`, or `Feature`. It affects the story wording and the ticket's `Type` line.

## Step 2 — Resolve the area prefix (consistent, not hardcoded)

Tickets are named by an **area prefix** (e.g. `TXN`, `IMP`, `STAT`). Do not rely on a fixed section→prefix table — derive it:

1. Determine the story's area from what it touches (the feature/domain, not a memorised list).
2. Scan the existing tickets across the docs to find the prefix already used for that area. **If the area is already mapped, reuse that exact prefix** so it stays consistent.
3. **If the area has never been ticketed, mint a new short prefix** (2–4 uppercase letters, unambiguous against existing ones) and use it consistently from now on.

Then find the highest existing number for that prefix and use the next one, zero-padded to match the existing files. Filename: `TICKET-<PREFIX>-<NN>-<kebab-slug>.md`.

## Step 3 — Write the ticket

Create the ticket file mirroring the structure of the existing tickets in that version. The required sections are **User story**, **Description**, **Current situation (as-is)**, **Desired result (to-be)**, and detailed **Acceptance criteria** — plus whatever metadata header and Notes section the existing tickets carry:

```markdown
# TICKET-<PREFIX>-<NN> — <Title>

- **Area:** <Area>
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

**Insert the line at its actual position in the build order, not at the end and not grouped by area.** If it has a clear dependency (reads/writes something another ticket also touches), place it immediately after that dependency and say so inline (e.g. "— needs TICKET-X"); if it's independent, place it wherever its priority/effort fits among the other open lines and say so (e.g. "— independent, can ship any time"). Match whatever ordering convention that version's list already uses (pure dependency chain, or value/effort ranking, or parallel tracks) — check its existing lines' trailing notes before choosing where to put the new one.

## Step 5 — Report back

Tell the user which **version + section** the ticket was added to, and link both the new ticket file and its line in `overview.md`. Mention the `Recommended order` update. Do not run lint/test/build — these are docs, not code.

Note: this new ticket does **not** get a Changelog entry now — it hasn't shipped yet. A changelog entry is added later, by the `work-ticket` skill's Step 6.5, once this ticket's acceptance criteria are actually all `[x]`. See the `changelog-entry` skill.
