# TICKET-DX-02 — Enforce conventional commit messages with commitlint

- **Area:** DX / repo hygiene
- **Type:** Feature (tooling)
- **Traceability:** CR2-1.2 (carried over, still open; original evidence: commits `80af6be`/`1d97d49` typed as features while shipping only docs)

## User story

As a developer reading `git log` to answer "when did behaviour X actually ship", I want commit types mechanically enforced, so a `feat:` commit reliably contains a feature and docs-only changes are reliably `docs:`.

## Description

The repo already writes conventional-style messages by convention (`feat:`, `docs:`, `fix:`) and has husky + lint-staged wired, but nothing enforces the format — CR2 documented commits whose type claimed more than the diff delivered. Adding commitlint's conventional config to the existing husky setup closes the gap at commit time. (Type-matches-diff remains a human judgement; the hook enforces the format and vocabulary, which is what's mechanically enforceable.)

## Current situation (as-is)

- Husky pre-commit runs Prettier via lint-staged; there is **no** `commit-msg` hook and no commitlint dependency (verified 2026-07-14: `grep commitlint package.json .husky/*` → no hits).

## Desired result (to-be)

- `@commitlint/cli` + `@commitlint/config-conventional` as devDependencies, a `commitlint.config.*` extending the conventional config, and a husky `commit-msg` hook running `commitlint --edit`.
- The Claude-suffixed trailer lines the repo's commits carry (`Co-Authored-By: …`) must pass — conventional config allows trailers/body by default; verify rather than assume.

## Acceptance criteria

- [x] `git commit -m "bad message"` is rejected; `git commit -m "docs: update tickets"` passes — demonstrated locally.
- [x] A multi-line message with the `Co-Authored-By` trailer passes.
- [x] The allowed type set is documented (default conventional types are fine; if the repo wants `chore`/`refactor`/`perf` — all already in use in history — the default set covers them).
- [x] No change to app code or bundles; `ng lint`/`ng test`/`ng build` unaffected.

## Notes

- Do not add a `prepare-commit-msg` template or scope enforcement — minimum viable gate only; tighten later if noise appears.
- History is not rewritten; enforcement is forward-only.
