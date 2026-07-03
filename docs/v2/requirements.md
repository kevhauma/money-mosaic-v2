# Money Mosaic — v2+ Backlog

Split out of [../v1/user-stories.md](../v1/user-stories.md): the Data Management and Cross-cutting polish checklists (originally §7/§8 there) plus the v1.5/v2/v3 roadmap recap. These are not part of the v1 build — they're parked here until v1 ships.

## Data Management (FR-DAT)

- [ ] As a privacy-conscious user, I want to export all my data to a single JSON file, so I have a portable backup that never touches a server (FR-DAT-1)
- [ ] As a user, I want to import a JSON backup with a clear replace-vs-merge choice, so I can restore or migrate devices safely (FR-DAT-2)
- [ ] As a user, I want a "delete all data" action with confirmation, so I can start fresh without digging through dev tools (FR-DAT-3)
- [ ] As a user, I want the app to request persistent storage, so the browser doesn't silently evict my financial data (FR-DAT-4)
- [ ] As a developer, I want every export to record its schema version and the IndexedDB schema to support forward migrations, so old backups keep working after upgrades (NFR-STORE-1)

## Cross-cutting polish

- [ ] As a user, I want the app fully keyboard-navigable, screen-reader-labelled, and WCAG AA compliant, so it's usable by everyone (NFR-A11Y-1)
- [ ] As a user, I want the layout responsive from mobile to desktop, so I can check my finances from any device (NFR-RESP-1)
- [ ] As a privacy-conscious user, I want confirmation that no financial data is ever transmitted over the network and no third-party analytics run on financial content, so "local-first" is actually true, not just marketed (NFR-PRIV-1)
- [ ] As a user, I want the app to stay smooth with 10k+ transactions, so performance doesn't degrade as my history grows (NFR-PERF-1)

## Later phases (parked, not part of v1)

**v1.5 — Refinements:** account manager (colour/order/rename), joint-account splitting (configurable share, own-account deposits excluded), category manager with per-category rule sets, loading/calculating-state animations.

**v2 — Depth:** subscription/recurring detection, split transactions, category groups/hierarchy, budgets, custom date ranges, multi-currency, CODA import.

**v3 — Investing & intelligence:** real portfolio tracking (holdings/price feed/valuation/returns), forecasting/insights, optional encrypted sync.
