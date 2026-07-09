# Money Mosaic — v1.3 Tickets

Tickets for the **dashboard insights** user stories in [../user-stories.md](../user-stories.md). Each ticket carries a description, current situation (as-is), desired result (to-be), and detailed acceptance criteria. FR IDs trace back to [../../v1.0_foundation/finance-app-spec.md](../../v1.0_foundation/finance-app-spec.md); these tickets *add* new FR-STAT entries (8–13) rather than changing existing ones.

All six are independent of each other — each is a standalone pure aggregate in `core/stats` plus a small dashboard component/callout, and none depends on another ticket's output. They can ship in any order or in parallel. Suggested order below is purely about value/effort, not dependencies.

| Ticket | Area | Title | Source story |
|---|---|---|---|
| [STAT-04](./TICKET-STAT-04-category-period-comparison.md) | Statistics & Dashboard | Top-5 category period-over-period comparison | user-stories §6, adds FR-STAT-8 |
| [STAT-05](./TICKET-STAT-05-average-spending-rate.md) | Statistics & Dashboard | Average spending rate (per day/week/month) | user-stories §6, adds FR-STAT-9 |
| [STAT-06](./TICKET-STAT-06-weekday-weekend-split.md) | Statistics & Dashboard | Weekday vs. weekend spending split | user-stories §6, adds FR-STAT-10 |
| [STAT-07](./TICKET-STAT-07-year-over-year-comparison.md) | Statistics & Dashboard | Year-over-year comparison | user-stories §6, adds FR-STAT-11 |
| [STAT-08](./TICKET-STAT-08-biggest-transactions.md) | Statistics & Dashboard | Biggest individual transactions | user-stories §6, adds FR-STAT-12 |
| [STAT-09](./TICKET-STAT-09-uncategorised-spend-visibility.md) | Statistics & Dashboard | Uncategorised spend visibility | user-stories §6, adds FR-STAT-13 |

## Suggested build order (value/effort, not a dependency chain)

1. **STAT-09** (uncategorised spend visibility) — smallest possible ticket, no new pure function, reuses an existing aggregate's already-computed uncategorised entry.
2. **STAT-05** (average spending rate) + **STAT-06** (weekday/weekend split) — both small, self-contained pure helpers reusing existing bucket/exclusion logic; natural to build back-to-back since they render side-by-side as "rate" cards.
3. **STAT-08** (biggest transactions) — small helper, but check `feature-transactions`' existing filter/query-param support before wiring the drill-down link (see its acceptance criteria).
4. **STAT-07** (year-over-year comparison) — moderate: needs the leap-year-clamped date shift and the "stop before earliest transaction" guard.
5. **STAT-04** (category period comparison) — the largest ticket: a new period-window helper with a non-trivial anchor rule, plus an aggregate that calls `computeCategoryBreakdown()` per window period. Build last so the simpler tickets validate the reuse patterns (shared exclusion predicates, drill-down params, bucket helpers) first.

## Definition of Done (applies to every ticket)

Per [../../../CLAUDE.md](../../../CLAUDE.md): `ng lint` + `ng test` + `ng build --configuration development` all pass, plus a live browser check for any UI-visible change. No Dexie schema changes are needed by any ticket in this set (all derive from existing `Transaction`/`Category`/`Account` data). The production bundle budget in `angular.json` is never raised. Components/stores never touch `appDb` tables directly. Every new aggregate reuses the existing transfer/savings-movement exclusion predicates (`transferId` check + `isSavingsMovement`) rather than re-implementing them — this is checked explicitly in each ticket's acceptance criteria to avoid the six tickets drifting into six slightly-different definitions of "expense."
