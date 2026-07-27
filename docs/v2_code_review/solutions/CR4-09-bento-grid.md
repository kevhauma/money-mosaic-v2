# CR4-9 — Unrendered `bento-grid`/`bento-item`: options

Finding: [CR4-9](../code-review.md#cr4-9--bento-gridbento-item-are-shipped-specced-barrel-exported--and-rendered-nowhere). Two shared/ui components with specs and barrel exports, rendered by no template — likely a deformable-redesign leftover with no recorded status.

The decision is small; the point is that it be *recorded*, because "unknown intent" is the actual defect — the components themselves are harmless.

## Option A — Delete

Remove `shared/ui/bento-grid/` (both components + specs) and the two barrel lines. Git history keeps them recoverable; if a bento dashboard layout is ever ticketed, resurrecting two presentational components is an hour's work against a then-current design language — arguably *cheaper* than adapting stale ones.

- This is the default under the project's own economy: dead exports were CR2/CR3 cleanup material, and Fallow going to zero findings (CR4-14) wants this resolved.
- Pre-flight check before deleting: confirm no in-flight design branch (the repo has had several `design/*` branches) renders them — `git grep bento $(git branch --format='%(refname:short)')`-style sweep, since main-branch grep alone was the evidence base.

## Option B — Keep, with recorded purpose

If the deformable-UI direction genuinely plans a bento dashboard: keep the components, and make the intent tool-visible and human-visible — a `// fallow-ignore-next-line unrendered-component -- reserved for <ticket/doc ref>` suppression *with the reason*, plus a line in the deformable design doc or a v-next ticket referencing them.

- Acceptable only with a concrete reference to point at. "Might be nice someday" is Option A wearing a costume — the shared barrel is the app's sanctioned-primitives list, and an aspirational entry there misleads every autocomplete.

## Option C — Park outside the barrel

Middle ground: remove the barrel exports (so they vanish from the sanctioned API and Fallow's unrendered set) but leave the folder. Honestly assessed: this preserves bytes nobody can use and satisfies neither goal — listed to be rejected explicitly rather than discovered as a tempting compromise later.

## Recommendation shape

A unless a named design doc/ticket claims them within one decision cycle; B requires that claim in writing. Fold whichever into the same commit series as CR4-8's dead-route removal — the two together take the Fallow report's "real findings" column to zero, which is what makes CR4-14's zero-noise gate enforceable.
