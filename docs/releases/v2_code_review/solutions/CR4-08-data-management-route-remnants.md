# CR4-8 — Orphaned data-management route wiring: options

Finding: [CR4-8](../code-review.md#cr4-8--the-data-management-route-migration-left-its-old-wiring-behind-half-contradicted). Data management is embedded in the Settings page, but `data-management.routes.ts` still exports a dead `DATA_MANAGEMENT_ROUTES`, and no `/data` or `/settings/data` route exists.

This is a two-sided decision, not a cleanup: the dead file is a symptom of an unresolved question — *is data management a section of Settings, or a routed page?* The record repair half lives in [CR4-13](./CR4-13-ticket-bookkeeping.md); this doc is the code half. **Both directions end the half-state; staying in it is the only wrong option.**

## Option A — Commit to the embed

Delete `data-management.routes.ts`, remove `DATA_MANAGEMENT_ROUTES` from the feature barrel, and (per CR4-13) annotate TICKET-SET-06 to record that the shipped design is an embedded section, superseding the route-based acceptance criteria.

- Wins: matches what shipped and what users see today; smallest diff; the feature folder keeps its component + repository and simply stops pretending to be routed.
- Costs/considerations: export/import/delete-all stops being deep-linkable (relevant if help docs or the how-to guides link "go to Data Management" — worth a grep through `feature-help` content before deciding); the Settings page keeps both change-reasons (see CR4-5 — its Option A sections would contain this). The `feature-data-management` folder then hosts a single embedded component, which is fine — folders map to domains, not routes.

## Option B — Commit to the route

Implement what SET-06's checked criteria describe: `settings.routes.ts` gains a `data` child lazy-loading `DATA_MANAGEMENT_ROUTES`; the settings page swaps the inline `<app-data-management-overview />` for a link card; the ticket's remaining browser-verification criterion gets an honest pass.

- Wins: restores lazy-loading (JSON export/import code leaves the settings chunk); deep-linkable; the ticket record becomes true *as written* instead of needing annotation; sets up CR4-5's Option B shape if that direction wins there.
- Costs: a real UX change needing browser verification; slightly more navigation for a local-first single-user app where settings traffic is tiny — the practical benefit of lazy-splitting this particular chunk is modest.

## Either way

- **Old-URL courtesy:** `/data` was a live URL for a shipped version. A local-first app has no external inbound links, so a redirect is optional — but if Option B, adding `data → settings/data` redirect is one line and free; if Option A, letting `/data` fall through to whatever the router's unmatched behavior is (verify there *is* a sane unmatched behavior — the route table has no wildcard today) is worth one manual check.
- **Spec truth:** `app-shell.component.spec.ts` asserts the `/data` nav link is gone — that stays valid under both options. Under Option B a `settings.routes` spec asserting the child route resolves (exactly what SET-06's AC promised) closes the loop.
- **Decision driver:** this choice should be made jointly with CR4-5 (settings page structure). Route-shaped settings (CR4-5 Option B) implies Option B here; section-component settings (CR4-5 Option A) works with either but reads most naturally with A.
