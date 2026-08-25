# Competitive analysis v2 — Money Mosaic vs. commercial & open-source finance apps

Second snapshot, written 2026-08-25 against the app **as it actually stands today** (v1.0–v2.3
shipped: `/dashboard`, `/income`, `/recurring`, `/explore`, `/future`, `/accounts`, `/loans`,
`/transactions`, `/import`, `/categories`, `/auto-categoriser`, `/help`, `/changelog`, `/settings`,
plus the public landing page). It supersedes the first snapshot,
[competitive-analysis.md](./competitive-analysis.md) (2026-07-20, written when v1.7 was the newest
milestone), **for the Money Mosaic column only** — that document stays the reference for the peer
research, which is not re-done here.

**What that means for accuracy.** Every fact about a competitor below — pricing, tiers, feature
presence — is carried forward from the first snapshot's sources and has **not** been re-verified in
the five weeks since. Treat peer columns as "as of 2026-07-20" and re-check before quoting a price
externally. Everything about Money Mosaic is verified against the working tree at the commit this
file was written on, and cites the ticket or source file that proves it.

Why a second version rather than an edit: three of the fifteen gaps the first snapshot named have
been built since it was written — two of them *because* it named them, by its own tickets' account
([v2.1's REC track](../releases/v2.1_extra_graphs/overview.md) cites gap #3 explicitly,
[v2.2](../releases/v2.2_goals_and_forecast/overview.md) cites gap #2) — so the honest artefact is a new
snapshot that scores the old one, not a rewrite that erases what was true in July.

---

## Scoreboard: the first snapshot's fifteen gaps, five weeks later

| # | Gap (2026-07-20 wording) | Status 2026-08-25 | Evidence |
|---|---|---|---|
| 1 | Budgeting | **open** — the one universal peer feature with nothing built | no `budgets` table, no ticket, no version folder |
| 2 | Goals | **closed** | [v2.2 FUT-02/04/05/09](../releases/v2.2_goals_and_forecast/overview.md) |
| 3 | Recurring & subscription detection + bill calendar | **closed** | [v2.1 REC-01..11](../releases/v2.1_extra_graphs/overview.md) |
| 4 | Cash-flow forecasting | **half-closed** — rate-based net-worth projection shipped; per-account balance runway from known events not wired | [FUT-05/07](../releases/v2.2_goals_and_forecast/overview.md), and see §"The half of #4 that is left" |
| 5 | Manual assets/liabilities for full net worth | **open**, and narrower than it looks — see below | [accounts.store.ts](../../src/app/core/state/accounts.store.ts) |
| 6 | Investment tracking | **open by decision** | [PRODUCT.md](../../PRODUCT.md) — "Invest accounts stay cash ledgers" |
| 7 | Automatic bank sync | **unchanged, parked by principle** | NFR-PRIV-1 |
| 8 | Multi-device & mobile | **unchanged** — and still not even installable | `public/` holds two favicons; no manifest, no service worker, no `@angular/pwa` |
| 9 | Notifications/alerts | **partially, in-app only** — price rises, missed payments, stopped series, lost income stream | [REC-04](../recurring/tickets/TICKET-REC-04-recurring-change-flags.md), [INC-09](../income/tickets/TICKET-INC-09-lost-income-stream-warning.md) |
| 10 | Collaboration | **unchanged** | — |
| 11 | Multi-currency | **unchanged** — `Account.currency`/`Transaction.currency` are the literal type `'EUR'`; the setting is a symbol + position, not a unit | [app-db.ts](../../src/app/core/data-access/app-db.ts), [format-settings.ts](../../src/app/shared/utils/format-settings.ts) |
| 12 | Transaction review workflow | **partially** — transfer review is visible and counted, uncategorised is filterable; no per-transaction reviewed flag, no inbox | [TRF-06](../transfers/tickets/TICKET-TRF-06-make-transfer-review-visible.md) |
| 13 | Report builder | **partially** — three new chart *kinds*, still fixed-function; a chart builder stays un-ticketed | [v2.1](../releases/v2.1_extra_graphs/overview.md) |
| 14 | Onboarding/empty-state | **mostly** — landing page, How-to's, FAQ, first-visit routing, Changelog + Roadmap; **the empty dashboard state is still open** | [v2](../releases/v2/overview.md), [STAT-22](../dashboard/tickets/TICKET-STAT-22-empty-dashboard-state.md) |
| 15 | AI assistant / NL Q&A | **unchanged, v-future** | — |

Three closed (2, 3, and effectively 14), one half, three partial, eight standing. The first
snapshot's own priority list ranked budgets first, recurring second, goals third — the app built
**second and third and skipped first**, which is worth naming rather than glossing: goals and
recurring were self-contained and inferable from data already held, while budgets need a new
user-authored entity *and* a model decision nobody has made. That is a real reason, but it is a
reason about effort, not about value.

## What shipped since the first snapshot, in the peers' vocabulary

- **Recurring detection** ([v2.1](../releases/v2.1_extra_graphs/overview.md), FR-REC-1/2/3, eleven tickets).
  Counterparty + amount + cadence clustering over existing transactions, a per-month cost figure, an
  upcoming-bills **calendar or date-ordered list** with a switcher, and change flags (price increase,
  missed payment, stopped series). It is stateless inference — no table, no data entry — which is the
  opposite of how Actual, Firefly and PocketSmith get their bills (all three require you to *enter* a
  scheduled transaction). Two refinements have no peer equivalent at all: detection reads
  joint-account payments at their **full** amount rather than the owner's share
  ([REC-09](../recurring/tickets/TICKET-REC-09-recurring-includes-joint-accounts.md)), and a
  category with a closed applicability window drops out of the list
  ([CAT-10 / REC-05](../releases/v2.1_extra_graphs/overview.md)) — the "we moved, stop showing me rent" case.
- **Goals and a forward projection** ([v2.2](../releases/v2.2_goals_and_forecast/overview.md), FR-FUT-1..6).
  A saving rate measured from complete calendar months; an ordered goal list funded **sequentially**
  (goal 2 starts accumulating only once goal 1 is paid), so reordering *is* the trade-off tool; a
  safety net the projection may never cross; an account scope narrowing both the starting balance and
  the measured rate; a sawtooth net-worth chart; and the inverse mode — fix the date, solve for the
  €/month, where the plan rate is the **maximum** of the per-goal rates, never the sum.
- **Explore** ([v2.1](../releases/v2.1_extra_graphs/overview.md), FR-EXP): a Sankey that provably balances
  (income → accounts → groups → categories, transfers between own accounts included), a treemap
  mosaic that drills down to individual payments, and a Dashboard heatmap over four cycles with
  per-row category colour. The 3D landscape was **closed as won't-do at its feasibility gate** rather
  than half-built.
- **Loan what-ifs** ([v1.7 LOAN-12/13/14](../releases/v1.7_loan_tracker/overview.md)): recurring-overpayment
  and lump-sum scenarios with an estimated early-repayment fee. That is scenario planning — the thing
  PocketSmith charges for — scoped to one loan rather than to the whole balance sheet.
- **Presentation and trust work** ([v1.8](../releases/v1.8_extended_date_range_picker/overview.md),
  [v1.9](../releases/v1.9_deformable_ui_redesign/overview.md), [v2.3 navigation](../releases/v2.3_navigation/overview.md),
  [v2.3 UX review](../releases/v2.3_ux_review/overview.md)): a two-panel date-range picker with relative ranges,
  fiscal-year start and recent ranges; ten themes behind one picker; the sidebar grouped into
  Insights/Data with "Hide amounts" on every Insights page; and a 23-ticket UX pass that fixed, among
  others, a stacked balance-history chart that overstated every account's height and a net-worth tile
  that rendered a positive figure in the same red as a loss.

## Where Money Mosaic is better (or deliberately different) — revised

The first snapshot's nine still hold; several have grown, and three are new.

1. **Privacy & data ownership** — unchanged, still the core differentiator. No backend, no account,
   whole-database JSON export/import, delete-all, persistent-storage request
   ([v1.4](../releases/v1.4_data_management/overview.md)). Deployed as static files behind Caddy
   ([DEPLOYMENT.md](../../DEPLOYMENT.md)) — there is no server-side anything to breach.
2. **Free, forever, no subscription, no install.** Unchanged.
3. **European/Belgian bank reality** — now with a Belgian *default locale* (`en-BE`,
   [SET-10](../settings/tickets/TICKET-SET-10-default-locale-to-belgian.md)) instead of US date
   order. Still only two of five planned bank presets
   ([IMP-01](../releases/v1.0_foundation/overview.md) is v1.0's last open ticket).
4. **IBAN-tiered transfer detection** — and since TRF-06 its review queue is *visible*, with a count
   and a warning badge while still collapsed, instead of silently pending.
5. **Joint accounts as contribution maths** — and now propagating: the recurring detector and the
   net-worth contribution map both read the joint model rather than working around it.
6. **Transparent, user-owned categorisation** — priority rules plus an in-browser TF.js suggester
   that only ever suggests; now with category **applicability windows**, so pickers stop offering
   categories that no longer apply.
7. **Loan tracker with schedule reconciliation** — plus what-if projections.
8. **Undoable, transactional imports.** Unchanged.
9. **Income as a first-class analysis** — twelve tickets: per-source trends, yearly and multi-year
   comparison, lump-sum smoothing, raise/pay-cut step detection, lost-stream warning, gross/net ratio
   from user-entered salary metadata, career-start filtering.
10. **New — recurring detection that requires no data entry.** Against Actual/Firefly/PocketSmith this
    is a different mechanism, not a cheaper copy of theirs.
11. **New — sequentially funded goals, and their inverse.** Every peer's goals are independent progress
    bars. Ours model the fact that money spent on goal 1 is not available for goal 2 — the only version
    of the feature that survives contact with more than one want.
12. **New — flow and cycle visualisation** (Sankey, treemap, heatmap). Monarch and Copilot have
    prettier dashboards; none of the eight peers draws where the money *flowed*.

## Where Money Mosaic still falls short — re-ranked

### 1. Budgets (was #1, still #1, now alone)

Nothing has changed here and everything around it has: with recurring detection shipped, the app can
name the fixed monthly floor of the user's spending — which is most of the input a budget needs. The
cheapest credible version is no longer "thirty envelopes" but Simplifi's single number: measured
income − detected recurring cost − target saving = safe to spend. FR-FUT-1's saving velocity is
already the third term and REC-02's per-month cost is already the second. Monarch-style category
targets (which the first snapshot argued fit this architecture) can layer on later without
re-deciding that first number.

### 2. The half of #4 that is left

The forecast projects a **rate**, not a **calendar**. `ForecastStore` reads `AccountsStore.netWorth()`
and a measured €/month; it does not consume `projectRecurringOccurrences` at all — the only mention of
recurring inside `feature-future` is a comment citing it as a precedent for clock-free functions. So
the app still cannot answer PocketSmith's question, *will this account go negative before payday*,
even though both halves exist in the codebase and
[REC-03 was explicitly designed calendar-first so a projection could consume it](../recurring/tickets/TICKET-REC-03-upcoming-bills-calendar.md).
Highest value-per-effort item in this document: it is wiring, not invention.

### 3. Net worth is bank balances only — and the loans are sitting right there

`netWorth` is the sum of per-account contributions. The `loans` table
([v1.7](../releases/v1.7_loan_tracker/overview.md)) holds real outstanding balances with actual-payment
reconciliation, and **nothing subtracts them from net worth** — no dashboard or accounts code injects
`LoansStore`. So gap #5 splits in two: the manual-asset half (house, car, quarterly brokerage figure —
a table and a form) is unbuilt, but the liability half is *built and unwired*. Netting loans in is a
small, honest correction; manual assets are the follow-up that makes the number comparable to
Monarch's.

### 4. Not installable, not offline

A local-first app that will not open without a network round-trip to Caddy is a contradiction the
first snapshot never named. There is no `manifest.webmanifest` and no service worker. Adding both is
the cheapest available progress against gap #8, costs nothing in privacy — caching your own app shell
sends no data anywhere — and turns "one browser profile" into "an icon on the phone that works on the
train". It does not solve sync and should not be sold as if it did.

### 5. Review inbox (gap #12)

TRF-06 proved the pattern: a count plus a warning badge on a collapsed trigger turned an invisible
queue into a visible one. The same shape applied to transactions — a `reviewed` flag and a "what
changed since your last import" panel — is the habit loop every subscription app leans on, and the
only version of gap #9 available without a server.

### 6. Standing, unchanged

Multi-currency (#11) — deepest in the field, and blocked at the type level rather than the UI level,
since `'EUR'` is a literal type on two entities and therefore a schema decision; investments (#6, out
of scope by product decision); bank sync (#7), collaboration (#10) and true sync (#8's other half),
all still needing either a server or a licensed intermediary and so still parked behind NFR-PRIV-1;
chart builder (#13); NL Q&A (#15). One small open item is worth finishing because it undercuts #14's
otherwise-good story: the [empty dashboard state](../dashboard/tickets/TICKET-STAT-22-empty-dashboard-state.md)
— a first-time visitor still lands on a dashboard of zeros after clicking through the landing page.

## The field, revisited — only what changed

- **Monarch.** Goals and recurring/bill calendar were two of the three things it had that we did not.
  Both are now built, and goals in a shape it does not offer. Budgets is the remaining table stake.
  Its structural advantages (feeds, mobile, collaboration) are unchanged and still ours to decline
  rather than to lose.
- **YNAB.** The lesson stands and is now the only lesson: when budgets get built, pick targets over
  envelopes. The safe-to-spend framing above is a third option YNAB would call heresy and Simplifi
  ships happily.
- **Actual Budget.** Still the closest cousin and still the reference design for E2E-encrypted sync.
  The gap narrowed in one direction they will not follow us in: their scheduled transactions are
  entered, ours are detected. Their envelope budgets and their sync remain ahead of us.
- **Firefly III.** Bills and piggy-bank goals are now matched in substance. Multi-currency, tags as a
  second axis, an audit log and a REST API remain theirs. Their community-contributed importer configs
  are still the model for crowdsourcing bank presets — more relevant now that IMP-01 has been v1.0's
  last open ticket for months.
- **Copilot Money.** Recurring detection now matched; on design the gap narrowed from "no contest" to
  "different bets" — ten themes and a UX pass scored against Nielsen's heuristics (21/40 at review
  time, 23 tickets built since, not yet re-scored) is a real investment.
- **PocketSmith.** Still the forecasting benchmark, and now the sharpest single comparison in this
  document: we have the events *and* the projection engine, and have not connected them (§2).
- **Lunch Money.** Unchanged, and still the multi-currency model to copy if #11 is ever built.
- **Briefly noted.** Simplifi's spending plan is now the recommended *shape* for our first budget, not
  merely an alternative (§1). Rocket Money's detection half is fully built here, including the
  price-increase flag it markets hardest. Tiller's audience is still courted by a clean export format —
  JSON only today; a CSV/XLSX flavour remains uncosted. The GnuCash-lineage argument is unchanged.

## Comparison table v2 (feature presence, not quality)

Money Mosaic column re-scored 2026-08-25; every other column carried forward unverified from the
2026-07-20 snapshot.

| | Money Mosaic | Monarch | YNAB | Actual | Firefly III | Copilot | PocketSmith | Lunch Money |
|---|---|---|---|---|---|---|---|---|
| Price | **free** | $99+/yr | ~$109/yr | free (self-host) | free (self-host) | ~$95/yr | $0–300/yr | ~$50–100/yr |
| No server/vendor holds data | **✅ (none at all)** | ❌ | ❌ | ✅ (own server, E2E) | ✅ (own server) | ❌ | ❌ | ❌ |
| Zero-install | **✅** | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ | ✅ |
| Works offline / installable | ❌ **new gap** | ✅ apps | ✅ apps | ✅ | ⚠️ | ✅ | ⚠️ | ❌ |
| EU/Belgian bank ingestion | **✅ CSV presets (2 of 5)** | ❌ | ⚠️ CSV converters | ⚠️ GoCardless bridge | ⚠️ importer configs | ❌ | ⚠️ feeds/CSV | ⚠️ Plaid EU |
| Automatic bank sync | ❌ (by design) | ✅ | ✅ | ⚠️ opt-in bridge | ⚠️ opt-in importer | ✅ | ✅ | ✅ |
| Budgets | ❌ **gap #1** | ✅ targets | ✅ envelopes | ✅ envelopes | ✅ | ✅ | ✅ | ✅ |
| Goals | **✅ ordered, sequentially funded** | ✅ | ✅ | ✅ templates | ✅ piggy banks | ✅ | ✅ | ⚠️ |
| Recurring/bill calendar | **✅ detected, no data entry** | ✅ | ⚠️ scheduled | ✅ scheduled | ✅ bills | ✅ | ✅ core | ✅ |
| Cash-flow forecasting | ⚠️ **net worth only** | ⚠️ Plus tier | ❌ | ⚠️ upcoming | ⚠️ | ❌ | ✅ **best** | ❌ |
| Scenario planning | ⚠️ loans only | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| Learning categoriser | **✅ local ML** | ✅ cloud | ❌ | ❌ | ❌ | ✅ cloud | ⚠️ | ❌ |
| User-visible rules engine | **✅** | ✅ | ❌ | ✅ | ✅ **best** | ❌ | ✅ | ⚠️ |
| Transfer auto-detection | **✅ IBAN tiers + visible review** | ⚠️ | ⚠️ | ⚠️ | ⚠️ config | ⚠️ | ⚠️ | ⚠️ |
| Joint-account contribution math | **✅ unique** | ❌ (shared view) | ❌ | ❌ | ⚠️ multi-user | ❌ | ❌ | ❌ |
| Loan payoff vs. schedule | **✅ + what-ifs** | ⚠️ balance only | ⚠️ | ⚠️ | ✅ liabilities | ⚠️ | ⚠️ | ⚠️ |
| Income trend analysis | **✅ dedicated** | ⚠️ | ❌ | ❌ | ⚠️ reports | ⚠️ | ⚠️ | ⚠️ |
| Flow/cycle visualisation | **✅ Sankey, treemap, heatmap** | ⚠️ | ❌ | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ |
| Net worth beyond bank accounts | ❌ gap #5 (loans built, unwired) | ✅ | ⚠️ | ❌ | ✅ | ✅ | ✅ | ⚠️ |
| Multi-currency | ❌ gap #11 | ⚠️ | ❌ | ⚠️ | ✅ | ⚠️ | ✅ | ✅ **best** |
| Multi-device / mobile | ❌ gap #8 | ✅ | ✅ | ✅ | ✅ | ⚠️ Apple only | ✅ | ⚠️ web only |
| Review queue / inbox | ⚠️ transfers only | ✅ | ⚠️ | ⚠️ | ⚠️ | ✅ | ⚠️ | ✅ |
| Investment tracking | ❌ out of scope | ✅ | ⚠️ | ❌ | ⚠️ | ✅ | ✅ | ⚠️ crypto |

Reading the table now: the two rows that were "❌ for us, ✅ for everyone" in July are down to one
(budgets). The four differentiators of the first snapshot have become six, and two of the new ones —
detected-not-entered recurring, sequentially funded goals — are not presence-parity but mechanisms no
peer uses. The rows we lose on are, without exception, either a server problem or a decision the
product has already made.

## Suggested priority if any of this graduates to a milestone

1. **Wire the bill calendar into a balance projection** (#4's remaining half) — both halves exist,
   REC-03 was designed for it, and it answers the one question a person actually asks their finance
   app mid-month. Smallest build, largest jump in the table.
2. **Budgets, as one number first** (#1) — safe-to-spend from measured income, detected recurring cost
   and a saving target; category targets after; envelopes never. The last universal peer feature.
3. **Net worth that includes what you owe and own** (#5) — net the existing `loans` into `netWorth`
   (small, and arguably a correctness fix rather than a feature), then a manual assets table.
4. **PWA/offline pass** (#8, partial) — manifest + service worker; makes the local-first claim
   literally true and costs nothing in privacy. Don't let it be mistaken for sync.
5. **Review inbox** (#12/#9) — a `reviewed` flag and a "what changed since last import" panel,
   following TRF-06's proven visible-count pattern.

Below the line, unchanged from the first snapshot: bank feeds (#7), true multi-device sync (#8's other
half, with Actual's E2E relay as the reference design), collaboration (#10), multi-currency (#11),
investments (#6), chart builder (#13), NL Q&A (#15). Everything there needs either a server or a
decision the product has deliberately already made — see
[../v1.4_data_management/overview.md](../releases/v1.4_data_management/overview.md) "Considered, not ticketed
yet" for the same conclusion reached from the backup angle.

## For the third snapshot

Two method notes, so the next pass is cheaper and more honest:

- **Re-verify the peer column.** This snapshot deliberately did not. Pricing and tiers move; Monarch's
  Plus-tier forecasting and any AI features in particular are worth a fresh look.
- **Score the closes, not just the opens.** Gaps #2 and #3 closed in five weeks because they were
  inferable from data already held. That is the pattern to look for when ranking what is left: of the
  standing gaps, #4's remaining half and #5's liability half are the two that need no new user input
  at all.
