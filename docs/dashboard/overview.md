# Dashboard — ticket index

Every ticket for this area, whichever release shipped it. This file is an **index**: the build order, dependency notes and scope decisions for a given release live in that release's own overview under [docs/releases/](../releases/), linked from each ticket's **Released in** line.

**47 tickets** — 43 done, 3 open, 1 won't do.

- [x] [TICKET-STAT-01](./tickets/TICKET-STAT-01-custom-range-enable.md) — ~~Enable custom range when "Custom" preset is selected (bug)~~ · _v1.0 Foundation_
- [x] [TICKET-STAT-02](./tickets/TICKET-STAT-02-per-account-networth.md) — Account balance-history charts (detail + overview) · _v1.0 Foundation_
- [x] [TICKET-STAT-03](./tickets/TICKET-STAT-03-expanded-range-presets-default-grouping.md) — Expanded date-range presets with linked default grouping · _v1.0 Foundation_
- [x] [TICKET-STAT-04](./tickets/TICKET-STAT-04-category-period-comparison.md) — Top-5 category period-over-period comparison · _v1.3 Dashboard insights_
- [x] [TICKET-STAT-05](./tickets/TICKET-STAT-05-average-spending-rate.md) — Average spending rate (per day/week/month) · _v1.3 Dashboard insights_
- [x] [TICKET-STAT-06](./tickets/TICKET-STAT-06-weekday-weekend-split.md) — Weekday vs. weekend spending split · _v1.3 Dashboard insights_
- [x] [TICKET-STAT-07](./tickets/TICKET-STAT-07-year-over-year-comparison.md) — Year-over-year comparison · _v1.3 Dashboard insights_
- [x] [TICKET-STAT-08](./tickets/TICKET-STAT-08-biggest-transactions.md) — Biggest individual transactions · _v1.3 Dashboard insights_
- [x] [TICKET-STAT-09](./tickets/TICKET-STAT-09-uncategorised-spend-visibility.md) — Uncategorised spend visibility · _v1.3 Dashboard insights_
- [x] [TICKET-STAT-10](./tickets/TICKET-STAT-10-unified-date-range-picker.md) — Unified from/to date-range field · _v1.1 Joint accounts_
- [x] [TICKET-STAT-11](./tickets/TICKET-STAT-11-signed-category-breakdown-netting.md) — Category-kind-driven netting for income/expense totals and breakdown · _v1.3 Dashboard insights_
- [x] [TICKET-STAT-12](./tickets/TICKET-STAT-12-chart-tooltip-decimal-rounding.md) — Round chart tooltip values to 2 decimal places · _v1.3 Dashboard insights_
- [x] [TICKET-STAT-13](./tickets/TICKET-STAT-13-side-by-side-breakdown-expand.md) — Side-by-side income/expense breakdown with expandable category list · _v1.3 Dashboard insights_
- [ ] [TICKET-STAT-14](./tickets/TICKET-STAT-14-customizable-dashboard-layout.md) — Customizable dashboard layout (reorder, hide/unhide rows) · _v1.3 Dashboard insights_
- [x] [TICKET-STAT-15](./tickets/TICKET-STAT-15-independent-trend-chart-bucket-controls.md) — Independent bucket controls per trend graph · _v1.3 Dashboard insights_
- [x] [TICKET-STAT-16](./tickets/TICKET-STAT-16-date-range-prev-next-navigation.md) — Previous/next navigation buttons on the global date-range picker · _v1.3 Dashboard insights_
- [x] [TICKET-STAT-17](./tickets/TICKET-STAT-17-split-trend-chart-income-expense.md) — Split trend chart into income/expense stacked-by-category bar charts · _v1.3 Dashboard insights_
- [x] [TICKET-STAT-18](./tickets/TICKET-STAT-18-nullified-savings-exclusion.md) — Exclude nullified transactions from `savings`/`savingsRate` · _v1.3 Code review (CR3)_
- [x] [TICKET-STAT-19](./tickets/TICKET-STAT-19-comparison-bar-tooltip-date-range.md) — Show period date range in category comparison bar tooltips · _v1.3 Dashboard insights_
- [ ] [TICKET-STAT-20](./tickets/TICKET-STAT-20-trend-chart-accessible-numbers.md) — Expose the trend chart's key numbers as DOM text · _v1.3 Code review (CR3)_
- [x] [TICKET-STAT-21](./tickets/TICKET-STAT-21-periodized-headline-sublabels.md) — Periodized sub-labels for Income/Expense/Savings/Cash-flow, retiring the Spending rate card · _v1.3 Dashboard insights_
- [ ] [TICKET-STAT-22](./tickets/TICKET-STAT-22-empty-dashboard-state.md) — Empty dashboard state directing to Import · _v2_
- [x] [TICKET-STAT-23](./tickets/TICKET-STAT-23-comparison-panel-vm-and-card.md) — Finish the comparison panel's VM and extract the category card · _v2 Code review (CR4)_
- [x] [TICKET-STAT-24](./tickets/TICKET-STAT-24-classify-for-stats-decision-table.md) — Decision-table spec for `classifyForStats` · _v2 Code review (CR4)_
- [x] [TICKET-STAT-25](./tickets/TICKET-STAT-25-dashboard-page-header.md) — Dashboard header: a named "Dashboard settings" button, its own date range, net worth stays · _v1.6.2 Interface polish_
- [x] [TICKET-STAT-26](./tickets/TICKET-STAT-26-chart-legends-outside-plot.md) — Chart legends get their own strip instead of floating over the plot · _v1.6.2 Interface polish_
- [x] [TICKET-STAT-27](./tickets/TICKET-STAT-27-session-persistent-chart-options.md) — A chart's options survive the session: changing the bucket no longer clears your series filter · _v1.6.2 Interface polish_
- [x] [TICKET-STAT-28](./tickets/TICKET-STAT-28-net-worth-stat-card.md) — Net worth becomes a stat card on the Dashboard itself · _v1.6.2 Interface polish_
- [x] [TICKET-STAT-29](./tickets/TICKET-STAT-29-spending-heatmap-panel.md) — Spending heatmap: top categories × day of week · _v2.1 Extra graphs_
- [x] [TICKET-STAT-30](./tickets/TICKET-STAT-30-heatmap-cycle-switcher.md) — Switch the heatmap between day of week, day of month, month and quarter · _v2.1 Extra graphs_
- [x] [TICKET-STAT-31](./tickets/TICKET-STAT-31-heatmap-cycles-fit-the-range.md) — Only offer heatmap cycles the selected range can actually fill · _v2.1 Extra graphs_
- [x] [TICKET-STAT-32](./tickets/TICKET-STAT-32-heatmap-exclude-categories.md) — Exclude categories from the spending heatmap · _v2.1 Extra graphs_
- [x] [TICKET-STAT-33](./tickets/TICKET-STAT-33-heatmap-all-row.md) — An "All" row at the top of the spending heatmap · _v2.1 Extra graphs_
- [x] [TICKET-STAT-34](./tickets/TICKET-STAT-34-heatmap-per-category-colour-scales.md) — Each heatmap row shaded in its own category colour, readable in light and dark · _v2.1 Extra graphs_
- [x] [TICKET-STAT-35](./tickets/TICKET-STAT-35-relative-range-expressions.md) — Relative range expressions: parse, resolve and re-serialise `now-30d`, `now/M` · _v1.8 Extended date-range picker_
- [x] [TICKET-STAT-36](./tickets/TICKET-STAT-36-expression-backed-range-state.md) — `RangeStore` holds expressions and re-resolves them on read, URL included · _v1.8 Extended date-range picker_
- [x] [TICKET-STAT-37](./tickets/TICKET-STAT-37-quick-range-catalogue.md) — The quick-range catalogue: 21 grouped ranges, expressed as expression pairs · _v1.8 Extended date-range picker_
- [x] [TICKET-STAT-38](./tickets/TICKET-STAT-38-two-panel-range-picker.md) — The two-panel range picker: trigger, searchable quick ranges, prev/next preserved · _v1.8 Extended date-range picker_
- [x] [TICKET-STAT-39](./tickets/TICKET-STAT-39-absolute-panel-apply-staging.md) — The absolute panel: typed expressions, a calendar that doesn't clobber the text, Apply-staged edits · _v1.8 Extended date-range picker_
- [x] [TICKET-STAT-40](./tickets/TICKET-STAT-40-recently-used-ranges.md) — Recently used ranges, persisted and global · _v1.8 Extended date-range picker_
- [x] [TICKET-STAT-41](./tickets/TICKET-STAT-41-standalone-picker-year-navigation.md) — Quick year navigation on the standalone date-range calendar · _v1.8 Extended date-range picker_
- [x] [TICKET-STAT-42](./tickets/TICKET-STAT-42-name-the-savings-measures.md) — Name what each savings measure actually counts · _v2.3 UX review_
- [x] [TICKET-STAT-43](./tickets/TICKET-STAT-43-heatmap-per-row-scales.md) — Heatmap shades each row on its own scale, so cells can't be compared · _v2.3 UX review_
- [x] [TICKET-STAT-44](./tickets/TICKET-STAT-44-donut-for-a-single-category.md) — Category breakdown draws a donut for a single 100% category · _v2.3 UX review_
- [x] [TICKET-STAT-45](./tickets/TICKET-STAT-45-heatmap-one-hue-ramp.md) — The heatmap's six category hues make the grid unreadable · _v2.3 UX review_
- [x] [TICKET-STAT-46](./tickets/TICKET-STAT-46-contribution-net-worth.md) — Contribution-based net worth for joint accounts · _v1.1 Joint accounts_
- [x] [TICKET-STAT-47](./tickets/TICKET-STAT-47-shared-stats-classifier.md) — Extract the shared per-transaction stats classifier · _v1.3 Code review (CR3)_
