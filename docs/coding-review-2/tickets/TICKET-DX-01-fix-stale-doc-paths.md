# TICKET-DX-01 — Fix stale `docs/v1` paths after the docs reorg

- **Area:** Docs / developer experience
- **Type:** Chore
- **Traceability:** CR2-1.1

## Description

Commit `1d97d49` renamed `docs/v1` → `docs/v1.0_foundation`, `docs/v1.5` → `docs/v1.1_joint_accounts`, and `docs/v1.6` → `docs/v1.2_auto_categorise`, but every file *pointing at* those paths still uses the old names. CLAUDE.md and the `project-map` skill are the documented entry points for every human and agent session, so a dead path there silently degrades onboarding and sends the `spec-navigator` subagent looking for files that don't exist.

## Current situation (as-is)

- [CLAUDE.md:25-26](../../../CLAUDE.md) — the "Where knowledge lives" table references `docs/v1/finance-app-spec.md`, `docs/v1/user-stories.md`, and `docs/v1/ui-layout-spec.md`; none exist.
- [.claude/skills/project-map/SKILL.md:39-40](../../../.claude/skills/project-map/SKILL.md) — same dead `docs/v1/` paths.
- [docs/code-review/user-stories.md:3](../../code-review/user-stories.md) — the "v1 build checklist" link targets `../v1/user-stories.md` (dead); several story lines in that file also reference `../v1/user-stories.md` sections.
- Unknown further hits — the fix should be grep-driven, not enumerated from this ticket.

## Desired result (to-be)

- Every reference to the pre-rename folder names (`docs/v1/`, `docs/v1.5/`, `docs/v1.6/`, and relative forms like `../v1/`) is updated to the current folder names.
- CLAUDE.md's knowledge table, the `project-map` skill, and the code-review backlog all link to files that exist.

## Acceptance criteria

- [ ] A repo-wide search for `docs/v1/`, `../v1/`, `docs/v1.5`, and `docs/v1.6` (excluding git history and this review's own docs quoting them) returns zero hits in markdown, skills, and config files.
- [ ] Every markdown link touched resolves to an existing file (spot-check by opening each).
- [ ] CLAUDE.md's "Where knowledge lives" table rows for functional requirements and UI layout point at `docs/v1.0_foundation/…`.
- [ ] `.claude/skills/project-map/SKILL.md` reflects the current `docs/` tree (including the existence of `v1.1_joint_accounts`, `v1.2_auto_categorise`, `code-review/`, and `coding-review-2/`).
- [ ] No source code changes; `ng lint` / `ng test` / `ng build --configuration development` still pass (unchanged, but run per Definition of Done).

## Notes

- Do **not** rename any folders in this ticket — fix pointers only. The naming-scheme decision (CR2-1.3) is separate; doing both at once recreates the original problem.
