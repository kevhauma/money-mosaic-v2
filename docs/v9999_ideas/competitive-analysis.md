# Competitive analysis — Money Mosaic vs. commercial & open-source finance apps

Snapshot written 2026-07-20, comparing Money Mosaic (v1.0–v1.7 shipped) against apps with the same
purpose. **[Monarch Money](https://www.monarch.com)** (the current mainstream benchmark, $99.99/yr
Core, $199/yr Plus) gets the deepest treatment; a dedicated section below covers the rest of the
field one by one — YNAB, Actual Budget, Firefly III, Copilot Money, PocketSmith, Lunch Money, and a
few smaller/adjacent ones. This is an ideas/positioning doc, not a spec — anything worth building
should graduate into a versioned `docs/vX.Y_<topic>/` milestone with tickets.

Sources: [monarch.com](https://www.monarch.com), reviews at
[Forbes Advisor](https://www.forbes.com/advisor/banking/monarch-budget-app-review/),
[CNBC Select](https://www.cnbc.com/select/monarch-money-budgeting-app-review/),
[The Penny Hoarder](https://www.thepennyhoarder.com/budgeting/monarch-money-review/),
[Actual vs Firefly comparisons](https://selfhosting.sh/compare/actual-budget-vs-firefly/)
([talos.tools](https://talos.tools/compare/firefly-iii-vs-actual-budget)),
[Firefly III self-hosting write-up](https://www.xda-developers.com/self-hosting-firefly-iii-fixed-my-budgeting/),
[PocketSmith review](https://thecfoclub.com/tools/pocketsmith-review/) and
[features page](https://www.pocketsmith.com/features/),
[Copilot alternatives round-up](https://getfinny.app/blog/apps-like-copilot-money).

---

## Where Money Mosaic is better (or deliberately different)

1. **Privacy & data ownership — the core differentiator.** Monarch syncs your credentials/tokens
   through Plaid/Finicity/MX and stores your full financial history on their servers. Money Mosaic
   has *no backend*: everything lives in IndexedDB in your browser, exportable as one JSON file
   (FR-DAT-1/2). No account, no email, no vendor to get breached or acquired (Monarch itself is the
   app everyone fled to when Mint was shut down — the same fate can't happen to a local file).
2. **Free, forever, no subscription.** Monarch is $99.99–$199/yr. Every open-source alternative
   with sync (Actual, Firefly III) still needs a server you host; Money Mosaic needs a browser tab.
3. **European/Belgian bank reality.** Monarch's 13,000+ institutions are overwhelmingly US/Canada.
   Money Mosaic is built around EU bank CSV exports (KBC/Belfius presets, mapping wizard for
   anything else), IBAN-aware matching, and EUR formatting. For a Belgian user, Monarch mostly
   doesn't work at all.
4. **Transfer detection built on IBANs.** Tiered auto-linking (own-IBAN match, heuristics),
   manual link/unlink, and stats that exclude transfers so moving money never counts as
   income/expense. Aggregator apps get this wrong constantly because they see two feeds that don't
   know about each other.
5. **Joint accounts done properly.** Monarch's couples story is "share one household view."
   Money Mosaic's v1.1 model is *contribution tracking*: my stake in a joint pot = what I put in
   minus my share of what it spends, partner inflows classified as neutral (not income), manual
   attribution overrides. That is a genuinely more correct net-worth semantics than anything the
   commercial apps offer.
6. **Transparent, user-owned categorisation.** A priority-ordered rules engine the user can read
   and edit, plus an in-browser TF.js suggester (v1.2) that only ever *suggests*, mines rule
   proposals back into the visible rule set, and never overrides a manual category. Monarch's
   auto-categorisation is a black box you correct after the fact.
7. **Loan tracker with schedule reconciliation.** v1.7 reconciles actual payments against a
   theoretical amortization schedule (ahead/behind, interest saved). Monarch shows loan balances
   from the feed; it doesn't tell you what an overpayment *bought* you.
8. **Undoable, transactional imports** with deterministic dedupe fingerprints, malformed-row
   reporting, and per-batch undo. Aggregator users can't undo anything the feed did.
9. **Income as a first-class analysis** (v1.6): per-source trends, YoY, lump-sum smoothing
   (13th month/vacation pay), step-change detection, gross-vs-net ratio. Monarch treats income as
   a cash-flow line.

## Where Money Mosaic falls short of Monarch (and peers)

### Big functional gaps (Monarch table stakes we don't have)

1. **Budgeting.** The single biggest gap. There is *no* concept of a budget anywhere in Money
   Mosaic — no per-category monthly targets, no budget-vs-actual view, no rollover. Monarch, YNAB,
   Actual, Firefly — every peer has this as its centrepiece. We have rich *hindsight* (stats,
   comparisons) but zero *forward intent*. A `budgets` table keyed by category + period with a
   dashboard panel would close most of it; envelope/rollover semantics could come later.
2. **Goals.** "Save €X for a house by date Y", linked to a savings account or category, with
   progress and pace ("on track / behind"). Monarch makes this a headline feature. We track
   savings movements but give them no target or narrative.
3. **Recurring & subscription detection + bill calendar.** Monarch auto-detects recurring
   charges, shows a calendar of upcoming bills, and flags renewals — reviewers repeatedly say this
   alone recovers the subscription cost. Already noted in [../v2/requirements.md](../v2/requirements.md)
   as backlog; this analysis argues it should be prioritised: it's the most-praised Monarch feature
   that is *fully achievable offline* (pure inference over existing transactions — cadence + amount
   + counterparty clustering).
4. **Cash-flow forecasting.** Projected balance per account over the coming months from recurring
   items + budgets ("will I go negative before payday?"). Depends on #1/#3; Monarch Plus is now
   pushing long-range forecasting as a premium tier.
5. **Manual asset/liability tracking for full net worth.** Monarch's net worth includes real
   estate, vehicles, and investment accounts. Ours is bank accounts only. A low-effort, fully
   local version: manual "asset" entries with a value history (house, car, brokerage snapshot you
   type in quarterly). No feed needed — just a table and a form.
6. **Investment tracking.** Even the manual flavour (holdings, cost basis, current value) is
   absent. Probably fine to keep out of scope — it's a different product — but worth an explicit
   decision rather than an accident. A manual-asset line item (#5) covers the net-worth angle.

### Structural gaps (consequences of local-first — accept, mitigate, or park)

7. **Automatic bank sync.** Monarch's entire pitch is "connect everything, it updates itself."
   Ours is manual CSV export/import — honest, but recurring friction. True aggregation
   contradicts NFR-PRIV-1 (no network transmission of financial data). Mitigations that *don't*
   break the principle: more bank presets (TICKET-IMP-01 is still open), drag-drop multi-file
   import polish, an "import reminder" nudge showing days since last import per account.
   PSD2/open-banking APIs exist in the EU but require a licensed intermediary (server + secrets),
   so they're out unless the local-first principle changes.
8. **Multi-device & mobile.** Monarch is web + iOS + Android, always in sync. Money Mosaic lives
   in one browser profile; moving = export/import. A phone is realistically where people check
   finances. Possible without a backend: PWA install + responsive pass, and optionally
   user-owned encrypted sync (file to the user's own Drive/Dropbox, or WebRTC device-to-device) —
   both already flagged as tension points in v1.4's "considered, not ticketed".
9. **Notifications/alerts.** "Large transaction", "renewal coming", "you're over budget" pushes.
   Without a server there is no push while the app is closed; in-app alerts on open (an
   "inbox/what changed since last visit" panel) are feasible and would cover most of the value.
10. **Collaboration.** Monarch gives a partner and even a financial advisor live shared access.
    We model *joint money* better than they do (see above) but two people can't both *use* the
    same Money Mosaic data from their own devices. Same mitigation path as #8.

### Polish gaps (smaller, mostly local-friendly)

11. **Multi-currency** — single implicit EUR today; currency/locale settings are already ticketed
    (TICKET-SET-03/04 in [../v2](../v2/requirements.md)) but per-account currencies + conversion are not.
12. **Transaction review workflow** — Monarch has a "needs review" flag/queue; our closest
    analogue is the uncategorised filter. A lightweight reviewed-flag + inbox count would help
    the weekly-checkin habit loop.
13. **Report builder** — Monarch offers freeform charts (any measure × dimension × period). Our
    dashboard is rich but fixed-function; the v9999 "extra graphs" ideas (heatmap, sankey) are
    steps in this direction without full freeform complexity.
14. **Onboarding/empty-state experience** — Monarch onboards from zero in minutes because the feed
    fills everything. Our cold start (create accounts → export CSVs from bank → map → import) is
    the steepest part of the funnel; the v2 "public ready" how-to work is the right container.
15. **AI assistant / natural-language Q&A** ("how much did I spend on restaurants vs last year?").
    Monarch is shipping this on their data lake. Local equivalents exist (rule-based query UI, or
    an on-device model in the same spirit as the v1.2 categoriser) but this is v-future material.

## The rest of the field, app by app

The Monarch sections above set the baseline; this section only records where each other app
*differs from that baseline* in a way that matters to us — no need to repeat "has bank feeds, has
mobile apps, costs money" every time.

### YNAB (~$109/yr) — the budgeting methodology benchmark

Zero-based envelope budgeting: every dollar gets a job, overspending is dragged forward and must
be covered, age-of-money as a health metric. Weakest of the field at *reporting* (our strength)
and single-currency per budget.

- **Has that we lack:** the entire budgeting discipline — not just per-category targets but the
  workflow of assigning money and reconciling overspend. YNAB users are loyal to the *method*,
  not the software.
- **We do better:** analysis/insights depth, joint-account semantics, EU CSV import (YNAB's
  direct import is US/UK-focused; EU users live off community CSV converters), price.
- **Lesson:** when Money Mosaic builds budgets (gap #1), decide explicitly between YNAB-style
  envelopes (money assigned from actual balances, rollover mandatory) and Monarch-style targets
  (category limits compared to actuals). Targets fit our stats-first architecture far more
  naturally; full envelope semantics require account-balance integration we'd have to design for.

### Actual Budget (free, open-source) — the closest philosophical cousin

Local-first envelope budgeting: data in a local SQLite file, optional self-hosted sync server,
web + mobile clients. The most direct "same values, different choices" comparison that exists.

- **Has that we lack:** budgets (envelope model), **multi-device sync without a vendor** (their
  optional sync server relays end-to-end-encrypted CRDT messages — the user hosts it or uses a
  community host, and the server never sees plaintext), scheduled/recurring transactions with a
  built-in forecast of upcoming balances, goal templates on envelopes, bank sync in the EU via
  optional GoCardless/SimpleFIN bridges the user configures with their own credentials.
- **We do better:** zero install (a browser tab vs. app/server setup), import UX (mapping wizard,
  presets, undoable batches vs. Actual's more manual importers), rules + ML categorisation
  (Actual has rules but no learning suggester), joint-account contribution model, dashboard
  analytics (Actual's reports are thin), loan amortization tracking, income analysis.
- **Lesson:** Actual's E2E-encrypted relay sync is an existence proof that **multi-device sync
  does not require abandoning local-first** (gap #8) — the pattern is compatible with NFR-PRIV-1
  if the relay only ever sees ciphertext. Their CRDT-message approach is the reference design if
  we ever build sync. Their GoCardless bridge is likewise the reference for opt-in EU bank feeds.

### Firefly III (free, self-hosted) — the power-user accounting system

Self-hosted PHP web app, double-entry bookkeeping, unlimited users, strong rules engine, budgets,
piggy-bank goals, bills, multi-currency, REST API, and a separate importer tool with bank-format
configs. Requires a server (NAS/VPS/Pi) and ongoing maintenance.

- **Has that we lack:** budgets, bills/recurring with due dates, "piggy bank" savings goals,
  multi-currency, liability accounts of any shape, tags as a second categorisation axis, audit
  log, full REST API for automation.
- **We do better:** setup cost (Firefly's biggest complaint is install/maintenance burden — we
  have none), UI/UX modernity, categorisation suggestions (their rules are powerful but manual),
  transfer auto-detection (their importer needs explicit config), insights presentation.
- **Lesson:** Firefly's per-bank importer configs are community-contributed files. TICKET-CAT-06
  (share rules) already gestures at this — a shareable **mapping-profile/preset format** could
  crowdsource the bank-preset problem (gap #7 mitigation) instead of us hand-authoring presets.

### Copilot Money (~$95/yr, Apple-only) — the design & on-device-ML benchmark

iOS/macOS native, praised for the best-designed finance UI in the field and a per-user
machine-learning categoriser. Hard wall: no web, no Windows, no Android.

- **Has that we lack:** budgets, recurring detection, investment tracking, Amazon/Venmo item-level
  enrichment, design polish as a product feature.
- **We do better:** platform reach (any browser vs. Apple devices only — on this axis we beat
  them, ironically, via the web), privacy (still a cloud aggregator underneath), price.
- **Lesson:** Copilot validates our v1.2 bet — a personal, per-user learning categoriser is a
  headline differentiator even in paid apps. Ours is *more* private (in-browser TF.js). Worth
  saying loudly in the v2 "public ready" messaging.

### PocketSmith (NZ, ~$9.95–24.95/mo) — the forecasting benchmark

Calendar-centric: scheduled income/bills placed on a calendar drive balance projections **6–60
months out**, with what-if scenarios per account. Multi-currency, worldwide bank feeds on paid
tiers, CSV import on the cheap/free tier (so it's one of the few commercial apps EU-CSV users can
actually use today).

- **Has that we lack:** the whole forward-looking layer — calendar of upcoming money events,
  long-range balance projection, scenario planning ("what if I buy the car in March?").
- **We do better:** price, privacy, import friction (their CSV tier is deliberately hobbled to
  push feed subscriptions), categorisation automation on the cheap tier.
- **Lesson:** PocketSmith proves forecasting (gap #4) is a *product*, not a feature — people pay
  $25/mo for it. Our recurring-detection idea (gap #3) should be designed from day one with
  "events on a calendar that a projection can consume" in mind, not as a flat list of detected
  subscriptions.

### Lunch Money (~$50–100/yr, web-only) — the multi-currency / indie benchmark

Indie web app, loved by expats and developers: ~90 currencies with automatic conversion to a home
currency, crypto tracking, a full developer API, CSV import as a first-class path (not a fallback),
and Plaid for US/EU feeds.

- **Has that we lack:** true multi-currency (per-account currency + home-currency rollup — our
  gap #11 is the deepest version of this in the field), budgets, recurring detection, public API.
- **We do better:** privacy/local-first (it's a hosted SaaS), joint accounts, analytics depth,
  ML suggestions (their rules are string-match based).
- **Lesson:** their CSV-first posture shows manual import is a viable primary ingestion path for
  a *paid* product — our import UX investment is defensible, not a stopgap. If TICKET-SET-03
  (currency setting) ever grows into real multi-currency, Lunch Money's per-account currency +
  home-currency conversion model is the shape to copy.

### Briefly noted

- **Quicken Simplifi (~$48/yr):** cheapest mainstream aggregator; its "spending plan" (income
  minus bills minus savings = safe-to-spend number) is a simpler alternative budget model worth
  considering for gap #1 — one number, not thirty envelopes.
- **Rocket Money (freemium):** subscription-cancellation concierge + bill negotiation; evidence
  that recurring-charge *management* (not just detection) is what a mass audience wants. The
  detection half is our gap #3; the concierge half needs humans and is out of scope.
- **Tiller (~$79/yr):** bank feeds into your own Google Sheet/Excel — "your data, your file"
  resonates with the same audience as our local-first pitch; their users are a natural audience
  for Money Mosaic's export format being clean and re-usable (FR-DAT-1 JSON today; a CSV/XLSX
  export flavour would court them directly).
- **GnuCash / HomeBank / KMyMoney (free desktop):** the pre-cloud local-first generation:
  double-entry rigor, decades of file-format stability, zero telemetry — but dated UX and no
  automation. Money Mosaic is effectively the modern web successor to this lineage; their
  longevity argues for keeping our export format documented and versioned (import-file
  compatibility is a 20-year promise in that world).
- **Wallet by BudgetBakers / Spendee / Buddy (EU mobile apps, freemium):** the mobile-first EU
  segment with PSD2 bank sync via licensed aggregators (Salt Edge etc.); closest to our user
  geographically, weakest on analysis depth and data ownership. Their existence confirms EU bank
  feeds are only reachable through a licensed intermediary — reinforcing the gap #7 conclusion
  that feeds stay out unless the no-backend principle changes.

### Comparison table (feature presence, not quality)

| | Money Mosaic | Monarch | YNAB | Actual | Firefly III | Copilot | PocketSmith | Lunch Money |
|---|---|---|---|---|---|---|---|---|
| Price | **free** | $99+/yr | ~$109/yr | free (self-host) | free (self-host) | ~$95/yr | $0–300/yr | ~$50–100/yr |
| No server/vendor holds data | **✅ (none at all)** | ❌ | ❌ | ✅ (own server, E2E) | ✅ (own server) | ❌ | ❌ | ❌ |
| Zero-install | **✅** | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| EU/Belgian bank ingestion | **✅ CSV presets** | ❌ | ⚠️ CSV converters | ⚠️ GoCardless bridge | ⚠️ importer configs | ❌ | ⚠️ feeds/CSV | ⚠️ Plaid EU |
| Automatic bank sync | ❌ (by design) | ✅ | ✅ | ⚠️ opt-in bridge | ⚠️ opt-in importer | ✅ | ✅ | ✅ |
| Budgets | ❌ **gap #1** | ✅ targets | ✅ envelopes | ✅ envelopes | ✅ | ✅ | ✅ | ✅ |
| Goals | ❌ gap #2 | ✅ | ✅ | ✅ templates | ✅ piggy banks | ✅ | ✅ | ⚠️ |
| Recurring/bill calendar | ❌ gap #3 | ✅ | ⚠️ scheduled | ✅ scheduled | ✅ bills | ✅ | ✅ core | ✅ |
| Cash-flow forecasting | ❌ gap #4 | ⚠️ Plus tier | ❌ | ⚠️ upcoming | ⚠️ | ❌ | ✅ **best** | ❌ |
| Learning categoriser | **✅ local ML** | ✅ cloud | ❌ | ❌ | ❌ | ✅ cloud | ⚠️ | ❌ |
| User-visible rules engine | **✅** | ✅ | ❌ | ✅ | ✅ **best** | ❌ | ✅ | ⚠️ |
| Transfer auto-detection | **✅ IBAN tiers** | ⚠️ | ⚠️ | ⚠️ | ⚠️ config | ⚠️ | ⚠️ | ⚠️ |
| Joint-account contribution math | **✅ unique** | ❌ (shared view) | ❌ | ❌ | ⚠️ multi-user | ❌ | ❌ | ❌ |
| Loan payoff vs. schedule | **✅** | ⚠️ balance only | ⚠️ | ⚠️ | ✅ liabilities | ⚠️ | ⚠️ | ⚠️ |
| Income trend analysis | **✅ dedicated** | ⚠️ | ❌ | ❌ | ⚠️ reports | ⚠️ | ⚠️ | ⚠️ |
| Multi-currency | ❌ gap #11 | ⚠️ | ❌ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ **best** |
| Multi-device / mobile | ❌ gap #8 | ✅ | ✅ | ✅ | ✅ | ⚠️ Apple only | ✅ | ⚠️ web only |
| Investment tracking | ❌ gap #6 | ✅ | ⚠️ | ❌ | ⚠️ | ✅ | ✅ | ⚠️ crypto |

Reading the table by column: every peer has budgets and recurring detection (the two gaps that are
both universal *and* fully local-buildable); nobody else combines zero-install with zero vendor
custody; and our four differentiators (joint math, IBAN transfers, local ML, loan reconciliation)
are each matched by at most one other app, never by the same one.

## Suggested priority if any of this graduates to a milestone

1. **Budgets** (#1) — biggest gap, fully local, builds directly on existing categories/stats.
   Decide the model first (YNAB lesson): Monarch-style category targets fit our architecture;
   full envelopes don't. Simplifi's single "safe-to-spend" number is the minimum viable version.
2. **Recurring detection + bill calendar** (#3) — most-loved Monarch feature, pure inference, no
   privacy cost. Design it calendar-first (PocketSmith lesson) so forecasting (#4) can consume
   the same events later.
3. **Goals** (#2) — small model, high motivational value, pairs naturally with budgets.
4. **Manual assets for full net worth** (#5) — cheap, completes the net-worth story.
5. **PWA/mobile pass** (#8) — widens where the app can live without touching the privacy stance.
   If real sync is ever wanted, Actual Budget's E2E-encrypted relay is the reference design that
   stays compatible with NFR-PRIV-1.

Everything in "structural gaps" that needs a server stays parked unless the no-backend principle
is deliberately revisited (see [../v1.4_data_management/overview.md](../v1.4_data_management/overview.md)
"Considered, not ticketed yet" for the same conclusion reached from the backup angle).
