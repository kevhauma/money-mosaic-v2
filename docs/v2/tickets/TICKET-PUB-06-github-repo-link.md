# TICKET-PUB-06 — GitHub repository link

- **Area:** Public / Onboarding
- **Type:** Feature
- **Traceability:** new capability from [v9999_ideas/requirements.md](../../v9999_ideas/requirements.md) ("Public Ready" — presentable/legible public surface); no existing FR-* covers this

## User story

As a visitor evaluating this local-first app, I want a visible link to its GitHub repository, so I can inspect the source, verify the "no backend, data never leaves your browser" claim myself, and find it again from within the app.

## Description

The app currently has no in-app link to its own source repository anywhere — not on the (upcoming) landing page, not in Settings. This ticket adds a small, low-key GitHub link, primarily on the public landing page (mirroring TICKET-PUB-01's local-first trust message with a "see for yourself" proof point) and optionally surfaced again in Settings for a returning user who wants to find it later.

## Current situation (as-is)

- No GitHub/repository URL appears anywhere in the app UI. The repo is `https://github.com/kevhauma/money-mosaic-v2` (`git remote -v`), referenced only in `.github/workflows/deploy.yml` and `package-lock.json` — never surfaced to a user.
- [TICKET-PUB-01](./TICKET-PUB-01-home-landing-page.md) (`feature-home/`) builds the public landing page this link primarily belongs on; it explains the local-first/no-backend model but has no link to the source that backs up that claim.
- [settings-overview.component.html](../../../src/app/feature-settings/components/settings-overview/settings-overview.component.html) currently renders only the theme-picker `mm-paper` section — no "About"/links section exists on `/settings` to append a repository link to.
- Neither `package.json` nor `README.md` declares a `repository` field or a rendered GitHub URL anywhere the app's build could read from.

## Desired result (to-be)

- The landing page (`feature-home/`) includes a small, low-key GitHub link (icon + "View source on GitHub" or similar), pointing at `https://github.com/kevhauma/money-mosaic-v2`, opened in a new tab (`target="_blank" rel="noopener noreferrer"`). Placed alongside or near the local-first/no-backend messaging as a "verify it yourself" proof point, not as a primary call-to-action (the CTA stays "Get started" / "Open dashboard").
- The same link is optionally added to `/settings` (`settings-overview.component.html`), e.g. a small "About" section below the theme picker, so a returning user who skipped the landing page can still find the repository.
- The repo URL is defined once (e.g. a constant in `core/` or an environment/shared config) and reused by both places, not hardcoded twice.

## Acceptance criteria

- [x] A GitHub repository link renders on the landing page, pointing at the correct URL, opening in a new tab with `rel="noopener noreferrer"`.
- [x] The link is visually low-key (not competing with the primary "Get started" CTA).
- [x] The repository URL is defined in exactly one shared constant, imported by both the landing page and (if built) the Settings section — not duplicated as a literal string.
- [x] Settings page gains an optional small "About"/links section with the same GitHub link, without disturbing the existing theme-picker section above it.
- [x] Unit tests cover: the link renders with the correct `href`, `target`, and `rel` attributes on both the landing page and (if built) the Settings section.
- [x] Verified via the fallow skill and coding-conventions skill.
- [x] Verified live in the browser: landing page shows the link and it opens the correct GitHub URL in a new tab; Settings shows the same link if that half is built.

## Notes

- Depends on [TICKET-PUB-01](./TICKET-PUB-01-home-landing-page.md) existing first (the landing page it's placed on) — build after PUB-01 lands, or as part of the same pass if convenient.
- The Settings placement is explicitly optional/secondary scope: if time-boxed, ship the landing-page link alone and leave the Settings "About" section as follow-up — don't block this ticket on building a whole new Settings section.
- Keep this to a plain link, not a live GitHub API call (star count, last-commit badge, etc.) — that would be an external network call from a local-first app, out of scope here.
