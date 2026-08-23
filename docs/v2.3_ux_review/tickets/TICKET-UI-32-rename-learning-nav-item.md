# TICKET-UI-32 — "Learning" reads as tutorials but opens a training console

- **Area:** UI / Navigation
- **Type:** Bug fix
- **Traceability:** UX review (UXR-19); follows TICKET-UI-26 (two labelled nav groups)

## User story

As someone looking for help, I want nav labels to describe where they lead, so that I do not click "Learning" expecting tutorials and land in a machine-learning console.

## Current situation (as-is)

The sidebar's **"Learning"** item sits in the "Data" group, two items above "How-to's" and "FAQ". In an app that genuinely does ship tutorials under those two labels, "Learning" reads as a third one.

It opens `/learning`, the auto-categoriser's model training console — training window, model status, rule proposals. Useful, but not what the label promises, and the page compounds it: a "Not trained" badge sits immediately above the sentence "Not trained yet", and it offers a five-option "Training window" control before ever explaining what training is.

The page also presents "Rule proposals" and "Suggestions" as two tabs with no stated difference between them.

## Desired result (to-be)

- The nav label names what the page does — e.g. "Auto-categoriser" — so it cannot be mistaken for help content.
- The page's own heading matches the nav label.
- The duplicated status ("Not trained" badge above "Not trained yet") is resolved to one statement.

## Acceptance criteria

The route was renamed as well as the label — the Notes below leave that optional, and it was taken:
`/learning` was the last surface still carrying the misleading name, and keeping it alive costs one
redirect. The feature *folder* stays `feature-learning`; renaming that is churn nobody sees.

- [x] The sidebar item no longer reads as help or tutorial content, and names the auto-categorisation feature. (`app-shell.component.html` → **Auto-categoriser**, pointing at `/auto-categoriser`.)
- [x] The page's `h1` matches the nav label. (`mm-page-header title="Auto-categoriser"`; live `h1` reads `Auto-categoriser`, identical to the nav item's text.)
- [x] The route path is updated or an alias/redirect preserves any existing link to `/learning` — no dead links from `/help` or the changelog. (**Both**: the path is now `auto-categoriser`, and `learning` stays in the table as a `pathMatch: 'full'` redirect. Live: navigating to `/learning` lands on `/auto-categoriser`.)
- [x] The badge and sentence no longer state the same thing twice. (The `untrained` copy read "Not trained yet." under a badge reading "Not trained". It now says what training would do: *"Train it on the transactions you have already categorised, and it will suggest a category for the ones you have not."* — which also gives the page its first explanation of what training is, ahead of the Training-window control. `model-status-display.spec.ts` now asserts the sentence does not contain the badge's own label, so the duplication cannot come back under a different wording.)
- [x] Any in-app copy referring to the page by its old name is updated (search `/help` guides, FAQ, and changelog entries). (Guides: the summary, a step, and the Try-it label and route. FAQ: no mentions. Changelog: the TICKET-UI-26 line describing the *current* nav grouping — "Categories, Learning and Import" — was stale and is updated. **Two dated release entries keep the old name on purpose**, from v1.2 and v1.6.2: they record what shipped on the day, and rewriting them would make the changelog disagree with itself. This ticket's own entry names both the old and the new label, which is what lets a reader resolve them.)
- [x] Unit tests cover: the shell renders the new label; an existing `/learning` link still resolves. (`app-shell.component.spec.ts` pins the Data group's hrefs, now including `/auto-categoriser` and not `/learning`; `app.routes.spec.ts` → "resolves /auto-categoriser…" and "still resolves the old /learning URL, landing on /auto-categoriser", the latter asserting `router.url` after the redirect. Plus `learning-overview.component.spec.ts` on the `h1`.)
- [x] Verified live in the browser, including navigating from any `/help` reference to the page. (`/learning` → `/auto-categoriser` with `h1: Auto-categoriser`; the sidebar's only matching item is `Auto-categoriser` → `/auto-categoriser`; and the guide's button, now reading "Try it — go to the Auto-categoriser", lands on `/auto-categoriser`. No `/help` page mentions "Learning" any more.)
- [x] Verified via the fallow skill and coding-conventions skill. (`fallow dead-code` and `fallow health --complexity` both exit 0; `ng lint` clean.)

## Notes

- Naming the two tabs' difference ("Rule proposals" vs "Suggestions") is a related copy fix worth doing while the file is open; not required by these criteria. **Deliberately left alone** — they are two `<section>`s rather than tabs, and saying what separates them is a copy decision that deserves its own ticket rather than riding along in a rename.
- Renaming the route is optional — the label is what misleads. Weigh the churn of changing the path against the benefit. **Done**: the churn came to one route entry, one redirect, one `routerLink`, and the guide's `tryItRoute`. The folder name was left alone.
