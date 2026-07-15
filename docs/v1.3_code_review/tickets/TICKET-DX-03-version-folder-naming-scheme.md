# TICKET-DX-03 — Decide and document the docs version-folder naming scheme

- **Area:** DX / docs hygiene
- **Type:** Refactor (decision ticket)
- **Traceability:** CR2-1.3 (carried over, still open — and now more pressing: `v1.3_code_review` and `v1.3_dashboard_insights` share the `v1.3` prefix, and the two earlier review folders are unnumbered)

## User story

As anyone navigating `docs/`, I want one documented rule for what a version folder is named and when a folder gets a version prefix at all, so the next milestone folder doesn't have to guess and the `docs/` listing sorts meaningfully.

## Description

The current tree mixes three schemes: `vX.Y_name` feature milestones, unnumbered review folders (`code-review`, `coding-review-2`), and now a version-prefixed review (`v1.3_code_review`) that shares its number with an unrelated feature milestone (`v1.3_dashboard_insights`). Nothing needs renaming urgently — links work — but the *rule* must be written down before the next folder is created.

## Current situation (as-is)

- `docs/` contains: `v1.0_foundation` … `v1.8_extended_date_range_picker`, `v2`, `v9999_ideas` (feature milestones, `vX.Y_name`); `code-review`, `coding-review-2` (reviews, unnumbered, inconsistent with each other); `v1.3_code_review` (review, version-prefixed, colliding with `v1.3_dashboard_insights` on sort/skim).
- CLAUDE.md's knowledge table says "don't hardcode a version list, list `docs/`" — so the naming rule is the only contract.

## Desired result (to-be)

- A short "docs layout" note (in `docs/README.md` — create it — or a paragraph in CLAUDE.md's knowledge table) stating: the scheme for feature milestones, the scheme for review/audit folders (e.g. `review-N_topic` or date-stamped), and whether/when existing folders get renamed.
- If the decision includes renames: renames done in one commit with all inbound relative links updated (grep for the old paths across `docs/`, `.claude/`, `CLAUDE.md`, and the memory-adjacent skill files) — **or** the decision explicitly grandfathers existing names and applies forward-only.

## Acceptance criteria

- [x] The rule is written down in exactly one discoverable place and covers both folder kinds (milestone, review).
- [x] `spec-navigator` and `project-map` skills still resolve everything they reference (run their referenced paths through a link check / grep after any rename).
- [x] If renamed: zero broken relative links (`grep -rn "coding-review-2\|docs/code-review" docs .claude CLAUDE.md` reflects the new reality); if grandfathered: the note names the grandfathered folders explicitly so they don't read as counter-examples.
- [x] No code changes; no lint/test/build impact.

## Notes

- Recommendation (from the review): grandfather the existing three review folders, adopt `vX.Y_<topic>` only for feature milestones, and give future reviews a non-version scheme (`review-3_fallow` style) so review cadence never collides with milestone numbering again. Decide, don't drift.
