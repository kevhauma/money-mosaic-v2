---
name: story-ticket
description: Create a new user story plus a matching ticket (description, as-is, to-be, detailed acceptance criteria) when the user asks for a bug, refactor, or feature. Use whenever someone says "add a user story", "write a ticket", "create a story for this bug/refactor/feature", or describes work that should be captured as a story + ticket.
---

# Create a user story + ticket

When the user asks to capture a **bug**, **refactor**, or **feature**, produce two linked artefacts in the version they choose:

1. A one-line **user story** in that version's `user-stories.md`, **linking to its ticket**.
2. A detailed **ticket** in that version's `tickets/` folder (description, as-is, to-be, detailed acceptance criteria).

**Every version gets this same treatment** — a `user-stories.md` plus a `tickets/` folder — regardless of what any single version looked like before. **Never assume the folder layout or which versions exist; it changes.** Discover the current structure at runtime and mirror the ticket *formatting*, but always create both artefacts.

## Step 1 — Ask which version it belongs to

**This is the first and most important question. Do not guess.** Before asking, list the `docs/` folder to find the version destinations that actually exist right now. Then ask the user (via `AskUserQuestion`) which one the story belongs to.

- Present **exactly the versions you found in `docs/`** as the options — read them live, don't recite any remembered list.
- Always include an option to create a **new version**; if they pick it, ask for its name and scaffold `docs/<version>/user-stories.md` + `docs/<version>/tickets/` mirroring the most recent existing version.

Once they pick a version, open its `user-stories.md` and an existing ticket in its `tickets/` folder to learn that version's conventions (section headings, ticket format, index/README). Place the new story under the correct existing section heading — ask the user which section if it isn't obvious. If the version has no matching section yet, add one.

Also confirm the **type** if ambiguous: `Bug fix`, `Refactor`, or `Feature`. It affects the story wording and the ticket's `Type` line.

## Step 2 — Resolve the area prefix (consistent, not hardcoded)

Tickets are named by an **area prefix** (e.g. `TXN`, `IMP`, `STAT`). Do not rely on a fixed section→prefix table — derive it:

1. Determine the story's area from what it touches (the feature/domain, not a memorised list).
2. Scan the existing tickets across the docs to find the prefix already used for that area. **If the area is already mapped, reuse that exact prefix** so it stays consistent.
3. **If the area has never been ticketed, mint a new short prefix** (2–4 uppercase letters, unambiguous against existing ones) and use it consistently from now on.

Then find the highest existing number for that prefix and use the next one, zero-padded to match the existing files. Filename: `TICKET-<PREFIX>-<NN>-<kebab-slug>.md`.

## Step 3 — Write the ticket

Create the ticket file mirroring the structure of the existing tickets in that version. The required sections (per the user's ask) are **Description**, **Current situation (as-is)**, **Desired result (to-be)**, and detailed **Acceptance criteria** — plus whatever metadata header and Notes section the existing tickets carry:

```markdown
# TICKET-<PREFIX>-<NN> — <Title>

- **Area:** <Area>
- **Type:** <Bug fix | Refactor | Feature>   ← include for bugs/refactors; features may omit
- **Traceability:** <FR-ID / spec §>
- **Source story:** user-stories.md §<n> — *"<the story line, quoted>"*

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
- [ ] <Verified live in the browser: … — for any UI-visible change.>

## Notes

- <Edge cases, design trade-offs, related tickets, or scope caveats.>
```

Writing rules:
- **As-is** must reference actual code with clickable relative links and, for bugs, name the exact root cause (function, early return, wrong binding). Grep the codebase to find the real files — don't invent paths.
- **Acceptance criteria** are checkboxes, each independently verifiable. Fold in the repo's Definition of Done touchpoints where relevant: store/repository (not raw table) writes, `categoryManual` preservation if categories are involved, additive Dexie migrations, unit tests naming their cases, and a live browser check for UI changes. Never propose raising the `angular.json` bundle budget.
- Match the concise, traceable style of the existing tickets — no filler.

Register the ticket wherever that version indexes them (e.g. a README table row), following the existing row format.

## Step 4 — Write the user story line (linking to the ticket)

Append one checkbox line under the chosen section of the version's `user-stories.md`, matching that doc's voice **and linking to the ticket you just wrote**:

- **Feature / refactor:** `- [ ] As a <role>, I want <capability>, so <benefit> ([TICKET-<PREFIX>-<NN>](./tickets/TICKET-<PREFIX>-<NN>-<slug>.md), <FR-ID>)`
- **Bug:** phrase the desired correct behaviour, tagged `(bug fix — [TICKET-<PREFIX>-<NN>](./tickets/...), <FR-ID> — <one-line root cause>)`.

Keep a traceability reference (FR-ID or spec/UI-layout section) alongside the ticket link — every existing story has one. If no FR-ID applies, cite the section or note it extends an existing FR.

## Step 5 — Report back

Tell the user which **version + section** the story was added to, and link both the user-story line's location and the new ticket. Mention any index/README row updated. Do not run lint/test/build — these are docs, not code.
