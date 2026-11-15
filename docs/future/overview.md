# Future (goals & forecast) — ticket index

Every ticket for this area, whichever release shipped it. This file is an **index**: the build order, dependency notes and scope decisions for a given release live in that release's own overview under [docs/releases/](../releases/), linked from each ticket's **Released in** line.

**12 tickets** — 9 done, 3 open.

- [x] [TICKET-FUT-01](./tickets/TICKET-FUT-01-saving-velocity-aggregate.md) — Saving velocity: how much I actually saved per month, over a configurable lookback · _v2.2 Goals & forecast_
- [x] [TICKET-FUT-02](./tickets/TICKET-FUT-02-goals-persistence.md) — Goals persistence: a `savingsGoals` table, its repository and store · _v2.2 Goals & forecast_
- [x] [TICKET-FUT-03](./tickets/TICKET-FUT-03-future-page-scaffold.md) — Future page: route, shell, nav item, no date range · _v2.2 Goals & forecast_
- [x] [TICKET-FUT-04](./tickets/TICKET-FUT-04-goals-list-crud-reorder.md) — Goals list: add what I want to buy, edit it, delete it, drag it into priority order · _v2.2 Goals & forecast_
- [x] [TICKET-FUT-05](./tickets/TICKET-FUT-05-goal-affordability-projection.md) — When can I afford it: an ETA per goal, funded in the order I set · _v2.2 Goals & forecast_
- [x] [TICKET-FUT-06](./tickets/TICKET-FUT-06-forecast-controls.md) — Forecast controls: how far back to look, what counts as saving, what to keep aside · _v2.2 Goals & forecast_
- [x] [TICKET-FUT-07](./tickets/TICKET-FUT-07-projected-net-worth-chart.md) — Projected net worth: what my balance looks like as each goal gets bought · _v2.2 Goals & forecast_
- [x] [TICKET-FUT-08](./tickets/TICKET-FUT-08-account-scope.md) — Only count these accounts: scope the forecast to the money I'd actually spend · _v2.2 Goals & forecast_
- [x] [TICKET-FUT-09](./tickets/TICKET-FUT-09-required-saving-rate-mode.md) — What do I need to save: hit a goal by a date I choose · _v2.2 Goals & forecast_
- [ ] [TICKET-FUT-10](./tickets/TICKET-FUT-10-required-rate-horizon-covers-goals.md) — The required-saving chart reaches every goal (bug fix, FR-FUT-6 — the horizon comes from measured-rate ETAs only, so later-dated goals fall off) — independent · _unreleased_
- [ ] [TICKET-FUT-11](./tickets/TICKET-FUT-11-goal-eta-required-rate-same-grid.md) — Goal ETA and required saving use one month grid (bug fix, FR-FUT-4 / FR-FUT-6 — the required rate counts the current month-end, the ETA starts at next month's) — after TICKET-SOLID-10 · _unreleased_
- [ ] [TICKET-FUT-12](./tickets/TICKET-FUT-12-future-page-waits-for-data.md) — The future page waits for its data (bug fix, FR-FUT-3 — no hydration gate, so controls save default-built settings and a failed load shows an endless skeleton) — independent · _unreleased_
