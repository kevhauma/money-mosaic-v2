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

- [ ] The sidebar item no longer reads as help or tutorial content, and names the auto-categorisation feature.
- [ ] The page's `h1` matches the nav label.
- [ ] The route path is updated or an alias/redirect preserves any existing link to `/learning` — no dead links from `/help` or the changelog.
- [ ] The badge and sentence no longer state the same thing twice.
- [ ] Any in-app copy referring to the page by its old name is updated (search `/help` guides, FAQ, and changelog entries).
- [ ] Unit tests cover: the shell renders the new label; an existing `/learning` link still resolves.
- [ ] Verified live in the browser, including navigating from any `/help` reference to the page.
- [ ] Verified via the fallow skill and coding-conventions skill.

## Notes

- Naming the two tabs' difference ("Rule proposals" vs "Suggestions") is a related copy fix worth doing while the file is open; not required by these criteria.
- Renaming the route is optional — the label is what misleads. Weigh the churn of changing the path against the benefit.
