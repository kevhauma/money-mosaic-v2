# Dependency graph reference

Full import graph of `src/app`, generated with `dependency-cruiser`, for Claude to consult
when tracing what imports what without re-grepping the tree by hand.

## Scope

Unlike the human-facing overview in [`reports/dependency-graph.html`](../reports/dependency-graph.html)
(which collapses each `feature-*` folder to a single node and stops one folder into
`core`/`shared`), this graph goes three folder levels deeper on both tiers — up to 4 folders
below `src/app` — which is enough to reach individual files in most feature/core/shared
subtrees.

<!-- GENERATED:STATS:START -->
- 488 leaf nodes, 1555 edges.
<!-- GENERATED:STATS:END -->

- `*.spec.ts` and `node_modules` are excluded.
- Node IDs are dependency-cruiser's internal short hashes (`4`, `2K`, `6N`, ...) — read them
  via the `subgraph`/node label text, not the ID itself.
- An edge collapsed at a folder boundary (rare here, since most subtrees fit within 4 levels)
  means _something_ inside that folder imports the target, not necessarily its `index.ts`.

## Regenerate

```bash
depcruise src/app \
  --config .dependency-cruiser.cjs \
  --collapse '^src/app/(?:core|shared)/[^/]+/[^/]+/[^/]+/[^/]+|^src/app/(?:core|shared)/[^/]+/[^/]+/[^/]+|^src/app/(?:core|shared)/[^/]+/[^/]+|^src/app/(?:core|shared)/[^/]+|^src/app/[^/]+/[^/]+/[^/]+/[^/]+|^src/app/[^/]+/[^/]+/[^/]+|^src/app/[^/]+/[^/]+|^src/app/[^/]+' \
  --output-type mermaid \
  --output-to reports/dependency-graph-deep.mmd
```

## Graph

```mermaid
flowchart LR

subgraph 0["src"]
subgraph 1["app"]
subgraph 2["core"]
subgraph 3["accounts"]
4["account-deletion.service.ts"]
5["index.ts"]
6["joint-owner-lookup.ts"]
end
subgraph 7["auth"]
8["admin-users-api.service.ts"]
9["admin.guard.ts"]
A["auth-api.service.ts"]
B["auth-endpoints.ts"]
C["auth-errors.ts"]
D["auth.guard.ts"]
E["auth.interceptor.ts"]
F["index.ts"]
G["public-user.ts"]
H["session.store.ts"]
end
subgraph I["categorisation"]
J["category-applicability.ts"]
K["co-owner-contribution.service.ts"]
L["co-owner-contribution.ts"]
M["index.ts"]
N["rule-matching.ts"]
O["rules-engine.service.ts"]
end
subgraph P["data-access"]
Q["accounts.repository.ts"]
R["api-client.testing.ts"]
S["api-client.ts"]
T["app-settings.repository.ts"]
U["binary-artifact.ts"]
V["categories.repository.ts"]
W["category-comparison-settings.repository.ts"]
X["category-model.repository.ts"]
Y["dashboard-layout-settings.repository.ts"]
Z["data-management.repository.ts"]
10["entities.ts"]
11["fake-api.testing.ts"]
12["forecast-settings.repository.ts"]
13["goals.repository.ts"]
14["import-batches.repository.ts"]
15["index.ts"]
16["loans.repository.ts"]
17["mapping-profiles.repository.ts"]
18["recurring-overrides.repository.ts"]
19["rules.repository.ts"]
1A["salary-metadata.repository.ts"]
1B["seed-data.ts"]
1C["transactions.repository.ts"]
1D["transfer-settings.repository.ts"]
1E["transfers.repository.ts"]
1F["ui-preferences.repository.ts"]
end
subgraph 1G["import"]
1H["account-detection.ts"]
1I["column-guess.ts"]
1J["csv-import.service.ts"]
1K["csv-parse.ts"]
1L["csv-parse.worker.ts"]
1M["csv-row-mapper.ts"]
1N["csv-worker.types.ts"]
1O["import.service.ts"]
1P["index.ts"]
1Q["reading-guess.ts"]
end
subgraph 1R["layout"]
subgraph 1S["app-shell"]
1T["app-shell.component.ts"]
end
1U["app-title.strategy.ts"]
subgraph 1V["backup-reminder"]
1W["backup-reminder.component.ts"]
end
subgraph 1X["default-password-notice"]
1Y["default-password-notice.component.ts"]
end
1Z["index.ts"]
end
subgraph 20["links"]
21["external-links.ts"]
22["index.ts"]
end
subgraph 23["loans"]
24["amortization.ts"]
25["index.ts"]
26["loan-progress.ts"]
27["what-if.ts"]
end
subgraph 28["ml"]
29["category-model.worker.ts"]
2A["category-model.worker.types.ts"]
2B["feature-hashing.ts"]
2C["index.ts"]
2D["model-config.ts"]
2E["rule-proposal-mining.ts"]
2F["training-window.ts"]
end
subgraph 2G["onboarding"]
2H["backup-reminder.service.ts"]
2I["home-redirect.guard.ts"]
2J["index.ts"]
2K["mark-visited.guard.ts"]
2L["visited.service.ts"]
end
subgraph 2M["qr-sync"]
2N["index.ts"]
2O["qr-camera-scanner.ts"]
2P["qr-code-renderer.ts"]
2Q["qr-frames.ts"]
2R["qr-payload-codec.ts"]
2S["qr-sync.service.ts"]
2T["qr-transfer-payload.ts"]
end
subgraph 2U["server-status"]
2V["index.ts"]
2W["server-status.interceptor.ts"]
2X["server-status.service.ts"]
subgraph 2Y["server-unreachable"]
2Z["server-unreachable.component.ts"]
end
30["transport-failure.ts"]
end
subgraph 31["state"]
32["accounts.store.ts"]
33["app-settings.store.ts"]
34["categories.store.ts"]
35["chart-options-control.ts"]
36["chart-options.store.ts"]
37["forecast-settings.store.ts"]
38["goals.store.ts"]
39["import-batches.store.ts"]
3A["index.ts"]
3B["page-range-control.ts"]
3C["range-state.store.ts"]
3D["transactions.store.ts"]
3E["transfer-settings.store.ts"]
3F["transfers.store.ts"]
end
subgraph 3G["stats"]
3H["account-balance-history.ts"]
3I["account-balance-trend.ts"]
3J["annual-lump-sum-smoothing.ts"]
3K["category-breakdown.ts"]
3L["category-composition-trend.ts"]
3M["category-cycle-heatmap.ts"]
3N["category-expense-transactions.ts"]
3O["category-kind-contribution.ts"]
3P["category-period-comparison.ts"]
3Q["chart-zoom-window.ts"]
3R["classify-for-stats.ts"]
3S["classify-joint-leg.ts"]
3T["day-transactions.ts"]
3U["embedded-bonus-smoothing.ts"]
3V["full-history-range.ts"]
3W["goal-affordability.ts"]
3X["granularity-for-span.ts"]
3Y["gross-net-growth.ts"]
3Z["gross-net-ratio.ts"]
40["income-category-series.ts"]
41["income-events.ts"]
42["income-gap-detection.ts"]
43["income-growth.ts"]
44["income-step-change-detection.ts"]
45["index.ts"]
46["joint-account-stake.ts"]
47["joint-contributor-breakdown.ts"]
48["money-flow-graph.ts"]
49["multi-year-income-comparison.ts"]
4A["net-margin.ts"]
4B["net-worth-projection.ts"]
4C["period-stats.ts"]
4D["period-window.ts"]
4E["periodized-rate.ts"]
4F["recurring-payments.ts"]
4G["recurring-projection.ts"]
4H["required-saving-rate.ts"]
4I["saving-velocity.ts"]
4J["spending-mosaic.ts"]
4K["top-transactions.ts"]
4L["transfer-flows.ts"]
4M["wage-change-detection.ts"]
4N["weekday-weekend-split.ts"]
4O["year-over-year.ts"]
4P["yearly-income-summary.ts"]
end
subgraph 4Q["store-reset"]
4R["index.ts"]
4S["store-reset.service.ts"]
4T["with-hydration.ts"]
end
subgraph 4U["theme"]
4V["accent-colors.ts"]
4W["index.ts"]
4X["theme-styles.ts"]
4Y["theme.service.ts"]
end
subgraph 4Z["transactions"]
50["attribution-override.ts"]
51["index.ts"]
52["nullify-transaction.ts"]
53["transaction-deletion.service.ts"]
end
subgraph 54["transfers"]
55["index.ts"]
56["transfer-cleanup-result.ts"]
57["transfer-counterpart.ts"]
58["transfer-linking.service.ts"]
59["transfer-matching.service.ts"]
5A["transfer-matching.ts"]
end
subgraph 5B["ui-preferences"]
5C["index.ts"]
5D["ui-preferences.service.ts"]
5E["ui-preferences.testing.ts"]
end
end
subgraph 5F["feature-accounts"]
5G["account-card-vm.ts"]
5H["account-icons.ts"]
5I["account-list-order.ts"]
5J["account-types.ts"]
5K["accounts.routes.ts"]
5L["balance-day-tooltip.ts"]
5M["balance-trend-signals.ts"]
subgraph 5N["components"]
subgraph 5O["account-balance-block"]
5P["account-balance-block.component.ts"]
end
subgraph 5Q["account-balance-chart"]
5R["account-balance-chart.component.ts"]
end
subgraph 5S["account-balance-history-chart"]
5T["account-balance-history-chart.component.ts"]
end
subgraph 5U["account-card"]
5V["account-card.component.ts"]
end
subgraph 5W["account-form"]
5X["account-form.component.ts"]
end
subgraph 5Y["account-insights"]
5Z["account-insights.component.ts"]
end
subgraph 60["accounts-detail"]
61["accounts-detail.component.ts"]
end
subgraph 62["accounts-overview"]
63["accounts-overview.component.ts"]
end
64["index.ts"]
end
65["index.ts"]
66["last-import-status.ts"]
end
subgraph 67["feature-auth"]
68["admin-user-row.ts"]
69["admin-users.store.ts"]
6A["admin.routes.ts"]
6B["auth.routes.ts"]
subgraph 6C["components"]
subgraph 6D["admin-create-account-dialog"]
6E["admin-create-account-dialog.component.ts"]
end
subgraph 6F["admin-reset-password-dialog"]
6G["admin-reset-password-dialog.component.ts"]
end
subgraph 6H["admin-user-actions"]
6I["admin-user-actions.component.ts"]
end
subgraph 6J["admin-users-page"]
6K["admin-users-page.component.ts"]
end
6L["index.ts"]
subgraph 6M["login-page"]
6N["login-page.component.ts"]
end
end
6O["index.ts"]
end
subgraph 6P["feature-categories"]
6Q["categories.routes.ts"]
6R["category-icons.ts"]
6S["category-model.service.ts"]
6T["category-model.store.ts"]
6U["category-row-vm.ts"]
subgraph 6V["components"]
subgraph 6W["categories-overview"]
6X["categories-overview.component.ts"]
end
subgraph 6Y["category-form"]
6Z["category-form.component.ts"]
end
70["index.ts"]
subgraph 71["rule-condition-row"]
72["rule-condition-row.component.ts"]
end
subgraph 73["rule-filters"]
74["rule-filters.component.ts"]
end
subgraph 75["rule-form"]
76["rule-form.component.ts"]
end
subgraph 77["rule-share-bar"]
78["rule-share-bar.component.ts"]
end
subgraph 79["rules-overview"]
7A["rules-overview.component.ts"]
end
end
7B["index.ts"]
7C["rule-condition-editor.ts"]
7D["rule-filters.ts"]
7E["rule-labels.ts"]
7F["rule-share.ts"]
7G["rule-summary.ts"]
7H["rules.store.ts"]
end
subgraph 7I["feature-changelog"]
7J["changelog.routes.ts"]
subgraph 7K["components"]
subgraph 7L["changelog-entry-row"]
7M["changelog-entry-row.component.ts"]
end
subgraph 7N["changelog-page"]
7O["changelog-page.component.ts"]
end
7P["index.ts"]
end
subgraph 7Q["data"]
7R["changelog-entries.ts"]
7S["roadmap-entries.ts"]
end
7T["group-changelog-entries.ts"]
7U["group-roadmap-entries.ts"]
7V["index.ts"]
end
subgraph 7W["feature-dashboard"]
7X["category-comparison-settings.store.ts"]
7Y["category-comparison-vm.ts"]
subgraph 7Z["components"]
subgraph 80["account-balance-strip"]
81["account-balance-strip.component.ts"]
end
subgraph 82["action-queue-panel"]
83["action-queue-panel.component.ts"]
end
subgraph 84["category-breakdown-panel"]
85["category-breakdown-panel.component.ts"]
end
subgraph 86["category-comparison-panel"]
87["category-comparison-panel.component.ts"]
end
subgraph 88["category-exclusion-dropdown"]
89["category-exclusion-dropdown.component.ts"]
end
subgraph 8A["comparison-category-card"]
8B["comparison-category-card.component.ts"]
end
subgraph 8C["dashboard-customize-panel"]
8D["dashboard-customize-panel.component.ts"]
end
subgraph 8E["dashboard-overview"]
8F["dashboard-overview.component.ts"]
end
8G["index.ts"]
subgraph 8H["spending-heatmap-panel"]
8I["spending-heatmap-panel.component.ts"]
end
subgraph 8J["top-transactions-panel"]
8K["top-transactions-panel.component.ts"]
end
subgraph 8L["trend-chart-panel"]
8M["trend-chart-panel.component.ts"]
end
subgraph 8N["weekday-weekend-split-panel"]
8O["weekday-weekend-split-panel.component.ts"]
end
end
8P["dashboard-layout-settings.store.ts"]
8Q["dashboard-row-order.ts"]
8R["dashboard.routes.ts"]
8S["index.ts"]
8T["stats-scope.ts"]
8U["stats.store.ts"]
8V["transfer-categories.ts"]
end
subgraph 8W["feature-data-management"]
subgraph 8X["components"]
subgraph 8Y["data-management-overview"]
8Z["data-management-overview.component.ts"]
end
90["index.ts"]
subgraph 91["qr-receive-dialog"]
92["qr-receive-dialog.component.ts"]
end
subgraph 93["qr-send-dialog"]
94["qr-send-dialog.component.ts"]
end
end
95["index.ts"]
end
subgraph 96["feature-explore"]
subgraph 97["components"]
subgraph 98["explore-overview"]
99["explore-overview.component.ts"]
end
9A["index.ts"]
subgraph 9B["money-flow-panel"]
9C["money-flow-panel.component.ts"]
end
subgraph 9D["spending-mosaic-panel"]
9E["spending-mosaic-panel.component.ts"]
end
end
9F["explore.routes.ts"]
9G["index.ts"]
end
subgraph 9H["feature-future"]
subgraph 9I["components"]
subgraph 9J["forecast-controls"]
9K["forecast-controls.component.ts"]
end
subgraph 9L["forecast-notice"]
9M["forecast-notice.component.ts"]
end
subgraph 9N["future-overview"]
9O["future-overview.component.ts"]
end
subgraph 9P["goal-form"]
9Q["goal-form.component.ts"]
end
subgraph 9R["goal-row"]
9S["goal-row.component.ts"]
end
subgraph 9T["goals-panel"]
9U["goals-panel.component.ts"]
end
9V["index.ts"]
subgraph 9W["net-worth-projection-chart"]
9X["net-worth-projection-chart.component.ts"]
end
subgraph 9Y["projection-figure-table"]
9Z["projection-figure-table.component.ts"]
end
end
A0["forecast-chart-copy.ts"]
A1["forecast-controls-vm.ts"]
A2["forecast-notices.ts"]
A3["forecast.store.ts"]
A4["future.routes.ts"]
A5["goal-row-vm.ts"]
A6["index.ts"]
A7["net-worth-projection-chart-option.ts"]
A8["projection-accessible-row.ts"]
end
subgraph A9["feature-help"]
subgraph AA["components"]
subgraph AB["faq-page"]
AC["faq-page.component.ts"]
end
subgraph AD["guide-detail"]
AE["guide-detail.component.ts"]
end
subgraph AF["guide-steps"]
AG["guide-steps.component.ts"]
end
subgraph AH["guides-index"]
AI["guides-index.component.ts"]
end
AJ["index.ts"]
end
subgraph AK["data"]
AL["faq.ts"]
AM["guides.ts"]
end
AN["help.routes.ts"]
AO["index.ts"]
end
subgraph AP["feature-home"]
subgraph AQ["components"]
subgraph AR["home-landing"]
AS["home-landing.component.ts"]
end
AT["index.ts"]
end
AU["home.routes.ts"]
AV["index.ts"]
end
subgraph AW["feature-import"]
AX["column-mapping.ts"]
AY["column-statements.ts"]
subgraph AZ["components"]
subgraph B0["account-draft-editor"]
B1["account-draft-editor.component.ts"]
end
subgraph B2["batch-wait-card"]
B3["batch-wait-card.component.ts"]
end
subgraph B4["import-column-row"]
B5["import-column-row.component.ts"]
end
subgraph B6["import-columns-section"]
B7["import-columns-section.component.ts"]
end
subgraph B8["import-history"]
B9["import-history.component.ts"]
end
subgraph BA["import-map-step"]
BB["import-map-step.component.ts"]
end
subgraph BC["import-preview-step"]
BD["import-preview-step.component.ts"]
end
subgraph BE["import-reading-lines"]
BF["import-reading-lines.component.ts"]
end
subgraph BG["import-reading-section"]
BH["import-reading-section.component.ts"]
end
subgraph BI["import-select-step"]
BJ["import-select-step.component.ts"]
end
subgraph BK["import-what-changed"]
BL["import-what-changed.component.ts"]
end
subgraph BM["import-wizard"]
BN["import-wizard.component.ts"]
end
BO["index.ts"]
subgraph BP["queued-file-row"]
BQ["queued-file-row.component.ts"]
end
end
BR["duplicate-scan.ts"]
BS["import-history-rows.ts"]
BT["import-queue.ts"]
BU["import-what-changed.ts"]
BV["import-wizard-session.ts"]
BW["import.routes.ts"]
BX["index.ts"]
BY["mapping-profiles.store.ts"]
BZ["reading-statements.ts"]
end
subgraph C0["feature-income"]
C1["career-start-date.ts"]
subgraph C2["components"]
subgraph C3["income-career-start"]
C4["income-career-start.component.ts"]
end
subgraph C5["income-category-checklist"]
C6["income-category-checklist.component.ts"]
end
subgraph C7["income-chart-cell"]
C8["income-chart-cell.component.ts"]
end
subgraph C9["income-events-sidebar"]
CA["income-events-sidebar.component.ts"]
end
subgraph CB["income-gross-color"]
CC["income-gross-color.component.ts"]
end
subgraph CD["income-gross-net-section"]
CE["income-gross-net-section.component.ts"]
end
subgraph CF["income-growth-panel"]
CG["income-growth-panel.component.ts"]
end
subgraph CH["income-inference-note"]
CI["income-inference-note.component.ts"]
end
subgraph CJ["income-lump-sum-checklist"]
CK["income-lump-sum-checklist.component.ts"]
end
subgraph CL["income-main-category"]
CM["income-main-category.component.ts"]
end
subgraph CN["income-overview"]
CO["income-overview.component.ts"]
end
subgraph CP["income-settings-page"]
CQ["income-settings-page.component.ts"]
end
subgraph CR["income-yearly-panel"]
CS["income-yearly-panel.component.ts"]
end
CT["index.ts"]
subgraph CU["salary-details-page"]
CV["salary-details-page.component.ts"]
end
subgraph CW["salary-metadata-table"]
CX["salary-metadata-table.component.ts"]
end
subgraph CY["salary-month-modal"]
CZ["salary-month-modal.component.ts"]
end
end
D0["gross-net-chart-options.ts"]
D1["income-category-vm.ts"]
D2["income-event-vm.ts"]
D3["income-granularity.ts"]
D4["income.routes.ts"]
D5["income.store.ts"]
D6["index.ts"]
D7["salary-metadata-edit.ts"]
D8["salary-metadata-rows.ts"]
end
subgraph D9["feature-learning"]
subgraph DA["components"]
DB["index.ts"]
subgraph DC["learning-overview"]
DD["learning-overview.component.ts"]
end
subgraph DE["model-status-badge"]
DF["model-status-badge.component.ts"]
end
subgraph DG["model-status"]
DH["model-status.component.ts"]
end
subgraph DI["rule-proposals"]
DJ["rule-proposals.component.ts"]
end
subgraph DK["suggestions-table"]
DL["suggestions-table.component.ts"]
end
end
DM["index.ts"]
DN["learning.routes.ts"]
DO["model-status-display.ts"]
end
subgraph DP["feature-loans"]
subgraph DQ["components"]
DR["index.ts"]
subgraph DS["loan-amortization-table"]
DT["loan-amortization-table.component.ts"]
end
subgraph DU["loan-balance-chart"]
DV["loan-balance-chart.component.ts"]
end
subgraph DW["loan-card"]
DX["loan-card.component.ts"]
end
subgraph DY["loan-composition-chart"]
DZ["loan-composition-chart.component.ts"]
end
subgraph E0["loan-detail"]
E1["loan-detail.component.ts"]
end
subgraph E2["loan-form"]
E3["loan-form.component.ts"]
end
subgraph E4["loan-payments-list"]
E5["loan-payments-list.component.ts"]
end
subgraph E6["loan-what-if"]
E7["loan-what-if.component.ts"]
end
subgraph E8["loans-overview"]
E9["loans-overview.component.ts"]
end
end
EA["index.ts"]
EB["loan-card-vm.ts"]
EC["loan-schedule-status.ts"]
ED["loan-types.ts"]
EE["loan-what-if-vm.ts"]
EF["loans.routes.ts"]
EG["loans.store.ts"]
end
subgraph EH["feature-recurring"]
EI["bills-calendar-vm.ts"]
subgraph EJ["components"]
subgraph EK["bills-calendar"]
EL["bills-calendar.component.ts"]
end
subgraph EM["bills-day-list"]
EN["bills-day-list.component.ts"]
end
subgraph EO["bills-month-grid"]
EP["bills-month-grid.component.ts"]
end
EQ["index.ts"]
subgraph ER["recurring-dismissed-list"]
ES["recurring-dismissed-list.component.ts"]
end
subgraph ET["recurring-overview"]
EU["recurring-overview.component.ts"]
end
subgraph EV["recurring-payments-panel"]
EW["recurring-payments-panel.component.ts"]
end
end
EX["index.ts"]
EY["recurring-overrides.ts"]
EZ["recurring-payments-row-vm.ts"]
F0["recurring-series.store.ts"]
F1["recurring.routes.ts"]
end
subgraph F2["feature-settings"]
subgraph F3["components"]
subgraph F4["account-password-form"]
F5["account-password-form.component.ts"]
end
F6["index.ts"]
subgraph F7["mapping-profile-form"]
F8["mapping-profile-form.component.ts"]
end
subgraph F9["settings-about-section"]
FA["settings-about-section.component.ts"]
end
subgraph FB["settings-account-section"]
FC["settings-account-section.component.ts"]
end
subgraph FD["settings-currency-locale-section"]
FE["settings-currency-locale-section.component.ts"]
end
subgraph FF["settings-data-section"]
FG["settings-data-section.component.ts"]
end
subgraph FH["settings-import-mappings-section"]
FI["settings-import-mappings-section.component.ts"]
end
subgraph FJ["settings-overview"]
FK["settings-overview.component.ts"]
end
subgraph FL["settings-privacy-section"]
FM["settings-privacy-section.component.ts"]
end
subgraph FN["settings-reporting-section"]
FO["settings-reporting-section.component.ts"]
end
subgraph FP["settings-theme-section"]
FQ["settings-theme-section.component.ts"]
end
end
FR["index.ts"]
FS["settings.routes.ts"]
end
subgraph FT["feature-transactions"]
FU["category-picker.ts"]
subgraph FV["components"]
subgraph FW["attribution-override-fieldset"]
FX["attribution-override-fieldset.component.ts"]
end
subgraph FY["category-select-cell"]
FZ["category-select-cell.component.ts"]
end
G0["index.ts"]
subgraph G1["transaction-bulk-bar"]
G2["transaction-bulk-bar.component.ts"]
end
subgraph G3["transaction-card"]
G4["transaction-card.component.ts"]
end
subgraph G5["transaction-edit-form"]
G6["transaction-edit-form.component.ts"]
end
subgraph G7["transaction-filters"]
G8["transaction-filters.component.ts"]
end
subgraph G9["transaction-row"]
GA["transaction-row.component.ts"]
end
subgraph GB["transactions-overview"]
GC["transactions-overview.component.ts"]
end
subgraph GD["transfer-review"]
GE["transfer-review.component.ts"]
end
end
GF["index.ts"]
GG["transaction-filters.ts"]
GH["transaction-row-vm.ts"]
GI["transactions.routes.ts"]
GJ["transfer-label.ts"]
end
subgraph GK["shared"]
subgraph GL["echarts"]
GM["bucketed-axis-option.ts"]
GN["chart-theme.ts"]
GO["echarts-jsdom.testing.ts"]
GP["echarts-setup.ts"]
GQ["index.ts"]
GR["legend-option.ts"]
GS["tooltip-formatter.ts"]
end
subgraph GT["ui"]
subgraph GU["absolute-range-panel"]
GV["absolute-range-panel.component.ts"]
end
subgraph GW["alert"]
GX["alert.component.ts"]
end
subgraph GY["badge"]
GZ["badge.component.ts"]
end
subgraph H0["button"]
H1["button.component.ts"]
end
subgraph H2["collapse"]
H3["collapse.component.ts"]
end
subgraph H4["confirm-dialog"]
H5["confirm-dialog.component.ts"]
end
subgraph H6["cycle-picker"]
H7["cycle-picker.component.ts"]
end
subgraph H8["date-range-input"]
H9["date-range-input.component.ts"]
end
subgraph HA["divider"]
HB["divider.component.ts"]
end
subgraph HC["dropdown"]
HD["dropdown.component.ts"]
end
subgraph HE["empty-state"]
HF["empty-state.component.ts"]
end
subgraph HG["fieldset"]
HH["fieldset.component.ts"]
end
subgraph HI["flex"]
HJ["flex.component.ts"]
end
subgraph HK["granularity-picker"]
HL["granularity-picker.component.ts"]
end
subgraph HM["hydration-boundary"]
HN["hydration-boundary.component.ts"]
end
HO["index.ts"]
subgraph HP["input"]
HQ["input.component.ts"]
end
subgraph HR["label"]
HS["label.component.ts"]
end
subgraph HT["loading-skeleton"]
HU["loading-skeleton.component.ts"]
end
subgraph HV["modal"]
HW["mm-modal.component.ts"]
end
subgraph HX["page-header"]
HY["page-header.component.ts"]
end
subgraph HZ["paginator"]
I0["paginator.component.ts"]
end
subgraph I1["paper"]
I2["paper.component.ts"]
end
subgraph I3["privacy-blur"]
I4["privacy-blur.component.ts"]
end
subgraph I5["privacy-toggle"]
I6["privacy-toggle.component.ts"]
end
subgraph I7["range-picker"]
I8["range-picker.component.ts"]
end
subgraph I9["select"]
IA["select.component.ts"]
end
subgraph IB["stat-card"]
IC["stat-card.component.ts"]
end
subgraph ID["table"]
IE["table.component.ts"]
end
subgraph IF["tabs"]
IG["tabs.component.ts"]
end
subgraph IH["typography"]
II["typography.component.ts"]
end
end
subgraph IJ["utils"]
IK["calendar-cycles.ts"]
IL["compact-viewport.ts"]
IM["confidence-color.ts"]
IN["confirm-state.ts"]
IO["currency-format.ts"]
IP["currency-symbol-presets.ts"]
IQ["daisy-classes.ts"]
IR["date-buckets.ts"]
IS["date-format.pipe.ts"]
IT["date-format.ts"]
IU["debounced-text.ts"]
IV["download-json.ts"]
IW["fingerprint.ts"]
IX["format-settings.testing.ts"]
IY["format-settings.ts"]
IZ["hidden-amount.ts"]
J0["hydration-status.ts"]
J1["iban.ts"]
J2["index.ts"]
J3["link-control-to-setting.ts"]
J4["locale-presets.ts"]
J5["money-color.ts"]
J6["number-format.ts"]
J7["pagination.ts"]
J8["percentage.ts"]
J9["quick-ranges.ts"]
JA["range-expression.ts"]
JB["search-params.ts"]
JC["selection-model.ts"]
JD["signed-amount.pipe.ts"]
JE["sortable.ts"]
JF["structural-filters.ts"]
JG["theme-hooks.ts"]
JH["unrendered-markup.testing.ts"]
subgraph JI["validators"]
JJ["iban.validator.ts"]
JK["percentage.validator.ts"]
end
JL["with-archivable.ts"]
JM["with-persisted-crud.ts"]
end
end
end
end
4-->15
5-->4
5-->6
6-->15
6-->J2
8-->B
8-->G
9-->H
A-->B
A-->G
D-->H
E-->B
E-->H
F-->8
F-->9
F-->A
F-->C
F-->D
F-->E
F-->G
F-->H
H-->A
H-->C
H-->G
H-->2V
H-->4R
J-->15
K-->L
K-->15
L-->5
L-->15
M-->J
M-->L
M-->K
M-->N
M-->O
O-->N
O-->15
Q-->S
Q-->10
S-->2V
T-->S
T-->10
T-->1B
T-->4W
T-->J2
V-->S
V-->10
W-->S
W-->10
W-->1B
X-->S
X-->U
X-->10
X-->1B
Y-->S
Y-->10
Y-->1B
Z-->S
12-->S
12-->10
12-->1B
12-->45
13-->S
13-->10
14-->S
14-->10
15-->Q
15-->S
15-->T
15-->V
15-->W
15-->X
15-->Y
15-->Z
15-->10
15-->12
15-->13
15-->14
15-->16
15-->17
15-->18
15-->19
15-->1A
15-->1B
15-->1C
15-->1D
15-->1E
15-->1F
16-->S
16-->10
17-->S
17-->10
18-->S
18-->10
19-->S
19-->10
1A-->S
1A-->10
1C-->S
1C-->10
1D-->S
1D-->10
1D-->1B
1E-->S
1E-->10
1F-->S
1F-->10
1F-->1B
1H-->15
1H-->J2
1I-->1M
1I-->1Q
1I-->15
1J-->1N
1J-->15
1K-->1M
1K-->1N
1L-->1K
1L-->1N
1M-->15
1N-->1M
1N-->15
1O-->1M
1O-->15
1O-->J2
1P-->1H
1P-->1I
1P-->1J
1P-->1K
1P-->1M
1P-->1N
1P-->1O
1P-->1Q
1Q-->15
1T-->1W
1T-->1Y
1T-->F
1T-->2V
1T-->3A
1T-->GX
1T-->H1
1T-->II
1W-->F
1W-->2J
1W-->3A
1W-->GX
1W-->H1
1W-->II
1Y-->F
1Y-->GX
1Y-->H1
1Y-->II
1Z-->1T
22-->21
24-->J2
25-->24
25-->26
25-->27
26-->24
26-->15
26-->J2
27-->24
27-->26
27-->15
29-->2A
29-->2B
29-->2D
2A-->2D
2B-->2D
2C-->2A
2C-->2B
2C-->2D
2C-->2E
2C-->2F
2D-->10
2E-->M
2E-->15
2H-->5C
2I-->2L
2J-->2H
2J-->2I
2J-->2K
2J-->2L
2K-->2L
2L-->5C
2N-->2O
2N-->2P
2N-->2Q
2N-->2R
2N-->2S
2N-->2T
2S-->2Q
2S-->2R
2S-->2T
2S-->15
2T-->15
2V-->2W
2V-->2X
2V-->2Z
2V-->30
2W-->B
2W-->2X
2W-->30
2X-->30
32-->34
32-->3D
32-->3F
32-->5
32-->15
32-->45
32-->4R
32-->55
32-->J2
33-->15
33-->4R
33-->4W
33-->J2
34-->3D
34-->15
34-->4R
34-->J2
35-->36
35-->45
35-->GQ
35-->J2
36-->45
36-->GQ
36-->J2
37-->15
37-->45
37-->4R
38-->15
38-->4R
38-->J2
39-->3D
39-->3F
39-->M
39-->15
39-->1P
39-->4R
3A-->32
3A-->33
3A-->34
3A-->35
3A-->36
3A-->37
3A-->38
3A-->39
3A-->3B
3A-->3C
3A-->3D
3A-->3E
3A-->3F
3B-->32
3B-->33
3B-->3C
3B-->3D
3B-->15
3B-->45
3B-->J2
3C-->33
3C-->J2
3D-->15
3D-->4R
3D-->51
3D-->55
3E-->15
3E-->4R
3F-->3D
3F-->3E
3F-->15
3F-->4R
3F-->55
3H-->15
3H-->J2
3I-->3H
3I-->15
3I-->J2
3J-->3L
3J-->40
3J-->J2
3K-->3R
3K-->15
3L-->3K
3L-->3R
3L-->15
3L-->J2
3M-->3K
3M-->3R
3M-->15
3M-->J2
3N-->3R
3N-->15
3O-->15
3P-->3K
3P-->3R
3P-->4D
3P-->15
3Q-->J2
3R-->3O
3R-->3S
3R-->15
3R-->55
3S-->5
3S-->15
3T-->15
3U-->3L
3U-->40
3U-->15
3U-->J2
3V-->15
3W-->15
3W-->J2
3X-->J2
3Y-->3Z
3Z-->40
3Z-->15
40-->3L
40-->15
40-->J2
41-->42
41-->44
41-->4M
41-->15
42-->3L
42-->40
42-->J2
43-->40
43-->4O
43-->J2
44-->3L
44-->3U
44-->40
44-->J2
45-->3H
45-->3I
45-->3J
45-->3K
45-->3L
45-->3M
45-->3N
45-->3O
45-->3P
45-->3Q
45-->3R
45-->3S
45-->3T
45-->3U
45-->3V
45-->3W
45-->3X
45-->3Y
45-->3Z
45-->40
45-->41
45-->42
45-->43
45-->44
45-->46
45-->47
45-->48
45-->49
45-->4A
45-->4B
45-->4C
45-->4D
45-->4E
45-->4F
45-->4G
45-->4H
45-->4I
45-->4J
45-->4K
45-->4L
45-->4M
45-->4N
45-->4O
45-->4P
46-->3S
46-->15
47-->3S
47-->5
47-->15
48-->15
48-->J2
49-->4P
4B-->J2
4C-->3R
4C-->15
4D-->J2
4E-->J2
4F-->3R
4F-->M
4F-->15
4F-->J2
4G-->4F
4G-->J2
4H-->15
4H-->J2
4I-->4C
4I-->15
4I-->10
4I-->J2
4J-->3K
4J-->3N
4J-->15
4K-->3R
4K-->15
4K-->55
4L-->15
4L-->55
4M-->3Z
4N-->3R
4N-->15
4N-->J2
4O-->3R
4O-->4C
4O-->15
4P-->3L
4P-->15
4P-->J2
4R-->4S
4R-->4T
4T-->4S
4T-->2V
4V-->4X
4V-->10
4W-->4V
4W-->4X
4W-->4Y
4X-->10
4Y-->4X
4Y-->5C
50-->15
51-->50
51-->52
51-->53
52-->15
53-->15
53-->55
55-->56
55-->57
55-->58
55-->5A
55-->59
57-->5A
57-->15
57-->J2
58-->5A
58-->15
59-->58
59-->5A
59-->15
5A-->6
5A-->15
5A-->J2
5C-->5D
5D-->F
5D-->10
5D-->1B
5D-->1F
5D-->2V
5D-->4R
5E-->F
5E-->15
5E-->1F
5G-->66
5G-->15
5H-->15
5I-->15
5J-->15
5K-->61
5K-->63
5K-->GQ
5L-->45
5L-->J2
5M-->15
5M-->3A
5M-->45
5M-->J2
5P-->HO
5P-->J2
5R-->5L
5R-->5M
5R-->15
5R-->45
5R-->GQ
5R-->HO
5R-->J2
5T-->5L
5T-->5M
5T-->15
5T-->3A
5T-->45
5T-->GQ
5T-->HO
5V-->5G
5V-->5H
5V-->5P
5V-->HO
5X-->5H
5X-->5J
5X-->15
5X-->HO
5X-->J2
5X-->JJ
5X-->JK
5Z-->5R
5Z-->15
5Z-->3A
5Z-->8S
5Z-->HO
5Z-->J2
61-->66
61-->5P
61-->5X
61-->5Z
61-->3A
61-->8S
61-->HO
61-->J2
63-->5G
63-->5H
63-->5I
63-->66
63-->5T
63-->5V
63-->5X
63-->15
63-->3A
63-->HO
63-->J2
64-->5P
64-->5R
64-->5T
64-->5V
64-->5X
64-->61
64-->63
65-->5H
65-->5J
65-->5K
65-->64
66-->J2
68-->F
68-->HO
68-->J2
69-->F
69-->4R
6A-->6K
6B-->6N
6E-->69
6E-->F
6E-->HO
6G-->68
6G-->69
6G-->HO
6I-->68
6I-->HO
6K-->68
6K-->69
6K-->6E
6K-->6G
6K-->6I
6K-->F
6K-->HO
6L-->6N
6N-->F
6N-->GX
6N-->H1
6N-->HH
6N-->HQ
6N-->I2
6N-->II
6O-->6A
6O-->6B
6O-->6L
6Q-->6X
6Q-->7A
6S-->2C
6T-->6S
6T-->7H
6T-->15
6T-->2C
6T-->3A
6T-->4R
6U-->15
6U-->HO
6X-->6R
6X-->6U
6X-->6Z
6X-->M
6X-->15
6X-->3A
6X-->HO
6X-->J2
6Z-->6R
6Z-->15
6Z-->HO
70-->6X
70-->6Z
70-->74
70-->76
70-->78
70-->7A
72-->7C
72-->7E
72-->M
72-->15
72-->3A
72-->HO
74-->7D
74-->3A
74-->HO
74-->J2
76-->7C
76-->72
76-->M
76-->15
76-->3A
76-->HO
78-->7F
78-->7H
78-->HO
78-->J2
7A-->7D
7A-->7G
7A-->7H
7A-->74
7A-->76
7A-->78
7A-->15
7A-->3A
7A-->HO
7A-->J2
7B-->6Q
7B-->6R
7B-->6S
7B-->6T
7B-->70
7B-->7D
7B-->7G
7B-->7H
7C-->7E
7C-->15
7D-->7G
7D-->15
7E-->15
7F-->15
7G-->7E
7G-->15
7H-->7F
7H-->M
7H-->15
7H-->3A
7H-->4R
7H-->J2
7J-->7O
7M-->HO
7O-->7R
7O-->7S
7O-->7T
7O-->7U
7O-->7M
7O-->HO
7P-->7O
7T-->7R
7U-->7S
7V-->7J
7V-->7P
7X-->15
7X-->4R
81-->3A
81-->HO
81-->J2
83-->3A
83-->55
83-->HO
83-->J2
85-->8U
85-->8V
85-->3A
85-->45
85-->GQ
85-->HO
85-->J2
87-->7X
87-->7Y
87-->8U
87-->8V
87-->89
87-->8B
87-->3A
87-->HO
87-->J2
89-->3A
89-->HO
8B-->7Y
8B-->HO
8D-->8P
8D-->8Q
8D-->15
8D-->HO
8F-->8P
8F-->8Q
8F-->8U
8F-->81
8F-->83
8F-->85
8F-->87
8F-->8D
8F-->8I
8F-->8K
8F-->8M
8F-->8O
8F-->3A
8F-->45
8F-->HO
8F-->J2
8G-->81
8G-->83
8G-->85
8G-->87
8G-->89
8G-->8D
8G-->8F
8G-->8I
8G-->8K
8G-->8M
8G-->8O
8I-->89
8I-->3A
8I-->45
8I-->55
8I-->GQ
8I-->HO
8I-->J2
8K-->8U
8K-->8V
8K-->3A
8K-->HO
8K-->J2
8M-->8T
8M-->8U
8M-->8V
8M-->3A
8M-->45
8M-->55
8M-->GQ
8M-->HO
8M-->J2
8O-->8U
8O-->3A
8O-->HO
8O-->J2
8P-->8Q
8P-->15
8P-->4R
8Q-->15
8R-->8F
8R-->GQ
8S-->8G
8S-->8R
8S-->8U
8T-->3A
8T-->45
8U-->7X
8U-->8T
8U-->8V
8U-->3A
8U-->45
8U-->55
8U-->J2
8V-->15
8V-->55
8V-->J2
8Z-->92
8Z-->94
8Z-->15
8Z-->2N
8Z-->4R
8Z-->HO
8Z-->J2
90-->8Z
92-->2N
92-->HO
94-->15
94-->2N
94-->HO
95-->90
99-->9C
99-->9E
99-->3A
99-->HO
9A-->99
9A-->9C
9A-->9E
9C-->3A
9C-->45
9C-->GQ
9C-->HO
9C-->J2
9E-->15
9E-->3A
9E-->45
9E-->55
9E-->GQ
9E-->HO
9E-->J2
9F-->99
9F-->GQ
9G-->9A
9G-->9F
9K-->A1
9K-->A3
9K-->15
9K-->3A
9K-->45
9K-->HO
9K-->J2
9M-->A2
9M-->HO
9O-->9K
9O-->9U
9O-->9X
9O-->HO
9Q-->15
9Q-->HO
9S-->A5
9S-->HO
9U-->A2
9U-->A3
9U-->A5
9U-->9M
9U-->9Q
9U-->9S
9U-->15
9U-->3A
9U-->HO
9U-->J2
9V-->9K
9V-->9M
9V-->9O
9V-->9Q
9V-->9S
9V-->9U
9V-->9X
9V-->9Z
9X-->A0
9X-->A3
9X-->A7
9X-->A8
9X-->9Z
9X-->3A
9X-->HO
9X-->J2
9Z-->A8
A0-->15
A1-->15
A1-->45
A1-->HO
A1-->J2
A2-->A0
A2-->15
A2-->45
A2-->HO
A2-->J2
A3-->15
A3-->3A
A3-->45
A3-->55
A4-->9O
A4-->GQ
A5-->15
A5-->45
A5-->HO
A5-->J2
A6-->9V
A6-->A0
A6-->A1
A6-->A2
A6-->A3
A6-->A4
A6-->A5
A6-->A7
A6-->A8
A7-->45
A7-->GQ
A7-->J2
AC-->AL
AC-->HO
AE-->AM
AE-->AG
AE-->HO
AG-->AM
AG-->HO
AI-->AM
AI-->HO
AJ-->AC
AJ-->AE
AJ-->AG
AJ-->AI
AN-->AC
AN-->AE
AN-->AI
AN-->AM
AO-->AJ
AO-->AM
AO-->AN
AS-->22
AS-->HO
AT-->AS
AU-->AS
AV-->AT
AV-->AU
AX-->15
AY-->AX
AY-->15
AY-->1P
AY-->HO
AY-->J2
B1-->BT
B1-->65
B1-->HO
B3-->HO
B5-->AY
B5-->HO
B7-->AY
B7-->B5
B7-->1P
B7-->HO
B9-->BS
B9-->1P
B9-->3A
B9-->HO
BB-->AX
BB-->AY
BB-->BR
BB-->BY
BB-->BZ
BB-->B7
BB-->BD
BB-->BH
BB-->15
BB-->1P
BB-->HO
BD-->BR
BD-->1P
BD-->HO
BD-->J2
BF-->BZ
BF-->HO
BH-->BZ
BH-->BF
BH-->HO
BJ-->BT
BJ-->BY
BJ-->B9
BJ-->BQ
BJ-->15
BJ-->1P
BJ-->HO
BL-->BS
BL-->BU
BL-->1P
BL-->3A
BL-->HO
BL-->J2
BN-->BV
BN-->B3
BN-->BB
BN-->BJ
BN-->BL
BN-->3A
BN-->HO
BO-->BB
BO-->BD
BO-->BJ
BO-->BL
BO-->BN
BQ-->BT
BQ-->B1
BQ-->15
BQ-->HO
BR-->1P
BR-->HO
BS-->15
BS-->1P
BS-->J2
BT-->15
BU-->15
BU-->1P
BU-->55
BU-->J2
BV-->AX
BV-->BR
BV-->BT
BV-->BY
BV-->15
BV-->1P
BV-->3A
BV-->65
BW-->BN
BX-->AX
BX-->BO
BX-->BT
BX-->BW
BX-->BY
BY-->15
BY-->4R
BZ-->AX
BZ-->15
BZ-->1P
BZ-->HO
BZ-->J2
C1-->45
C4-->C1
C4-->D5
C4-->HO
C4-->J2
C6-->D1
C6-->HO
C8-->HO
CA-->D2
CA-->D3
CA-->D5
CA-->3A
CA-->45
CA-->HO
CC-->D5
CC-->4W
CC-->GQ
CC-->HO
CE-->D0
CE-->D5
CE-->C8
CE-->3A
CE-->45
CE-->GQ
CE-->HO
CE-->J2
CG-->D3
CG-->D5
CG-->C4
CG-->CI
CG-->3A
CG-->45
CG-->HO
CG-->J2
CI-->HO
CK-->D1
CK-->D5
CK-->C6
CM-->D1
CM-->D5
CM-->HO
CO-->D5
CO-->D8
CO-->CA
CO-->CE
CO-->CG
CO-->CI
CO-->CK
CO-->CM
CO-->CS
CO-->CZ
CO-->3A
CO-->45
CO-->GQ
CO-->HO
CO-->J2
CQ-->D1
CQ-->D5
CQ-->C4
CQ-->C6
CQ-->CC
CQ-->CK
CQ-->CM
CQ-->HO
CS-->D5
CS-->3A
CS-->45
CS-->55
CS-->GQ
CS-->HO
CS-->J2
CT-->C4
CT-->C6
CT-->C8
CT-->CA
CT-->CE
CT-->CG
CT-->CM
CT-->CO
CT-->CQ
CT-->CS
CT-->CV
CT-->CX
CT-->CZ
CV-->CX
CV-->HO
CX-->D3
CX-->D5
CX-->D7
CX-->D8
CX-->HO
CX-->J2
CZ-->D5
CZ-->D7
CZ-->D8
CZ-->CX
CZ-->15
CZ-->HO
D0-->45
D0-->GQ
D0-->J2
D1-->15
D2-->D3
D2-->15
D2-->45
D2-->HO
D2-->J2
D3-->J2
D4-->CO
D4-->CQ
D4-->CV
D4-->GQ
D5-->C1
D5-->D3
D5-->15
D5-->3A
D5-->45
D5-->4R
D5-->4W
D5-->55
D6-->CT
D6-->D1
D6-->D3
D6-->D4
D6-->D5
D6-->D7
D6-->D8
D7-->15
D8-->15
DB-->DD
DB-->DH
DB-->DJ
DB-->DL
DD-->DF
DD-->DH
DD-->DJ
DD-->DL
DD-->HO
DF-->DO
DF-->7B
DF-->HO
DH-->DO
DH-->2C
DH-->3A
DH-->7B
DH-->HO
DJ-->15
DJ-->2C
DJ-->3A
DJ-->7B
DJ-->HO
DJ-->J2
DL-->15
DL-->3A
DL-->7B
DL-->HO
DL-->J2
DM-->DB
DM-->DN
DN-->DD
DO-->7B
DO-->HO
DR-->DT
DR-->DV
DR-->DX
DR-->DZ
DR-->E1
DR-->E3
DR-->E5
DR-->E7
DR-->E9
DT-->DZ
DT-->15
DT-->25
DT-->HO
DT-->J2
DV-->15
DV-->25
DV-->GQ
DV-->HO
DX-->EB
DX-->HO
DZ-->15
DZ-->25
DZ-->GQ
DZ-->HO
DZ-->J2
E1-->EC
E1-->EG
E1-->DT
E1-->DV
E1-->E3
E1-->E5
E1-->E7
E1-->25
E1-->3A
E1-->HO
E3-->ED
E3-->15
E3-->3A
E3-->HO
E3-->JK
E5-->15
E5-->3A
E5-->HO
E5-->J2
E7-->EE
E7-->15
E7-->25
E7-->3A
E7-->GQ
E7-->HO
E9-->EB
E9-->EG
E9-->DX
E9-->E3
E9-->15
E9-->HO
EA-->DR
EA-->EB
EA-->EC
EA-->ED
EA-->EE
EA-->EF
EA-->EG
EB-->EC
EB-->ED
EB-->15
EB-->25
EB-->HO
EB-->J2
EC-->25
EC-->HO
EC-->J2
ED-->15
EE-->25
EE-->J2
EF-->E1
EF-->E9
EF-->GQ
EG-->15
EG-->25
EG-->3A
EG-->4R
EG-->J2
EI-->HO
EL-->EI
EL-->F0
EL-->EN
EL-->EP
EL-->3A
EL-->45
EL-->HO
EL-->J2
EN-->EI
EN-->HO
EP-->EI
EP-->HO
EQ-->EL
EQ-->EN
EQ-->EP
EQ-->EU
EQ-->EW
ES-->HO
EU-->EL
EU-->EW
EU-->3A
EU-->HO
EW-->EZ
EW-->F0
EW-->ES
EW-->3A
EW-->45
EW-->GQ
EW-->HO
EW-->J2
EX-->EQ
EX-->F1
EY-->15
EY-->45
EZ-->HO
F0-->EY
F0-->15
F0-->3A
F0-->45
F0-->4R
F0-->55
F1-->EU
F5-->F
F5-->HO
F6-->FK
F8-->15
F8-->1P
F8-->3A
F8-->BX
F8-->HO
FA-->22
FA-->HO
FC-->F5
FC-->F
FC-->HO
FE-->3A
FE-->HO
FE-->J2
FG-->95
FG-->HO
FI-->F8
FI-->15
FI-->3A
FI-->BX
FI-->HO
FI-->J2
FK-->FA
FK-->FC
FK-->FE
FK-->FG
FK-->FI
FK-->FM
FK-->FO
FK-->FQ
FK-->HO
FM-->3A
FM-->HO
FM-->J2
FO-->3A
FO-->HO
FO-->J2
FQ-->3A
FQ-->4W
FQ-->HO
FR-->F6
FR-->FS
FS-->FK
FU-->15
FX-->15
FX-->3A
FX-->51
FX-->HO
FX-->J2
FZ-->FU
G0-->G2
G0-->G6
G0-->G8
G0-->GC
G0-->GE
G2-->FU
G2-->M
G2-->3A
G2-->HO
G4-->FU
G4-->GH
G4-->FZ
G4-->HO
G4-->J2
G6-->FU
G6-->FX
G6-->M
G6-->15
G6-->3A
G6-->51
G6-->7B
G6-->HO
G6-->J2
G8-->FU
G8-->GG
G8-->M
G8-->3A
G8-->HO
G8-->J2
GA-->FU
GA-->GH
GA-->FZ
GA-->HO
GA-->J2
GC-->FU
GC-->GG
GC-->GH
GC-->GJ
GC-->G2
GC-->G4
GC-->G6
GC-->G8
GC-->GA
GC-->GE
GC-->M
GC-->15
GC-->3A
GC-->55
GC-->7B
GC-->HO
GC-->J2
GE-->3A
GE-->55
GE-->HO
GE-->J2
GF-->GI
GG-->15
GG-->55
GH-->15
GH-->J2
GI-->GC
GJ-->15
GJ-->55
GQ-->GM
GQ-->GN
GQ-->GP
GQ-->GR
GQ-->GS
GS-->J2
GV-->H1
GV-->HF
GV-->HH
GV-->HQ
GV-->II
GV-->15
GV-->J2
GX-->J2
GZ-->J2
H1-->J2
H3-->J2
H5-->H1
H5-->HS
H5-->HW
H5-->II
H7-->J2
H9-->H1
H9-->HD
H9-->J2
HB-->J2
HD-->J2
HF-->HJ
HF-->II
HH-->J2
HJ-->J2
HN-->H1
HN-->HU
HO-->GV
HO-->GX
HO-->GZ
HO-->H1
HO-->H3
HO-->H5
HO-->H7
HO-->H9
HO-->HB
HO-->HD
HO-->HF
HO-->HH
HO-->HJ
HO-->HL
HO-->HN
HO-->HQ
HO-->HS
HO-->HU
HO-->HW
HO-->HY
HO-->I0
HO-->I2
HO-->I4
HO-->I6
HO-->I8
HO-->IA
HO-->IC
HO-->IE
HO-->IG
HO-->II
HQ-->J2
HS-->J2
HU-->HJ
HW-->J2
HY-->HJ
HY-->II
I0-->H1
I0-->HJ
I0-->II
I0-->J2
I2-->J2
I4-->J2
I6-->H1
I6-->3A
I8-->GV
I8-->H1
I8-->HJ
I8-->I2
I8-->II
I8-->15
I8-->J2
IA-->J2
IC-->I4
IC-->II
IC-->J2
IE-->J2
IG-->J2
II-->J2
IK-->IT
IO-->IY
IR-->IY
IS-->IT
IT-->IY
IX-->IY
IY-->10
J2-->IK
J2-->IL
J2-->IM
J2-->IN
J2-->IO
J2-->IP
J2-->IQ
J2-->IR
J2-->IT
J2-->IS
J2-->IU
J2-->IV
J2-->IW
J2-->IY
J2-->IZ
J2-->J0
J2-->J1
J2-->J3
J2-->J4
J2-->J5
J2-->J6
J2-->J7
J2-->J8
J2-->J9
J2-->JA
J2-->JB
J2-->JC
J2-->JD
J2-->JE
J2-->JF
J2-->JG
J2-->JL
J2-->JM
J6-->IY
J9-->IR
J9-->JA
JA-->IR
JD-->IO
```
