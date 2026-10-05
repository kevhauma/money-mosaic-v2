# TICKET-PUB-04 — Tell users where their data actually is, and how to back it up

- **Area:** Public / Onboarding
- **Released in:** [v2](../../releases/v2/overview.md)
- **Type:** Feature
- **Traceability:** new capability from [v9999_ideas/requirements.md](../../v9999_ideas/requirements.md) ("Public Ready"). Ties to NFR-PRIV-1 (as amended) and FR-DAT-1/FR-DAT-2 (export/import, built by [v1.4 TICKET-DAT-01](../../data-management/tickets/TICKET-DAT-01-full-data-export-import.md)).

> **Rewritten 2026-10-05 — v3 reversed this ticket's premise.** It was written to tell users their
> data "never leaves the browser", which [TICKET-SRV-05](../../server/tickets/TICKET-SRV-05-repositories-over-http.md)
> and [TICKET-SRV-08](../../server/tickets/TICKET-SRV-08-retire-dexie.md) made false: the data now
> lives in one SQLite file on a server the user runs. Built as originally written, this ticket
> would ship a privacy claim the app no longer honours — so the mechanism half is rewritten below
> and the original wording kept struck through. **The user story is unchanged and is the reason the
> ticket survives rather than being closed:** someone still cannot see where their money data is
> kept, and still needs telling how not to lose it. If anything the stakes rose — a browser profile
> was at least being caught by whatever backs up the machine, and a SQLite file the user has never
> heard of is not.

## User story

As a privacy-conscious user, I want the app to clearly tell me where my data is kept and show me how to back it up or move it elsewhere, so I trust the app with my financial data and don't lose it.

## Description

This ticket is the "make it visible" half of the privacy-and-durability story — the mechanism (full export/import) is built by v1.4's TICKET-DAT-01; this ticket makes sure a user actually discovers it and understands where their data sits, since an unexplained property might as well not exist from the user's perspective, and an unknown single point of failure is worse than that.

## Current situation (as-is)

Most of what this ticket asked for arrived while it sat open — not by anyone working it, but as
fallout from v3 having to re-state every claim it falsified. What is left is the one piece nobody
else had a reason to build.

**Already true (2026-10-05), and not to be rebuilt:**

- **Settings → Data carries the explanation**, in a "Where your data lives" panel added by
  [TICKET-SRV-08](../../server/tickets/TICKET-SRV-08-retire-dexie.md) — the server, the single
  SQLite file, what the browser does and does not keep. It sits **below** the export/import and
  send/receive cards rather than above them, which is the weaker placement for an explanation of
  the buttons above it; worth moving, but not under this ticket
  ([`data-management-overview.component.html`](../../../src/app/feature-data-management/components/data-management-overview/data-management-overview.component.html)).
- The **export card says what a backup leaves out** (the trained model), so a restore holds no
  surprises.
- The **FAQ answers it** — "Is my data ever sent anywhere?" in
  [`faq.ts`](../../../src/app/feature-help/data/faq.ts) — and the **landing page** states the
  self-hosted model rather than the browser-only one it shipped with.
- **`server/README.md` and the root README** carry the operator-facing half: where the file is, how
  to copy it safely, and how to restore it ([TICKET-SRV-09](../../server/tickets/TICKET-SRV-09-single-process-local-hosting.md)).

**Still missing — and the whole of what is left to build:**

- **Nothing surfaces any of it to a user who never opens the Data page.** Every statement above is
  somewhere the user has to go looking. A person who imports a year of transactions and never
  visits Settings has no idea their finances now depend on one file nobody has told them to copy.
- ~~Depends on TICKET-DAT-01 existing~~ — it shipped in v1.4; the dependency is satisfied.
- ~~No messaging about the local-first/no-backend data model exists anywhere in the UI today.~~

## Desired result (to-be)

- ~~A clear, prominent explanation lives alongside the Export/Import UI… (all data lives in this browser's storage, nothing is ever sent to a server)~~ — **done, and with true copy**, by TICKET-SRV-08. Not this ticket's work any more; see as-is.
- **A one-time, dismissible callout inside the app** tells the user where their data is kept and
  that backing it up is on them, pointing at Settings → Data where the export lives. (**Not** "the
  Data page" — there is no such page: "Data" is a nav *group heading* over Accounts/Transactions/
  Categories/Import, and the export is the Data *section* of Settings. `guides.ts` already says
  "Settings → Data"; this follows it.) Gated by its own
  persisted "seen" flag, distinct from TICKET-PUB-01's landing-page flag, following the same
  `localStorage` pattern and for the same reason ([`VisitedService`](../../../src/app/core/onboarding/visited.service.ts)):
  this is per-browser UI state, not data a restored backup should carry across.
- **It is shown when it is worth reading, not on an empty account.** A brand-new account has
  nothing to lose and a banner there is noise competing with the Import call-to-action
  ([TICKET-STAT-22](../../dashboard/tickets/TICKET-STAT-22-empty-dashboard-state.md) owns that
  surface). It appears once the account actually holds transactions — the first moment the warning
  is about something real.
- **The copy states the durability risk, not just the privacy property.** "Nobody else can read
  this" was the v1 message; "nobody else is backing this up" is the v3 one, and it is the half a
  user cannot infer. It names where the data is in one sentence and what to do about it in one
  more.
- TICKET-PUB-01's landing page and TICKET-PUB-03's FAQ privacy entry link to the Data page rather
  than duplicating the explanation (single source of truth for the detailed copy).

## Acceptance criteria

- [x] An explanation of where the data is kept is visible alongside the Export/Import UI. (Inherited from TICKET-SRV-08 rather than built here — **verified**, not rewritten: the "Where your data lives" panel names the server, the single SQLite file and what the browser does keep. Seen rendering at `/settings` on 2026-10-05, and pinned by `data-management-overview.component.spec.ts` — "says the data is on the server, and claims nothing about this browser". **Corrected after review:** an earlier draft of this line said the panel sits "directly above the Export/Import cards". It does not — the template order is export, import, send, receive, *then* the panel, as its own sentence "the export **above** is your own copy of it" implies. "Alongside" is satisfied; "above" was wrong and is not something this ticket verified.)
- [x] A one-time dismissible in-app callout surfaces that message with a link to where the export is taken, gated by its own persisted "seen/dismissed" flag distinct from TICKET-PUB-01's landing-page flag. (`core/layout/backup-reminder/`, mounted in the shell beside the default-password notice — a mount now pinned by two cases in `app-shell.component.spec.ts`, since deleting the element from the shell template previously broke no test. Its flag is `mm-backup-reminder-dismissed:<userId>`, and `backup-reminder.service.spec.ts` asserts the separation both ways — setting `mm-has-visited` does not dismiss it, and dismissing it does not disturb `mm-has-visited`. That matters because the landing-page flag is set the first time anyone reaches the dashboard, which is *before* this callout can have anything to say: sharing a key would dismiss a notice nobody had seen. **Keyed per user after review:** a single per-browser key meant that on a household's shared browser, whoever signed in first dismissed it for everyone after them, each of whom has their own un-backed-up account. Covered by "still shows for the next person to sign in on the same browser".)
- [x] Dismissing it persists — it does not reappear on the next app load, in that browser. (Verified live 2026-10-05: clicked "Got it", the banner went and `mm-backup-reminder-dismissed` read `true`; a full reload of `/dashboard` came back without it. Clearing the key brought it back on the next load, which is the other half of the same claim.)
- [x] It does **not** appear on an empty account, where there is nothing to lose and the Import call-to-action owns the screen. (`visible` requires `transactions().length > 0`, covered by "stays away from an empty account". It also requires `hydrated()` — an un-hydrated store reads as empty, so without that the banner would be absent on load and appear when the data arrived, which reads as a glitch rather than a notice; covered by "waits for the store to hydrate rather than flashing in afterwards".)
- [x] The copy names the durability risk, not only the privacy property. ("...back up its database file too, because nothing else is." The privacy half is one clause — "not in this browser" — because privacy is the part a user already assumed and durability is the part they cannot infer. **Reworded after review:** the first draft said "That file is the only copy, and nothing backs it up on its own. Export a copy of your data..." — which offers a per-account JSON export as the remedy for the *server's* file, two different things, and hands a member on someone else's server a duty they cannot discharge. This ticket's own Notes warned about exactly that. The copy now splits them the way Settings → Data already does: the export is yours, the file is the operator's. Asserted by "keeps the personal export and the operator-only file backup apart".)
- [x] No claim anywhere in the callout contradicts the v3 data model — specifically, nothing says or implies the data stays in this browser. (Asserted as an absence as well as a presence: the spec requires the text to match neither `/never leaves (your|this) browser/i` nor `/local-first/i`. Written that way because this ticket's original copy said exactly those things, and a spec that only checked the new sentence would pass on a page that kept both.)
- [x] TICKET-PUB-01's landing page and TICKET-PUB-03's FAQ privacy answer point at the Data page rather than restating the explanation in full. (The FAQ's "Is my data ever sent anywhere?" ends by sending the reader to the Data page for the export and to the server's database file for the whole-installation copy; the landing page carries a one-line chip — "Your data never leaves your own machine" — and no fuller explanation to duplicate. Both were corrected in the TICKET-SRV-08 follow-up; neither restates this ticket's copy.)
- [x] Unit tests cover: the dismiss action persisting the flag; the callout not rendering when the flag is set; the callout not rendering on an empty account. (**13 tests across two new spec files, plus two in the shell's**, all passing: `backup-reminder.component.spec.ts` covers the copy, the export/operator split, the link target, the empty account, the signed-out case, the hydration gate, dismiss-then-gone-and-persisted, already-dismissed-on-load, and the shared-browser second user; `backup-reminder.service.spec.ts` covers the round trip, the per-user separation, the flag separation from the landing page, and a `localStorage` that throws in either direction. Both files restore mocks and remove only their own keys in `afterEach` — the test builder runs with `isolate: false`, so a `Storage.prototype` spy left installed makes `localStorage` throw for whatever file runs next in that worker, and a blanket `localStorage.clear()` wipes other suites' keys. That was a real hazard in the first draft, caught in review.)
- [x] Verified via the fallow skill and coding-conventions skill. (Both gates exit 0: `npx fallow dead-code --baseline .fallow-baseline.json --fail-on-issues --quiet` and `npx fallow health --complexity --max-cognitive 30 --max-cyclomatic 30 --max-crap 1000 --fail-on-issues --quiet`. Conventions: own folder per component, `OnPush` + `inject()` + native `@if`, `shared/ui` primitives imported by file rather than through the barrel — the same note `app-shell` and the default-password notice carry, since a barrel import would pull all of `shared/ui` into the shell's chunk — and the service sits in `core/onboarding/` next to `VisitedService`, exported from its barrel.)
- [x] Verified live in the browser: clear the flag, load the app with a non-empty account, confirm the callout appears with a working link to the export; dismiss it, reload, confirm it stays dismissed. (Done 2026-10-05 against `npm run dev`, signed in as the seeded admin with the dev seed's 41 transactions. The banner rendered above the dashboard under the password notice; "Back it up" navigated to `/settings`; "Got it" removed it and wrote the flag; a reload came back clean; clearing the key brought it back. Separately confirmed from the other side against a production build, where it correctly stayed away from an empty account while TICKET-STAT-22's empty state rendered. **One caveat on the link, found in review:** it lands at the *top* of Settings, and the export is the sixth of seven sections — so "a working link to the export" means the page that contains it, not the card itself. Anchor scrolling (`withInMemoryScrolling`) is not configured in `app.config.ts`, so `/settings#data` would not jump either; worth its own small ticket. Also worth recording: the banner lives in the app shell, so it does **not** render on `/` — the landing page is outside the shell — and a first sign-in lands there, not on the dashboard.)

## Notes

- ~~Hard dependency on v1.4's TICKET-DAT-01~~ — satisfied; export/import shipped in v1.4.
- Uses the same `localStorage`-flag pattern as TICKET-PUB-01 for "shown once" state, for the same reason: this is ephemeral per-browser UI state, not financial data that belongs in a TICKET-DAT-01 export. It therefore reappears for the same user in a different browser, which is correct — the thing being taught is about the installation, and the second browser is a second person as often as not.
- **The per-account export is not the whole-installation backup.** This callout points at the Export on the Data page, which is one account's data. Whoever runs the server still has to copy the SQLite file; that is the README's job ([TICKET-SRV-09](../../server/tickets/TICKET-SRV-09-single-process-local-hosting.md)) and the callout should not imply otherwise to a non-admin who cannot do it.
