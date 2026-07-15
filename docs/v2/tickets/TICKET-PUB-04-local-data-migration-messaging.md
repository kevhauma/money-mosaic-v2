# TICKET-PUB-04 — Inform users their data stays local, and how to move it

- **Area:** Public / Onboarding
- **Type:** Feature
- **Traceability:** new capability from [v9999_ideas/requirements.md](../../v9999_ideas/requirements.md) ("Public Ready" — make sure the user gets informed about data never leaving the browser, use export/import to migrate to another browser). Ties to NFR-PRIV-1 (no network transmission) and FR-DAT-1/FR-DAT-2 (export/import, built by [v1.4 TICKET-DAT-01](../../v1.4_data_management/tickets/TICKET-DAT-01-full-data-export-import.md)).

## User story

As a privacy-conscious user, I want the app to clearly tell me my data never leaves my browser and show me how to back it up or move it elsewhere, so I trust the app with my financial data and don't lose it if I switch browsers or devices.

## Description

This ticket is the "make it visible" half of the local-first privacy story — the actual mechanism (full export/import) is built by v1.4's TICKET-DAT-01; this ticket makes sure a user actually discovers it and understands the guarantee behind it, since an unexplained privacy property might as well not exist from the user's perspective.

## Current situation (as-is)

- **Depends on [TICKET-DAT-01](../../v1.4_data_management/tickets/TICKET-DAT-01-full-data-export-import.md) existing** — before that ticket lands, there is no export/import feature to point users at, so this ticket cannot be meaningfully completed first. If build order across versions puts this ticket before DAT-01, treat it as blocked and pick a different next ticket.
- No messaging about the local-first/no-backend data model exists anywhere in the UI today — this is only documented in `NFR-PRIV-1` ([finance-app-spec.md:159](../../v1.0_foundation/finance-app-spec.md)) and this project's `CLAUDE.md`, both developer-facing.
- TICKET-PUB-01's landing page will carry a short mention of this; TICKET-PUB-03's FAQ will carry a short Q&A entry that links here — this ticket owns the *authoritative*, fuller explanation both of those point to, plus the actual discoverability of the Export/Import UI itself.

## Desired result (to-be)

- A clear, prominent explanation lives alongside the Export/Import UI from TICKET-DAT-01 (in the Data Management / Settings section): what "local-first" means in concrete terms (all data lives in this browser's storage, nothing is ever sent to a server, closing the tab doesn't lose data but clearing browser data does), and that Export produces a portable backup file usable to restore in this browser or move to another browser/device via Import.
- A one-time, dismissible banner or callout (shown once, e.g. gated by the same kind of "seen it" `localStorage` flag pattern TICKET-PUB-01 uses for its landing page, but a separate flag) surfaces this message to new users within the main app itself — not only on the landing page a returning user may never revisit — with a direct link to the Export/Import UI. Dismissing it persists so it doesn't reappear every session.
- TICKET-PUB-01's landing page and TICKET-PUB-03's FAQ privacy entry both link to this ticket's fuller explanation/Export-Import UI rather than duplicating the full explanation inline (single source of truth for the detailed copy).

## Acceptance criteria

- [ ] A clear explanation of the local-first/no-backend data model is visible directly alongside the Export/Import UI (from TICKET-DAT-01).
- [ ] A one-time dismissible in-app banner/callout surfaces this message with a direct link to Export/Import, gated by its own persisted "seen/dismissed" flag distinct from TICKET-PUB-01's landing-page flag.
- [ ] Dismissing the banner persists — it does not reappear on the next app load.
- [ ] TICKET-PUB-01's landing page and TICKET-PUB-03's FAQ privacy answer both link to this ticket's explanation/UI rather than restating it in full (verify no content duplication once all three exist).
- [ ] Unit tests cover: the dismiss action persisting the "seen" flag; the banner not rendering when the flag is already set.
- [ ] Verified via the fallow skill and coding-conventions skill.
- [ ] Verified live in the browser: clear the relevant `localStorage` flag, load the app, confirm the banner appears with a working link to Export/Import; dismiss it, reload, confirm it stays dismissed.

## Notes

- **Hard dependency on v1.4's TICKET-DAT-01** — this ticket has nothing real to point users at until export/import exists. Sequence it after DAT-01 regardless of how the two versions' numbering suggests ordering.
- Uses the same `localStorage`-flag pattern as TICKET-PUB-01 for "shown once" state, for the same reason: this is ephemeral UI state, not financial data that belongs in a TICKET-DAT-01 export.
