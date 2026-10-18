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
- 484 leaf nodes, 1517 edges.
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
Y["csv-options.ts"]
Z["dashboard-layout-settings.repository.ts"]
10["data-management.repository.ts"]
11["entities.ts"]
12["fake-api.testing.ts"]
13["forecast-settings.repository.ts"]
14["goals.repository.ts"]
15["import-batches.repository.ts"]
16["index.ts"]
17["loans.repository.ts"]
18["mapping-profiles.repository.ts"]
19["recurring-overrides.repository.ts"]
1A["rules.repository.ts"]
1B["salary-metadata.repository.ts"]
1C["seed-data.ts"]
1D["transactions.repository.ts"]
1E["transfer-settings.repository.ts"]
1F["transfers.repository.ts"]
1G["ui-preferences.repository.ts"]
end
subgraph 1H["import"]
1I["account-detection.ts"]
1J["csv-import.service.ts"]
1K["csv-parse.ts"]
1L["csv-parse.worker.ts"]
1M["csv-row-mapper.ts"]
1N["csv-worker.types.ts"]
1O["delimiter-guess.ts"]
1P["import.service.ts"]
1Q["index.ts"]
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
57["transfer-linking.service.ts"]
58["transfer-matching.service.ts"]
59["transfer-matching.ts"]
end
subgraph 5A["ui-preferences"]
5B["index.ts"]
5C["ui-preferences.service.ts"]
5D["ui-preferences.testing.ts"]
end
end
subgraph 5E["feature-accounts"]
5F["account-card-vm.ts"]
5G["account-icons.ts"]
5H["account-list-order.ts"]
5I["account-types.ts"]
5J["accounts.routes.ts"]
5K["balance-day-tooltip.ts"]
5L["balance-trend-signals.ts"]
subgraph 5M["components"]
subgraph 5N["account-balance-block"]
5O["account-balance-block.component.ts"]
end
subgraph 5P["account-balance-chart"]
5Q["account-balance-chart.component.ts"]
end
subgraph 5R["account-balance-history-chart"]
5S["account-balance-history-chart.component.ts"]
end
subgraph 5T["account-card"]
5U["account-card.component.ts"]
end
subgraph 5V["account-form"]
5W["account-form.component.ts"]
end
subgraph 5X["account-insights"]
5Y["account-insights.component.ts"]
end
subgraph 5Z["accounts-detail"]
60["accounts-detail.component.ts"]
end
subgraph 61["accounts-overview"]
62["accounts-overview.component.ts"]
end
63["index.ts"]
end
64["index.ts"]
65["last-import-status.ts"]
end
subgraph 66["feature-auth"]
67["admin-user-row.ts"]
68["admin-users.store.ts"]
69["admin.routes.ts"]
6A["auth.routes.ts"]
subgraph 6B["components"]
subgraph 6C["admin-create-account-dialog"]
6D["admin-create-account-dialog.component.ts"]
end
subgraph 6E["admin-reset-password-dialog"]
6F["admin-reset-password-dialog.component.ts"]
end
subgraph 6G["admin-user-actions"]
6H["admin-user-actions.component.ts"]
end
subgraph 6I["admin-users-page"]
6J["admin-users-page.component.ts"]
end
6K["index.ts"]
subgraph 6L["login-page"]
6M["login-page.component.ts"]
end
end
6N["index.ts"]
end
subgraph 6O["feature-categories"]
6P["categories.routes.ts"]
6Q["category-icons.ts"]
6R["category-model.service.ts"]
6S["category-model.store.ts"]
6T["category-row-vm.ts"]
subgraph 6U["components"]
subgraph 6V["categories-overview"]
6W["categories-overview.component.ts"]
end
subgraph 6X["category-form"]
6Y["category-form.component.ts"]
end
6Z["index.ts"]
subgraph 70["rule-condition-row"]
71["rule-condition-row.component.ts"]
end
subgraph 72["rule-filters"]
73["rule-filters.component.ts"]
end
subgraph 74["rule-form"]
75["rule-form.component.ts"]
end
subgraph 76["rule-share-bar"]
77["rule-share-bar.component.ts"]
end
subgraph 78["rules-overview"]
79["rules-overview.component.ts"]
end
end
7A["index.ts"]
7B["rule-condition-editor.ts"]
7C["rule-filters.ts"]
7D["rule-labels.ts"]
7E["rule-share.ts"]
7F["rule-summary.ts"]
7G["rules.store.ts"]
end
subgraph 7H["feature-changelog"]
7I["changelog.routes.ts"]
subgraph 7J["components"]
subgraph 7K["changelog-entry-row"]
7L["changelog-entry-row.component.ts"]
end
subgraph 7M["changelog-page"]
7N["changelog-page.component.ts"]
end
7O["index.ts"]
end
subgraph 7P["data"]
7Q["changelog-entries.ts"]
7R["roadmap-entries.ts"]
end
7S["group-changelog-entries.ts"]
7T["group-roadmap-entries.ts"]
7U["index.ts"]
end
subgraph 7V["feature-dashboard"]
7W["category-comparison-settings.store.ts"]
7X["category-comparison-vm.ts"]
subgraph 7Y["components"]
subgraph 7Z["account-balance-strip"]
80["account-balance-strip.component.ts"]
end
subgraph 81["action-queue-panel"]
82["action-queue-panel.component.ts"]
end
subgraph 83["category-breakdown-panel"]
84["category-breakdown-panel.component.ts"]
end
subgraph 85["category-comparison-panel"]
86["category-comparison-panel.component.ts"]
end
subgraph 87["category-exclusion-dropdown"]
88["category-exclusion-dropdown.component.ts"]
end
subgraph 89["comparison-category-card"]
8A["comparison-category-card.component.ts"]
end
subgraph 8B["dashboard-customize-panel"]
8C["dashboard-customize-panel.component.ts"]
end
subgraph 8D["dashboard-overview"]
8E["dashboard-overview.component.ts"]
end
8F["index.ts"]
subgraph 8G["spending-heatmap-panel"]
8H["spending-heatmap-panel.component.ts"]
end
subgraph 8I["top-transactions-panel"]
8J["top-transactions-panel.component.ts"]
end
subgraph 8K["trend-chart-panel"]
8L["trend-chart-panel.component.ts"]
end
subgraph 8M["weekday-weekend-split-panel"]
8N["weekday-weekend-split-panel.component.ts"]
end
end
8O["dashboard-layout-settings.store.ts"]
8P["dashboard-row-order.ts"]
8Q["dashboard.routes.ts"]
8R["index.ts"]
8S["stats-scope.ts"]
8T["stats.store.ts"]
end
subgraph 8U["feature-data-management"]
subgraph 8V["components"]
subgraph 8W["data-management-overview"]
8X["data-management-overview.component.ts"]
end
8Y["index.ts"]
subgraph 8Z["qr-receive-dialog"]
90["qr-receive-dialog.component.ts"]
end
subgraph 91["qr-send-dialog"]
92["qr-send-dialog.component.ts"]
end
end
93["index.ts"]
end
subgraph 94["feature-explore"]
subgraph 95["components"]
subgraph 96["explore-overview"]
97["explore-overview.component.ts"]
end
98["index.ts"]
subgraph 99["money-flow-panel"]
9A["money-flow-panel.component.ts"]
end
subgraph 9B["spending-mosaic-panel"]
9C["spending-mosaic-panel.component.ts"]
end
end
9D["explore.routes.ts"]
9E["index.ts"]
end
subgraph 9F["feature-future"]
subgraph 9G["components"]
subgraph 9H["forecast-controls"]
9I["forecast-controls.component.ts"]
end
subgraph 9J["forecast-notice"]
9K["forecast-notice.component.ts"]
end
subgraph 9L["future-overview"]
9M["future-overview.component.ts"]
end
subgraph 9N["goal-form"]
9O["goal-form.component.ts"]
end
subgraph 9P["goal-row"]
9Q["goal-row.component.ts"]
end
subgraph 9R["goals-panel"]
9S["goals-panel.component.ts"]
end
9T["index.ts"]
subgraph 9U["net-worth-projection-chart"]
9V["net-worth-projection-chart.component.ts"]
end
subgraph 9W["projection-figure-table"]
9X["projection-figure-table.component.ts"]
end
end
9Y["forecast-chart-copy.ts"]
9Z["forecast-controls-vm.ts"]
A0["forecast-notices.ts"]
A1["forecast.store.ts"]
A2["future.routes.ts"]
A3["goal-row-vm.ts"]
A4["index.ts"]
A5["net-worth-projection-chart-option.ts"]
A6["projection-accessible-row.ts"]
end
subgraph A7["feature-help"]
subgraph A8["components"]
subgraph A9["faq-page"]
AA["faq-page.component.ts"]
end
subgraph AB["guide-detail"]
AC["guide-detail.component.ts"]
end
subgraph AD["guide-steps"]
AE["guide-steps.component.ts"]
end
subgraph AF["guides-index"]
AG["guides-index.component.ts"]
end
AH["index.ts"]
end
subgraph AI["data"]
AJ["faq.ts"]
AK["guides.ts"]
end
AL["help.routes.ts"]
AM["index.ts"]
end
subgraph AN["feature-home"]
subgraph AO["components"]
subgraph AP["home-landing"]
AQ["home-landing.component.ts"]
end
AR["index.ts"]
end
AS["home.routes.ts"]
AT["index.ts"]
end
subgraph AU["feature-import"]
AV["column-mapping.ts"]
subgraph AW["components"]
subgraph AX["account-draft-editor"]
AY["account-draft-editor.component.ts"]
end
subgraph AZ["batch-wait-card"]
B0["batch-wait-card.component.ts"]
end
subgraph B1["column-map-amount-field"]
B2["column-map-amount-field.component.ts"]
end
subgraph B3["column-map-counterparty-field"]
B4["column-map-counterparty-field.component.ts"]
end
subgraph B5["column-map-sample-caption"]
B6["column-map-sample-caption.component.ts"]
end
subgraph B7["column-map-simple-field"]
B8["column-map-simple-field.component.ts"]
end
subgraph B9["column-map-stepper"]
BA["column-map-stepper.component.ts"]
end
subgraph BB["column-map-summary-step"]
BC["column-map-summary-step.component.ts"]
end
subgraph BD["import-history"]
BE["import-history.component.ts"]
end
subgraph BF["import-map-step"]
BG["import-map-step.component.ts"]
end
subgraph BH["import-preview-step"]
BI["import-preview-step.component.ts"]
end
subgraph BJ["import-select-step"]
BK["import-select-step.component.ts"]
end
subgraph BL["import-summary-step"]
BM["import-summary-step.component.ts"]
end
subgraph BN["import-wizard"]
BO["import-wizard.component.ts"]
end
BP["index.ts"]
subgraph BQ["queued-file-row"]
BR["queued-file-row.component.ts"]
end
end
BS["duplicate-scan.ts"]
BT["import-history-rows.ts"]
BU["import-queue.ts"]
BV["import-wizard-session.ts"]
BW["import.routes.ts"]
BX["index.ts"]
BY["mapper-steps.ts"]
BZ["mapping-profiles.store.ts"]
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
subgraph F7["settings-about-section"]
F8["settings-about-section.component.ts"]
end
subgraph F9["settings-account-section"]
FA["settings-account-section.component.ts"]
end
subgraph FB["settings-currency-locale-section"]
FC["settings-currency-locale-section.component.ts"]
end
subgraph FD["settings-data-section"]
FE["settings-data-section.component.ts"]
end
subgraph FF["settings-overview"]
FG["settings-overview.component.ts"]
end
subgraph FH["settings-privacy-section"]
FI["settings-privacy-section.component.ts"]
end
subgraph FJ["settings-reporting-section"]
FK["settings-reporting-section.component.ts"]
end
subgraph FL["settings-theme-section"]
FM["settings-theme-section.component.ts"]
end
end
FN["index.ts"]
FO["settings.routes.ts"]
end
subgraph FP["feature-transactions"]
FQ["category-picker.ts"]
subgraph FR["components"]
subgraph FS["attribution-override-fieldset"]
FT["attribution-override-fieldset.component.ts"]
end
subgraph FU["category-select-cell"]
FV["category-select-cell.component.ts"]
end
FW["index.ts"]
subgraph FX["transaction-bulk-bar"]
FY["transaction-bulk-bar.component.ts"]
end
subgraph FZ["transaction-card"]
G0["transaction-card.component.ts"]
end
subgraph G1["transaction-edit-form"]
G2["transaction-edit-form.component.ts"]
end
subgraph G3["transaction-filters"]
G4["transaction-filters.component.ts"]
end
subgraph G5["transaction-row"]
G6["transaction-row.component.ts"]
end
subgraph G7["transactions-overview"]
G8["transactions-overview.component.ts"]
end
subgraph G9["transfer-review"]
GA["transfer-review.component.ts"]
end
end
GB["index.ts"]
GC["transaction-filters.ts"]
GD["transaction-row-vm.ts"]
GE["transactions.routes.ts"]
GF["transfer-label.ts"]
end
subgraph GG["shared"]
subgraph GH["echarts"]
GI["bucketed-axis-option.ts"]
GJ["chart-theme.ts"]
GK["echarts-jsdom.testing.ts"]
GL["echarts-setup.ts"]
GM["index.ts"]
GN["legend-option.ts"]
GO["tooltip-formatter.ts"]
end
subgraph GP["ui"]
subgraph GQ["absolute-range-panel"]
GR["absolute-range-panel.component.ts"]
end
subgraph GS["alert"]
GT["alert.component.ts"]
end
subgraph GU["badge"]
GV["badge.component.ts"]
end
subgraph GW["button"]
GX["button.component.ts"]
end
subgraph GY["collapse"]
GZ["collapse.component.ts"]
end
subgraph H0["confirm-dialog"]
H1["confirm-dialog.component.ts"]
end
subgraph H2["cycle-picker"]
H3["cycle-picker.component.ts"]
end
subgraph H4["date-range-input"]
H5["date-range-input.component.ts"]
end
subgraph H6["divider"]
H7["divider.component.ts"]
end
subgraph H8["dropdown"]
H9["dropdown.component.ts"]
end
subgraph HA["empty-state"]
HB["empty-state.component.ts"]
end
subgraph HC["fieldset"]
HD["fieldset.component.ts"]
end
subgraph HE["flex"]
HF["flex.component.ts"]
end
subgraph HG["granularity-picker"]
HH["granularity-picker.component.ts"]
end
subgraph HI["hydration-boundary"]
HJ["hydration-boundary.component.ts"]
end
HK["index.ts"]
subgraph HL["input"]
HM["input.component.ts"]
end
subgraph HN["label"]
HO["label.component.ts"]
end
subgraph HP["loading-skeleton"]
HQ["loading-skeleton.component.ts"]
end
subgraph HR["modal"]
HS["mm-modal.component.ts"]
end
subgraph HT["page-header"]
HU["page-header.component.ts"]
end
subgraph HV["paginator"]
HW["paginator.component.ts"]
end
subgraph HX["paper"]
HY["paper.component.ts"]
end
subgraph HZ["privacy-blur"]
I0["privacy-blur.component.ts"]
end
subgraph I1["privacy-toggle"]
I2["privacy-toggle.component.ts"]
end
subgraph I3["range-picker"]
I4["range-picker.component.ts"]
end
subgraph I5["select"]
I6["select.component.ts"]
end
subgraph I7["stat-card"]
I8["stat-card.component.ts"]
end
subgraph I9["table"]
IA["table.component.ts"]
end
subgraph IB["tabs"]
IC["tabs.component.ts"]
end
subgraph ID["typography"]
IE["typography.component.ts"]
end
end
subgraph IF["utils"]
IG["calendar-cycles.ts"]
IH["compact-viewport.ts"]
II["confidence-color.ts"]
IJ["confirm-state.ts"]
IK["currency-format.ts"]
IL["currency-symbol-presets.ts"]
IM["daisy-classes.ts"]
IN["date-buckets.ts"]
IO["date-format.pipe.ts"]
IP["date-format.ts"]
IQ["debounced-text.ts"]
IR["download-json.ts"]
IS["fingerprint.ts"]
IT["format-settings.testing.ts"]
IU["format-settings.ts"]
IV["hidden-amount.ts"]
IW["hydration-status.ts"]
IX["iban.ts"]
IY["index.ts"]
IZ["link-control-to-setting.ts"]
J0["locale-presets.ts"]
J1["money-color.ts"]
J2["number-format.ts"]
J3["pagination.ts"]
J4["percentage.ts"]
J5["quick-ranges.ts"]
J6["range-expression.ts"]
J7["search-params.ts"]
J8["selection-model.ts"]
J9["signed-amount.pipe.ts"]
JA["sortable.ts"]
JB["structural-filters.ts"]
JC["theme-hooks.ts"]
JD["unrendered-markup.testing.ts"]
subgraph JE["validators"]
JF["iban.validator.ts"]
JG["percentage.validator.ts"]
end
JH["with-archivable.ts"]
JI["with-persisted-crud.ts"]
end
end
end
end
4-->16
5-->4
5-->6
6-->16
6-->IY
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
J-->16
K-->L
K-->16
L-->5
L-->16
M-->J
M-->L
M-->K
M-->N
M-->O
N-->16
O-->N
O-->16
Q-->S
Q-->11
S-->2V
T-->S
T-->11
T-->1C
T-->4W
T-->IY
V-->S
V-->11
W-->S
W-->11
W-->1C
X-->S
X-->U
X-->11
X-->1C
Y-->11
Z-->S
Z-->11
Z-->1C
10-->S
13-->S
13-->11
13-->1C
13-->45
14-->S
14-->11
15-->S
15-->11
16-->Q
16-->S
16-->T
16-->V
16-->W
16-->X
16-->Y
16-->Z
16-->10
16-->11
16-->13
16-->14
16-->15
16-->17
16-->18
16-->19
16-->1A
16-->1B
16-->1C
16-->1D
16-->1E
16-->1F
16-->1G
17-->S
17-->11
18-->S
18-->11
19-->S
19-->11
1A-->S
1A-->11
1B-->S
1B-->11
1D-->S
1D-->11
1E-->S
1E-->11
1E-->1C
1F-->S
1F-->11
1G-->S
1G-->11
1G-->1C
1I-->16
1I-->IY
1J-->1N
1J-->16
1K-->1M
1K-->1N
1L-->1K
1L-->1N
1M-->16
1N-->1M
1N-->16
1P-->1M
1P-->16
1P-->IY
1Q-->1I
1Q-->1J
1Q-->1K
1Q-->1M
1Q-->1N
1Q-->1O
1Q-->1P
1T-->1W
1T-->1Y
1T-->F
1T-->2V
1T-->3A
1T-->GT
1T-->GX
1T-->IE
1W-->F
1W-->2J
1W-->3A
1W-->GT
1W-->GX
1W-->IE
1Y-->F
1Y-->GT
1Y-->GX
1Y-->IE
1Z-->1T
22-->21
24-->IY
25-->24
25-->26
25-->27
26-->24
26-->16
26-->IY
27-->24
27-->26
27-->16
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
2D-->11
2E-->M
2E-->16
2H-->5B
2I-->2L
2J-->2H
2J-->2I
2J-->2K
2J-->2L
2K-->2L
2L-->5B
2N-->2O
2N-->2P
2N-->2Q
2N-->2R
2N-->2S
2N-->2T
2S-->2Q
2S-->2R
2S-->2T
2S-->16
2T-->16
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
32-->16
32-->45
32-->4R
32-->55
32-->IY
33-->16
33-->4R
33-->4W
33-->IY
34-->3D
34-->16
34-->4R
34-->IY
35-->36
35-->45
35-->GM
35-->IY
36-->45
36-->GM
36-->IY
37-->16
37-->45
37-->4R
38-->16
38-->4R
38-->IY
39-->3D
39-->3F
39-->M
39-->16
39-->1Q
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
3B-->16
3B-->45
3B-->IY
3C-->33
3C-->IY
3D-->16
3D-->4R
3D-->51
3D-->55
3E-->16
3E-->4R
3F-->3D
3F-->3E
3F-->16
3F-->4R
3F-->55
3H-->16
3H-->IY
3I-->3H
3I-->16
3I-->IY
3J-->3L
3J-->40
3J-->IY
3K-->3R
3K-->16
3L-->3K
3L-->3R
3L-->16
3L-->IY
3M-->3K
3M-->3R
3M-->16
3M-->IY
3N-->3R
3N-->16
3O-->16
3P-->3K
3P-->3R
3P-->4D
3P-->16
3Q-->IY
3R-->3O
3R-->3S
3R-->16
3R-->55
3S-->5
3S-->16
3T-->16
3U-->3L
3U-->40
3U-->16
3U-->IY
3V-->16
3W-->16
3W-->IY
3X-->IY
3Y-->3Z
3Z-->40
3Z-->16
40-->3L
40-->16
40-->IY
41-->42
41-->44
41-->4M
41-->16
42-->3L
42-->40
42-->IY
43-->40
43-->4O
43-->IY
44-->3L
44-->3U
44-->40
44-->IY
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
46-->16
47-->3S
47-->5
47-->16
48-->16
48-->IY
49-->4P
4B-->IY
4C-->3R
4C-->16
4D-->IY
4E-->IY
4F-->3R
4F-->M
4F-->16
4F-->IY
4G-->4F
4G-->IY
4H-->16
4H-->IY
4I-->4C
4I-->16
4I-->11
4I-->IY
4J-->3K
4J-->3N
4J-->16
4K-->3R
4K-->16
4K-->55
4L-->16
4L-->55
4M-->3Z
4N-->3R
4N-->16
4N-->IY
4O-->3R
4O-->4C
4O-->16
4P-->3L
4P-->16
4P-->IY
4R-->4S
4R-->4T
4T-->4S
4T-->2V
4V-->4X
4V-->11
4W-->4V
4W-->4X
4W-->4Y
4X-->11
4Y-->4X
4Y-->5B
50-->16
51-->50
51-->52
51-->53
52-->16
53-->16
53-->55
55-->56
55-->57
55-->59
55-->58
57-->59
57-->16
58-->57
58-->59
58-->16
59-->6
59-->16
59-->IY
5B-->5C
5C-->F
5C-->11
5C-->1C
5C-->1G
5C-->2V
5C-->4R
5D-->F
5D-->16
5D-->1G
5F-->65
5F-->16
5G-->16
5H-->16
5I-->16
5J-->60
5J-->62
5J-->GM
5K-->45
5K-->IY
5L-->16
5L-->3A
5L-->45
5L-->IY
5O-->HK
5O-->IY
5Q-->5K
5Q-->5L
5Q-->16
5Q-->45
5Q-->GM
5Q-->HK
5Q-->IY
5S-->5K
5S-->5L
5S-->16
5S-->3A
5S-->45
5S-->GM
5S-->HK
5U-->5F
5U-->5G
5U-->5O
5U-->HK
5W-->5G
5W-->5I
5W-->16
5W-->HK
5W-->IY
5W-->JF
5W-->JG
5Y-->5Q
5Y-->16
5Y-->3A
5Y-->8R
5Y-->HK
5Y-->IY
60-->65
60-->5O
60-->5W
60-->5Y
60-->3A
60-->8R
60-->HK
60-->IY
62-->5F
62-->5G
62-->5H
62-->65
62-->5S
62-->5U
62-->5W
62-->16
62-->3A
62-->HK
62-->IY
63-->5O
63-->5Q
63-->5S
63-->5U
63-->5W
63-->60
63-->62
64-->5G
64-->5I
64-->5J
64-->63
65-->IY
67-->F
67-->HK
67-->IY
68-->F
68-->4R
69-->6J
6A-->6M
6D-->68
6D-->F
6D-->HK
6F-->67
6F-->68
6F-->HK
6H-->67
6H-->HK
6J-->67
6J-->68
6J-->6D
6J-->6F
6J-->6H
6J-->F
6J-->HK
6K-->6M
6M-->F
6M-->GT
6M-->GX
6M-->HD
6M-->HM
6M-->HY
6M-->IE
6N-->69
6N-->6A
6N-->6K
6P-->6W
6P-->79
6R-->2C
6S-->6R
6S-->7G
6S-->16
6S-->2C
6S-->3A
6S-->4R
6T-->16
6T-->HK
6W-->6Q
6W-->6T
6W-->6Y
6W-->M
6W-->16
6W-->3A
6W-->HK
6W-->IY
6Y-->6Q
6Y-->16
6Y-->HK
6Z-->6W
6Z-->6Y
6Z-->73
6Z-->75
6Z-->77
6Z-->79
71-->7B
71-->7D
71-->M
71-->16
71-->3A
71-->HK
73-->7C
73-->3A
73-->HK
73-->IY
75-->7B
75-->71
75-->M
75-->16
75-->3A
75-->HK
77-->7E
77-->7G
77-->HK
77-->IY
79-->7C
79-->7F
79-->7G
79-->73
79-->75
79-->77
79-->16
79-->3A
79-->HK
79-->IY
7A-->6P
7A-->6Q
7A-->6R
7A-->6S
7A-->6Z
7A-->7C
7A-->7F
7A-->7G
7B-->7D
7B-->16
7C-->7F
7C-->16
7D-->16
7E-->16
7F-->7D
7F-->16
7G-->7E
7G-->M
7G-->16
7G-->3A
7G-->4R
7G-->IY
7I-->7N
7L-->HK
7N-->7Q
7N-->7R
7N-->7S
7N-->7T
7N-->7L
7N-->HK
7O-->7N
7S-->7Q
7T-->7R
7U-->7I
7U-->7O
7W-->16
7W-->4R
80-->3A
80-->HK
80-->IY
82-->3A
82-->55
82-->HK
82-->IY
84-->8T
84-->3A
84-->45
84-->GM
84-->HK
84-->IY
86-->7W
86-->7X
86-->8T
86-->88
86-->8A
86-->3A
86-->HK
86-->IY
88-->3A
88-->HK
8A-->7X
8A-->HK
8C-->8O
8C-->8P
8C-->16
8C-->HK
8E-->8O
8E-->8P
8E-->8T
8E-->80
8E-->82
8E-->84
8E-->86
8E-->8C
8E-->8H
8E-->8J
8E-->8L
8E-->8N
8E-->3A
8E-->45
8E-->HK
8E-->IY
8F-->80
8F-->82
8F-->84
8F-->86
8F-->88
8F-->8C
8F-->8E
8F-->8H
8F-->8J
8F-->8L
8F-->8N
8H-->88
8H-->3A
8H-->45
8H-->55
8H-->GM
8H-->HK
8H-->IY
8J-->8T
8J-->3A
8J-->HK
8J-->IY
8L-->8S
8L-->8T
8L-->3A
8L-->45
8L-->55
8L-->GM
8L-->HK
8L-->IY
8N-->8T
8N-->3A
8N-->HK
8N-->IY
8O-->8P
8O-->16
8O-->4R
8P-->16
8Q-->8E
8Q-->GM
8R-->8F
8R-->8Q
8R-->8T
8S-->3A
8S-->45
8T-->7W
8T-->8S
8T-->3A
8T-->45
8T-->55
8T-->IY
8X-->90
8X-->92
8X-->16
8X-->2N
8X-->HK
8X-->IY
8Y-->8X
90-->2N
90-->HK
92-->16
92-->2N
92-->HK
93-->8Y
97-->9A
97-->9C
97-->3A
97-->HK
98-->97
98-->9A
98-->9C
9A-->3A
9A-->45
9A-->GM
9A-->HK
9A-->IY
9C-->16
9C-->3A
9C-->45
9C-->55
9C-->GM
9C-->HK
9C-->IY
9D-->97
9D-->GM
9E-->98
9E-->9D
9I-->9Z
9I-->A1
9I-->16
9I-->3A
9I-->45
9I-->HK
9I-->IY
9K-->A0
9K-->HK
9M-->9I
9M-->9S
9M-->9V
9M-->HK
9O-->16
9O-->HK
9Q-->A3
9Q-->HK
9S-->A0
9S-->A1
9S-->A3
9S-->9K
9S-->9O
9S-->9Q
9S-->16
9S-->3A
9S-->HK
9S-->IY
9T-->9I
9T-->9K
9T-->9M
9T-->9O
9T-->9Q
9T-->9S
9T-->9V
9T-->9X
9V-->9Y
9V-->A1
9V-->A5
9V-->A6
9V-->9X
9V-->3A
9V-->HK
9V-->IY
9X-->A6
9Y-->16
9Z-->16
9Z-->45
9Z-->HK
9Z-->IY
A0-->9Y
A0-->16
A0-->45
A0-->HK
A0-->IY
A1-->16
A1-->3A
A1-->45
A1-->55
A2-->9M
A2-->GM
A3-->16
A3-->45
A3-->HK
A3-->IY
A4-->9T
A4-->9Y
A4-->9Z
A4-->A0
A4-->A1
A4-->A2
A4-->A3
A4-->A5
A4-->A6
A5-->45
A5-->GM
A5-->IY
AA-->AJ
AA-->HK
AC-->AK
AC-->AE
AC-->HK
AE-->AK
AE-->HK
AG-->AK
AG-->HK
AH-->AA
AH-->AC
AH-->AE
AH-->AG
AL-->AA
AL-->AC
AL-->AG
AL-->AK
AM-->AH
AM-->AK
AM-->AL
AQ-->22
AQ-->HK
AR-->AQ
AS-->AQ
AT-->AR
AT-->AS
AV-->16
AY-->BU
AY-->64
AY-->HK
B0-->HK
B2-->B6
B2-->HK
B4-->B6
B4-->HK
B6-->HK
B8-->AV
B8-->B6
B8-->HK
BA-->BY
BA-->HK
BC-->AV
BC-->HK
BE-->BT
BE-->1Q
BE-->3A
BE-->HK
BG-->AV
BG-->BS
BG-->BY
BG-->BZ
BG-->B2
BG-->B4
BG-->B8
BG-->BA
BG-->BC
BG-->BI
BG-->16
BG-->1Q
BG-->HK
BI-->BS
BI-->1Q
BI-->HK
BI-->IY
BK-->BU
BK-->BZ
BK-->BE
BK-->BR
BK-->16
BK-->1Q
BK-->HK
BM-->BT
BM-->16
BM-->1Q
BM-->3A
BM-->HK
BO-->BV
BO-->B0
BO-->BG
BO-->BK
BO-->BM
BO-->3A
BO-->HK
BP-->BG
BP-->BI
BP-->BK
BP-->BM
BP-->BO
BR-->BU
BR-->AY
BR-->16
BR-->HK
BS-->1Q
BS-->HK
BT-->16
BT-->1Q
BT-->IY
BU-->16
BV-->AV
BV-->BS
BV-->BU
BV-->BZ
BV-->16
BV-->1Q
BV-->3A
BV-->64
BW-->BO
BX-->AV
BX-->BP
BX-->BU
BX-->BW
BX-->BY
BX-->BZ
BY-->AV
BZ-->16
BZ-->4R
C1-->45
C4-->C1
C4-->D5
C4-->HK
C4-->IY
C6-->D1
C6-->HK
C8-->HK
CA-->D2
CA-->D3
CA-->D5
CA-->3A
CA-->45
CA-->HK
CC-->D5
CC-->4W
CC-->GM
CC-->HK
CE-->D0
CE-->D5
CE-->C8
CE-->3A
CE-->45
CE-->GM
CE-->HK
CE-->IY
CG-->D3
CG-->D5
CG-->C4
CG-->CI
CG-->3A
CG-->45
CG-->HK
CG-->IY
CI-->HK
CK-->D1
CK-->D5
CK-->C6
CM-->D1
CM-->D5
CM-->HK
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
CO-->GM
CO-->HK
CO-->IY
CQ-->D1
CQ-->D5
CQ-->C4
CQ-->C6
CQ-->CC
CQ-->CK
CQ-->CM
CQ-->HK
CS-->D5
CS-->3A
CS-->45
CS-->55
CS-->GM
CS-->HK
CS-->IY
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
CV-->HK
CX-->D3
CX-->D5
CX-->D7
CX-->D8
CX-->HK
CX-->IY
CZ-->D5
CZ-->D7
CZ-->D8
CZ-->CX
CZ-->16
CZ-->HK
D0-->45
D0-->GM
D0-->IY
D1-->16
D2-->D3
D2-->16
D2-->45
D2-->HK
D2-->IY
D3-->IY
D4-->CO
D4-->CQ
D4-->CV
D4-->GM
D5-->C1
D5-->D3
D5-->16
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
D7-->16
D8-->16
DB-->DD
DB-->DH
DB-->DJ
DB-->DL
DD-->DF
DD-->DH
DD-->DJ
DD-->DL
DD-->HK
DF-->DO
DF-->7A
DF-->HK
DH-->DO
DH-->2C
DH-->3A
DH-->7A
DH-->HK
DJ-->16
DJ-->2C
DJ-->3A
DJ-->7A
DJ-->HK
DJ-->IY
DL-->16
DL-->3A
DL-->7A
DL-->HK
DL-->IY
DM-->DB
DM-->DN
DN-->DD
DO-->7A
DO-->HK
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
DT-->16
DT-->25
DT-->HK
DT-->IY
DV-->16
DV-->25
DV-->GM
DV-->HK
DX-->EB
DX-->HK
DZ-->16
DZ-->25
DZ-->GM
DZ-->HK
DZ-->IY
E1-->EC
E1-->EG
E1-->DT
E1-->DV
E1-->E3
E1-->E5
E1-->E7
E1-->25
E1-->3A
E1-->HK
E3-->ED
E3-->16
E3-->3A
E3-->HK
E3-->JG
E5-->16
E5-->3A
E5-->HK
E5-->IY
E7-->EE
E7-->16
E7-->25
E7-->3A
E7-->GM
E7-->HK
E9-->EB
E9-->EG
E9-->DX
E9-->E3
E9-->16
E9-->HK
EA-->DR
EA-->EB
EA-->EC
EA-->ED
EA-->EE
EA-->EF
EA-->EG
EB-->EC
EB-->ED
EB-->16
EB-->25
EB-->HK
EB-->IY
EC-->25
EC-->HK
EC-->IY
ED-->16
EE-->25
EE-->IY
EF-->E1
EF-->E9
EF-->GM
EG-->16
EG-->25
EG-->3A
EG-->4R
EG-->IY
EI-->HK
EL-->EI
EL-->F0
EL-->EN
EL-->EP
EL-->3A
EL-->45
EL-->HK
EL-->IY
EN-->EI
EN-->HK
EP-->EI
EP-->HK
EQ-->EL
EQ-->EN
EQ-->EP
EQ-->EU
EQ-->EW
ES-->HK
EU-->EL
EU-->EW
EU-->3A
EU-->HK
EW-->EZ
EW-->F0
EW-->ES
EW-->3A
EW-->45
EW-->GM
EW-->HK
EW-->IY
EX-->EQ
EX-->F1
EY-->16
EY-->45
EZ-->HK
F0-->EY
F0-->16
F0-->3A
F0-->45
F0-->4R
F0-->55
F1-->EU
F5-->F
F5-->HK
F6-->FG
F8-->22
F8-->HK
FA-->F5
FA-->F
FA-->HK
FC-->3A
FC-->HK
FC-->IY
FE-->93
FE-->HK
FG-->F8
FG-->FA
FG-->FC
FG-->FE
FG-->FI
FG-->FK
FG-->FM
FG-->HK
FI-->3A
FI-->HK
FI-->IY
FK-->3A
FK-->HK
FK-->IY
FM-->3A
FM-->4W
FM-->HK
FN-->F6
FN-->FO
FO-->FG
FQ-->16
FT-->16
FT-->3A
FT-->51
FT-->HK
FT-->IY
FV-->FQ
FW-->FY
FW-->G2
FW-->G4
FW-->G8
FW-->GA
FY-->FQ
FY-->M
FY-->3A
FY-->HK
G0-->FQ
G0-->GD
G0-->FV
G0-->HK
G0-->IY
G2-->FQ
G2-->FT
G2-->M
G2-->16
G2-->3A
G2-->51
G2-->7A
G2-->HK
G2-->IY
G4-->FQ
G4-->GC
G4-->M
G4-->3A
G4-->HK
G4-->IY
G6-->FQ
G6-->GD
G6-->FV
G6-->HK
G6-->IY
G8-->FQ
G8-->GC
G8-->GD
G8-->GF
G8-->FY
G8-->G0
G8-->G2
G8-->G4
G8-->G6
G8-->GA
G8-->M
G8-->16
G8-->3A
G8-->55
G8-->7A
G8-->HK
G8-->IY
GA-->3A
GA-->55
GA-->HK
GA-->IY
GB-->GE
GC-->16
GC-->55
GD-->16
GD-->IY
GE-->G8
GF-->16
GM-->GI
GM-->GJ
GM-->GL
GM-->GN
GM-->GO
GO-->IY
GR-->GX
GR-->HB
GR-->HD
GR-->HM
GR-->IE
GR-->16
GR-->IY
GT-->IY
GV-->IY
GX-->IY
GZ-->IY
H1-->GX
H1-->HO
H1-->HS
H1-->IE
H3-->IY
H5-->GX
H5-->H9
H5-->IY
H7-->IY
H9-->IY
HB-->HF
HB-->IE
HD-->IY
HF-->IY
HJ-->GX
HJ-->HQ
HK-->GR
HK-->GT
HK-->GV
HK-->GX
HK-->GZ
HK-->H1
HK-->H3
HK-->H5
HK-->H7
HK-->H9
HK-->HB
HK-->HD
HK-->HF
HK-->HH
HK-->HJ
HK-->HM
HK-->HO
HK-->HQ
HK-->HS
HK-->HU
HK-->HW
HK-->HY
HK-->I0
HK-->I2
HK-->I4
HK-->I6
HK-->I8
HK-->IA
HK-->IC
HK-->IE
HM-->IY
HO-->IY
HQ-->HF
HS-->IY
HU-->HF
HU-->IE
HW-->GX
HW-->HF
HW-->IE
HW-->IY
HY-->IY
I0-->IY
I2-->GX
I2-->3A
I4-->GR
I4-->GX
I4-->HF
I4-->HY
I4-->IE
I4-->16
I4-->IY
I6-->IY
I8-->I0
I8-->IE
I8-->IY
IA-->IY
IC-->IY
IE-->IY
IG-->IP
IK-->IU
IN-->IU
IO-->IP
IP-->IU
IT-->IU
IU-->11
IY-->IG
IY-->IH
IY-->II
IY-->IJ
IY-->IK
IY-->IL
IY-->IM
IY-->IN
IY-->IP
IY-->IO
IY-->IQ
IY-->IR
IY-->IS
IY-->IU
IY-->IV
IY-->IW
IY-->IX
IY-->IZ
IY-->J0
IY-->J1
IY-->J2
IY-->J3
IY-->J4
IY-->J5
IY-->J6
IY-->J7
IY-->J8
IY-->J9
IY-->JA
IY-->JB
IY-->JC
IY-->JH
IY-->JI
J2-->IU
J5-->IN
J5-->J6
J6-->IN
J9-->IK
```
