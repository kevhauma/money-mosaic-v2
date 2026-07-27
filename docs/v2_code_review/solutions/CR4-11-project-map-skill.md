# CR4-11 — Stale project-map skill: options

Finding: [CR4-11](../code-review.md#cr4-11--the-project-map-skill--the-designated-read-this-instead-of-exploring-doc--is-materially-stale). The skill predates ~half the app: missing 4 of 11 features, reversed hydration model, misplaced files, stale `/data` and `docs/v2` claims, half the shared/ui inventory absent.

Three layers of option here — fix the content, fix the process that let it rot, and shrink how much content *can* rot. They compose; the real decision is how far down the list to go.

## Option A — Full correction pass now

Rewrite against current reality. The review already collected the delta list; a correction pass covers, at minimum:

- Features table → all 11 routed features (`home`, `dashboard`, `accounts`, `transactions`, `import`, `categories`, `learning`, `help`, `changelog`, `settings`, plus the data-management embed noting it is *not* routed — pending CR4-8's outcome);
- Hydration → stores self-hydrate on first injection (PERF-07); `app.config.ts` is `appDb.open()` + dev-seed only;
- `core/state` inventory → include `AppSettingsStore` (+ CR4-10's placement sentence when decided);
- File placements → `date-buckets.ts` under `shared/utils`; add `date-format.ts`, `locale-presets.ts`, `currency-symbol-presets.ts`, `confirm-state.ts`, `with-persisted-crud.ts`, `structural-filters.ts`, `download-json.ts`, `theme-hooks.ts`;
- `shared/ui` inventory → all 27 primitives or (better — see Option C) no exhaustive list at all;
- Missing `core/` modules → `theme`, `onboarding`, `links`, `storage`, `layout`;
- Docs section → `docs/v2` is the shipped Public Ready milestone; add v1.5–v1.9 and the review folders, or defer wholly to `docs/README.md` instead of re-listing.

Cheap, immediately restores trust, and is the prerequisite for the process option meaning anything (a freshness rule guarding a stale doc entrenches the staleness).

## Option B — Process hook so it can't silently rot again

The root cause is that nothing in the shipping workflow touches this file. The `work-ticket` skill already carries doc side-effects (changelog entry, roadmap removal) — add a step: *"if the ticket added/moved a route, store, `core/` module, or `shared/` primitive, update project-map/SKILL.md in the same change."* Mirror one line in CLAUDE.md's verification list if wanted.

- This is the same mechanism that has kept the changelog current (it demonstrably works in this repo), applied to the doc whose staleness costs the most.
- Limitation: only covers skill-driven ticket work; ad-hoc sessions can still skip it. Acceptable — most structural change here flows through tickets.

## Option C — Shrink the claim surface

Staleness risk scales with the number of falsifiable statements. Restructure the skill toward *stable* knowledge and pointers:

- Keep: the tier model (core/feature/shared), placement rules, the "which skill/doc for what" table, the intentional exceptions (learning↔categories coupling, the transactions deep-import).
- Drop or soften: exhaustive per-folder file inventories (say "one file per statistic in `core/stats/` — `ls` it" instead of naming 17 files); the shared/ui component list (point at `shared/ui/index.ts`, which is the actual registry).
- Optionally: generate the volatile parts. Precedent exists in-repo — the pre-commit hook already regenerates the dependency graphs with `GENERATED:` markers; a features-table generator reading `app.routes.ts` + `git ls-files '**/*.store.ts'` could stamp the two most drift-prone sections the same way. Weigh against script maintenance; the marker convention is already established, which lowers the cost.

## Recommendation shape

A is not optional if the file keeps its "read this instead of exploring" charter — a wrong map actively misdirects (this review lost time to the hydration claim). B is the cheapest recurrence guard and uses proven in-repo machinery. C is a judgment call on writing style; even C-lite (drop the two exhaustive inventories) removes most future rot surface for free. The realistic package is A + B + C-lite in one documentation pass, alongside CR4-12's conventions fix (same session, same review-and-verify motion).
