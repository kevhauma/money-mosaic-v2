# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

A single primary user: the app's own developer (kevhauma), tracking his personal finances. This is not built for distribution to a general audience — every decision should optimize for one real person's actual accounts, actual banks, and actual habits, not for a generic persona. The spec's "reconciler / saver / privacy-conscious" personas describe facets of that one user's behavior (importing monthly from several accounts, watching savings rate and net worth, refusing cloud finance tools) rather than three different audiences to design for.

## Product Purpose

Turns raw bank CSV exports into an honest, always-current picture of the user's money: what comes in, what goes out, where it goes, and net worth across all accounts. Core loop: import CSV → auto-categorise & auto-link transfers → see the truth in stats. Success means the numbers are trustworthy enough to act on (no inflated income/expense from internal transfers) and the user actually keeps importing and looking at it.

## Positioning

Local-first with no backend, no server, and no account — all data lives in IndexedDB in the browser and nothing is ever sent anywhere. That isn't a limitation being tolerated, it's the reason the user built and uses this over any cloud-based budgeting product. Paired with a genuinely robust, remappable CSV importer (bank-format auto-detect + generic mapping wizard + saved profiles) rather than a fragile hardcoded one, since bank export formats change and vary.

## Operating Context

- Belgium-based bank CSV exports are the primary real-world input: KBC and Belfius presets are shipped and in active use; BNP Paribas Fortis, ING, and Argenta presets remain to be added as real sample exports become available.
- Runs entirely client-side in a browser, single device — there is no sync between devices and none is planned; a user's data lives in one browser's IndexedDB.
- Currency defaults to EUR (Belgium is the main focus) but the app exposes a settings-level currency/locale override rather than hardcoding EUR — see `feat(settings): add currency display settings` / `add locale setting`.
- Account types modelled: Checking, Savings, Joint, Invest — all as cash ledgers (no real investment/portfolio valuation in v1).
- Recurring workflow: periodically export CSVs from bank(s), import into Money Mosaic, review auto-categorisation and auto-linked transfers, check dashboard stats.

## Capabilities and Constraints

- No backend, no server, no auth, no account, no multi-device sync — confirmed as durable, not a v1-only limitation.
- Multi-currency and true investment/portfolio tracking (holdings, market valuation, returns) are explicitly out of scope; Invest accounts stay cash ledgers.
- Split transactions (one transaction → multiple categories) and budgeting/forecasting/subscription detection are parked, not committed.
- Auto-categorisation and auto-transfer-linking are reversible defaults: the user can always inspect and override, and a manually-set category must never be silently overwritten by a rule.
- Bank CSV formats vary and change over time, so the importer must stay generic/remappable rather than assume a fixed schema.

## Brand Commitments

- Product name: **Money Mosaic** (repo/project name "MoneyMosaicVibe" is the dev-facing project name, not the in-app brand).
- No existing voice, tagline, or visual identity has been declared binding yet — visual world is undocumented (no DESIGN.md); multiple redesign experiments exist on branches but none has been confirmed as canonical.

## Evidence on Hand

- No real customer testimonials, case studies, or press — none should be fabricated; this is a single-user personal tool, not a marketed product.
- Dev-mode seed data exists (TICKET-DEV-01) for local development/demo purposes only, not real financial data.
- Real KBC and Belfius CSV exports have been used to validate those two bank presets; BNP Paribas Fortis/ING/Argenta presets are unverified against real exports.

## Product Principles

1. **Correctness over cleverness.** Trustworthy numbers matter more than polish — internal transfers must never inflate income or expense, and every stat should be traceable back to real transactions.
2. **Local-first & private, always.** No feature should require a server, account, or leaving the browser; this is the entire reason the tool exists for its user.
3. **Reversible automation.** Auto-categorisation and auto-linking are helpful defaults the user can always see, inspect, and override — never a black box.
4. **Built for one real user's real banks.** Optimize for actual Belgian bank export quirks and actual usage patterns over generic configurability aimed at a broader audience.
5. **Robust import over pretty import.** A generic, remappable CSV importer beats a fragile hardcoded one, because bank formats change.

## Accessibility & Inclusion

No accessibility standard or specific user need has been established as a product requirement. Single sighted user on desktop browser is the known real-world usage context; no further requirement should be assumed without confirmation.
