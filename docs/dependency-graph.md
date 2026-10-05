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
- 477 leaf nodes, 1477 edges.
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
end
subgraph 1G["import"]
1H["account-detection.ts"]
1I["csv-import.service.ts"]
1J["csv-parse.ts"]
1K["csv-parse.worker.ts"]
1L["csv-row-mapper.ts"]
1M["csv-worker.types.ts"]
1N["delimiter-guess.ts"]
1O["import.service.ts"]
1P["index.ts"]
end
subgraph 1Q["layout"]
subgraph 1R["app-shell"]
1S["app-shell.component.ts"]
end
1T["app-title.strategy.ts"]
subgraph 1U["backup-reminder"]
1V["backup-reminder.component.ts"]
end
subgraph 1W["default-password-notice"]
1X["default-password-notice.component.ts"]
end
1Y["index.ts"]
end
subgraph 1Z["links"]
20["external-links.ts"]
21["index.ts"]
end
subgraph 22["loans"]
23["amortization.ts"]
24["index.ts"]
25["loan-progress.ts"]
26["what-if.ts"]
end
subgraph 27["ml"]
28["category-model.worker.ts"]
29["category-model.worker.types.ts"]
2A["feature-hashing.ts"]
2B["index.ts"]
2C["model-config.ts"]
2D["rule-proposal-mining.ts"]
2E["training-window.ts"]
end
subgraph 2F["onboarding"]
2G["backup-reminder.service.ts"]
2H["home-redirect.guard.ts"]
2I["index.ts"]
2J["mark-visited.guard.ts"]
2K["visited.service.ts"]
end
subgraph 2L["qr-sync"]
2M["index.ts"]
2N["qr-camera-scanner.ts"]
2O["qr-code-renderer.ts"]
2P["qr-frames.ts"]
2Q["qr-payload-codec.ts"]
2R["qr-sync.service.ts"]
2S["qr-transfer-payload.ts"]
end
subgraph 2T["server-status"]
2U["index.ts"]
2V["server-status.interceptor.ts"]
2W["server-status.service.ts"]
subgraph 2X["server-unreachable"]
2Y["server-unreachable.component.ts"]
end
2Z["transport-failure.ts"]
end
subgraph 30["state"]
31["accounts.store.ts"]
32["app-settings.store.ts"]
33["categories.store.ts"]
34["chart-options-control.ts"]
35["chart-options.store.ts"]
36["forecast-settings.store.ts"]
37["goals.store.ts"]
38["import-batches.store.ts"]
39["index.ts"]
3A["page-range-control.ts"]
3B["range-state.store.ts"]
3C["transactions.store.ts"]
3D["transfer-settings.store.ts"]
3E["transfers.store.ts"]
end
subgraph 3F["stats"]
3G["account-balance-history.ts"]
3H["account-balance-trend.ts"]
3I["annual-lump-sum-smoothing.ts"]
3J["category-breakdown.ts"]
3K["category-composition-trend.ts"]
3L["category-cycle-heatmap.ts"]
3M["category-expense-transactions.ts"]
3N["category-kind-contribution.ts"]
3O["category-period-comparison.ts"]
3P["chart-zoom-window.ts"]
3Q["classify-for-stats.ts"]
3R["classify-joint-leg.ts"]
3S["day-transactions.ts"]
3T["embedded-bonus-smoothing.ts"]
3U["full-history-range.ts"]
3V["goal-affordability.ts"]
3W["granularity-for-span.ts"]
3X["gross-net-growth.ts"]
3Y["gross-net-ratio.ts"]
3Z["income-category-series.ts"]
40["income-events.ts"]
41["income-gap-detection.ts"]
42["income-growth.ts"]
43["income-step-change-detection.ts"]
44["index.ts"]
45["joint-account-stake.ts"]
46["joint-contributor-breakdown.ts"]
47["money-flow-graph.ts"]
48["multi-year-income-comparison.ts"]
49["net-margin.ts"]
4A["net-worth-projection.ts"]
4B["period-stats.ts"]
4C["period-window.ts"]
4D["periodized-rate.ts"]
4E["recurring-payments.ts"]
4F["recurring-projection.ts"]
4G["required-saving-rate.ts"]
4H["saving-velocity.ts"]
4I["spending-mosaic.ts"]
4J["top-transactions.ts"]
4K["wage-change-detection.ts"]
4L["weekday-weekend-split.ts"]
4M["year-over-year.ts"]
4N["yearly-income-summary.ts"]
end
subgraph 4O["store-reset"]
4P["index.ts"]
4Q["store-reset.service.ts"]
4R["with-hydration.ts"]
end
subgraph 4S["theme"]
4T["accent-colors.ts"]
4U["index.ts"]
4V["theme-styles.ts"]
4W["theme.service.ts"]
end
subgraph 4X["transactions"]
4Y["attribution-override.ts"]
4Z["index.ts"]
50["nullify-transaction.ts"]
51["transaction-deletion.service.ts"]
end
subgraph 52["transfers"]
53["index.ts"]
54["transfer-cleanup-result.ts"]
55["transfer-linking.service.ts"]
56["transfer-matching.service.ts"]
57["transfer-matching.ts"]
end
end
subgraph 58["feature-accounts"]
59["account-card-vm.ts"]
5A["account-icons.ts"]
5B["account-list-order.ts"]
5C["account-types.ts"]
5D["accounts.routes.ts"]
5E["balance-day-tooltip.ts"]
5F["balance-trend-signals.ts"]
subgraph 5G["components"]
subgraph 5H["account-balance-block"]
5I["account-balance-block.component.ts"]
end
subgraph 5J["account-balance-chart"]
5K["account-balance-chart.component.ts"]
end
subgraph 5L["account-balance-history-chart"]
5M["account-balance-history-chart.component.ts"]
end
subgraph 5N["account-card"]
5O["account-card.component.ts"]
end
subgraph 5P["account-form"]
5Q["account-form.component.ts"]
end
subgraph 5R["accounts-detail"]
5S["accounts-detail.component.ts"]
end
subgraph 5T["accounts-overview"]
5U["accounts-overview.component.ts"]
end
5V["index.ts"]
end
5W["index.ts"]
5X["last-import-status.ts"]
end
subgraph 5Y["feature-auth"]
5Z["admin-user-row.ts"]
60["admin-users.store.ts"]
61["admin.routes.ts"]
62["auth.routes.ts"]
subgraph 63["components"]
subgraph 64["admin-create-account-dialog"]
65["admin-create-account-dialog.component.ts"]
end
subgraph 66["admin-reset-password-dialog"]
67["admin-reset-password-dialog.component.ts"]
end
subgraph 68["admin-user-actions"]
69["admin-user-actions.component.ts"]
end
subgraph 6A["admin-users-page"]
6B["admin-users-page.component.ts"]
end
6C["index.ts"]
subgraph 6D["login-page"]
6E["login-page.component.ts"]
end
end
6F["index.ts"]
end
subgraph 6G["feature-categories"]
6H["categories.routes.ts"]
6I["category-icons.ts"]
6J["category-model.service.ts"]
6K["category-model.store.ts"]
6L["category-row-vm.ts"]
subgraph 6M["components"]
subgraph 6N["categories-overview"]
6O["categories-overview.component.ts"]
end
subgraph 6P["category-form"]
6Q["category-form.component.ts"]
end
6R["index.ts"]
subgraph 6S["rule-condition-row"]
6T["rule-condition-row.component.ts"]
end
subgraph 6U["rule-filters"]
6V["rule-filters.component.ts"]
end
subgraph 6W["rule-form"]
6X["rule-form.component.ts"]
end
subgraph 6Y["rule-share-bar"]
6Z["rule-share-bar.component.ts"]
end
subgraph 70["rules-overview"]
71["rules-overview.component.ts"]
end
end
72["index.ts"]
73["rule-condition-editor.ts"]
74["rule-filters.ts"]
75["rule-labels.ts"]
76["rule-share.ts"]
77["rule-summary.ts"]
78["rules.store.ts"]
end
subgraph 79["feature-changelog"]
7A["changelog.routes.ts"]
subgraph 7B["components"]
subgraph 7C["changelog-entry-row"]
7D["changelog-entry-row.component.ts"]
end
subgraph 7E["changelog-page"]
7F["changelog-page.component.ts"]
end
7G["index.ts"]
end
subgraph 7H["data"]
7I["changelog-entries.ts"]
7J["roadmap-entries.ts"]
end
7K["group-changelog-entries.ts"]
7L["group-roadmap-entries.ts"]
7M["index.ts"]
end
subgraph 7N["feature-dashboard"]
7O["category-comparison-settings.store.ts"]
7P["category-comparison-vm.ts"]
subgraph 7Q["components"]
subgraph 7R["account-balance-strip"]
7S["account-balance-strip.component.ts"]
end
subgraph 7T["action-queue-panel"]
7U["action-queue-panel.component.ts"]
end
subgraph 7V["category-breakdown-panel"]
7W["category-breakdown-panel.component.ts"]
end
subgraph 7X["category-comparison-panel"]
7Y["category-comparison-panel.component.ts"]
end
subgraph 7Z["category-exclusion-dropdown"]
80["category-exclusion-dropdown.component.ts"]
end
subgraph 81["comparison-category-card"]
82["comparison-category-card.component.ts"]
end
subgraph 83["dashboard-customize-panel"]
84["dashboard-customize-panel.component.ts"]
end
subgraph 85["dashboard-overview"]
86["dashboard-overview.component.ts"]
end
87["index.ts"]
subgraph 88["spending-heatmap-panel"]
89["spending-heatmap-panel.component.ts"]
end
subgraph 8A["top-transactions-panel"]
8B["top-transactions-panel.component.ts"]
end
subgraph 8C["trend-chart-panel"]
8D["trend-chart-panel.component.ts"]
end
subgraph 8E["weekday-weekend-split-panel"]
8F["weekday-weekend-split-panel.component.ts"]
end
end
8G["dashboard-layout-settings.store.ts"]
8H["dashboard-row-order.ts"]
8I["dashboard.routes.ts"]
8J["index.ts"]
8K["stats.store.ts"]
end
subgraph 8L["feature-data-management"]
subgraph 8M["components"]
subgraph 8N["data-management-overview"]
8O["data-management-overview.component.ts"]
end
8P["index.ts"]
subgraph 8Q["qr-receive-dialog"]
8R["qr-receive-dialog.component.ts"]
end
subgraph 8S["qr-send-dialog"]
8T["qr-send-dialog.component.ts"]
end
end
8U["index.ts"]
end
subgraph 8V["feature-explore"]
subgraph 8W["components"]
subgraph 8X["explore-overview"]
8Y["explore-overview.component.ts"]
end
8Z["index.ts"]
subgraph 90["money-flow-panel"]
91["money-flow-panel.component.ts"]
end
subgraph 92["spending-mosaic-panel"]
93["spending-mosaic-panel.component.ts"]
end
end
94["explore.routes.ts"]
95["index.ts"]
end
subgraph 96["feature-future"]
subgraph 97["components"]
subgraph 98["forecast-controls"]
99["forecast-controls.component.ts"]
end
subgraph 9A["forecast-notice"]
9B["forecast-notice.component.ts"]
end
subgraph 9C["future-overview"]
9D["future-overview.component.ts"]
end
subgraph 9E["goal-form"]
9F["goal-form.component.ts"]
end
subgraph 9G["goal-row"]
9H["goal-row.component.ts"]
end
subgraph 9I["goals-panel"]
9J["goals-panel.component.ts"]
end
9K["index.ts"]
subgraph 9L["net-worth-projection-chart"]
9M["net-worth-projection-chart.component.ts"]
end
subgraph 9N["projection-figure-table"]
9O["projection-figure-table.component.ts"]
end
end
9P["forecast-chart-copy.ts"]
9Q["forecast-controls-vm.ts"]
9R["forecast-notices.ts"]
9S["forecast.store.ts"]
9T["future.routes.ts"]
9U["goal-row-vm.ts"]
9V["index.ts"]
9W["net-worth-projection-chart-option.ts"]
9X["projection-accessible-row.ts"]
end
subgraph 9Y["feature-help"]
subgraph 9Z["components"]
subgraph A0["faq-page"]
A1["faq-page.component.ts"]
end
subgraph A2["guide-detail"]
A3["guide-detail.component.ts"]
end
subgraph A4["guide-steps"]
A5["guide-steps.component.ts"]
end
subgraph A6["guides-index"]
A7["guides-index.component.ts"]
end
A8["index.ts"]
end
subgraph A9["data"]
AA["faq.ts"]
AB["guides.ts"]
end
AC["help.routes.ts"]
AD["index.ts"]
end
subgraph AE["feature-home"]
subgraph AF["components"]
subgraph AG["home-landing"]
AH["home-landing.component.ts"]
end
AI["index.ts"]
end
AJ["home.routes.ts"]
AK["index.ts"]
end
subgraph AL["feature-import"]
AM["column-mapping.ts"]
subgraph AN["components"]
subgraph AO["account-draft-editor"]
AP["account-draft-editor.component.ts"]
end
subgraph AQ["batch-wait-card"]
AR["batch-wait-card.component.ts"]
end
subgraph AS["column-map-amount-field"]
AT["column-map-amount-field.component.ts"]
end
subgraph AU["column-map-counterparty-field"]
AV["column-map-counterparty-field.component.ts"]
end
subgraph AW["column-map-sample-caption"]
AX["column-map-sample-caption.component.ts"]
end
subgraph AY["column-map-simple-field"]
AZ["column-map-simple-field.component.ts"]
end
subgraph B0["column-map-stepper"]
B1["column-map-stepper.component.ts"]
end
subgraph B2["column-map-summary-step"]
B3["column-map-summary-step.component.ts"]
end
subgraph B4["import-history"]
B5["import-history.component.ts"]
end
subgraph B6["import-map-step"]
B7["import-map-step.component.ts"]
end
subgraph B8["import-preview-step"]
B9["import-preview-step.component.ts"]
end
subgraph BA["import-select-step"]
BB["import-select-step.component.ts"]
end
subgraph BC["import-summary-step"]
BD["import-summary-step.component.ts"]
end
subgraph BE["import-wizard"]
BF["import-wizard.component.ts"]
end
BG["index.ts"]
subgraph BH["queued-file-row"]
BI["queued-file-row.component.ts"]
end
end
BJ["duplicate-scan.ts"]
BK["import-history-rows.ts"]
BL["import-queue.ts"]
BM["import-wizard-session.ts"]
BN["import.routes.ts"]
BO["index.ts"]
BP["mapper-steps.ts"]
BQ["mapping-profiles.store.ts"]
end
subgraph BR["feature-income"]
BS["career-start-date.ts"]
subgraph BT["components"]
subgraph BU["income-career-start"]
BV["income-career-start.component.ts"]
end
subgraph BW["income-category-checklist"]
BX["income-category-checklist.component.ts"]
end
subgraph BY["income-chart-cell"]
BZ["income-chart-cell.component.ts"]
end
subgraph C0["income-events-sidebar"]
C1["income-events-sidebar.component.ts"]
end
subgraph C2["income-gross-color"]
C3["income-gross-color.component.ts"]
end
subgraph C4["income-gross-net-section"]
C5["income-gross-net-section.component.ts"]
end
subgraph C6["income-growth-panel"]
C7["income-growth-panel.component.ts"]
end
subgraph C8["income-inference-note"]
C9["income-inference-note.component.ts"]
end
subgraph CA["income-lump-sum-checklist"]
CB["income-lump-sum-checklist.component.ts"]
end
subgraph CC["income-main-category"]
CD["income-main-category.component.ts"]
end
subgraph CE["income-overview"]
CF["income-overview.component.ts"]
end
subgraph CG["income-settings-page"]
CH["income-settings-page.component.ts"]
end
subgraph CI["income-yearly-panel"]
CJ["income-yearly-panel.component.ts"]
end
CK["index.ts"]
subgraph CL["salary-details-page"]
CM["salary-details-page.component.ts"]
end
subgraph CN["salary-metadata-table"]
CO["salary-metadata-table.component.ts"]
end
subgraph CP["salary-month-modal"]
CQ["salary-month-modal.component.ts"]
end
end
CR["gross-net-chart-options.ts"]
CS["income-category-vm.ts"]
CT["income-event-vm.ts"]
CU["income-granularity.ts"]
CV["income.routes.ts"]
CW["income.store.ts"]
CX["index.ts"]
CY["salary-metadata-edit.ts"]
CZ["salary-metadata-rows.ts"]
end
subgraph D0["feature-learning"]
subgraph D1["components"]
D2["index.ts"]
subgraph D3["learning-overview"]
D4["learning-overview.component.ts"]
end
subgraph D5["model-status-badge"]
D6["model-status-badge.component.ts"]
end
subgraph D7["model-status"]
D8["model-status.component.ts"]
end
subgraph D9["rule-proposals"]
DA["rule-proposals.component.ts"]
end
subgraph DB["suggestions-table"]
DC["suggestions-table.component.ts"]
end
end
DD["index.ts"]
DE["learning.routes.ts"]
DF["model-status-display.ts"]
end
subgraph DG["feature-loans"]
subgraph DH["components"]
DI["index.ts"]
subgraph DJ["loan-amortization-table"]
DK["loan-amortization-table.component.ts"]
end
subgraph DL["loan-balance-chart"]
DM["loan-balance-chart.component.ts"]
end
subgraph DN["loan-card"]
DO["loan-card.component.ts"]
end
subgraph DP["loan-composition-chart"]
DQ["loan-composition-chart.component.ts"]
end
subgraph DR["loan-detail"]
DS["loan-detail.component.ts"]
end
subgraph DT["loan-form"]
DU["loan-form.component.ts"]
end
subgraph DV["loan-payments-list"]
DW["loan-payments-list.component.ts"]
end
subgraph DX["loan-what-if"]
DY["loan-what-if.component.ts"]
end
subgraph DZ["loans-overview"]
E0["loans-overview.component.ts"]
end
end
E1["index.ts"]
E2["loan-card-vm.ts"]
E3["loan-schedule-status.ts"]
E4["loan-types.ts"]
E5["loan-what-if-vm.ts"]
E6["loans.routes.ts"]
E7["loans.store.ts"]
end
subgraph E8["feature-recurring"]
E9["bills-calendar-vm.ts"]
subgraph EA["components"]
subgraph EB["bills-calendar"]
EC["bills-calendar.component.ts"]
end
subgraph ED["bills-day-list"]
EE["bills-day-list.component.ts"]
end
subgraph EF["bills-month-grid"]
EG["bills-month-grid.component.ts"]
end
EH["index.ts"]
subgraph EI["recurring-dismissed-list"]
EJ["recurring-dismissed-list.component.ts"]
end
subgraph EK["recurring-overview"]
EL["recurring-overview.component.ts"]
end
subgraph EM["recurring-payments-panel"]
EN["recurring-payments-panel.component.ts"]
end
end
EO["index.ts"]
EP["recurring-overrides.ts"]
EQ["recurring-payments-row-vm.ts"]
ER["recurring-series.store.ts"]
ES["recurring.routes.ts"]
end
subgraph ET["feature-settings"]
subgraph EU["components"]
subgraph EV["account-password-form"]
EW["account-password-form.component.ts"]
end
EX["index.ts"]
subgraph EY["settings-about-section"]
EZ["settings-about-section.component.ts"]
end
subgraph F0["settings-account-section"]
F1["settings-account-section.component.ts"]
end
subgraph F2["settings-currency-locale-section"]
F3["settings-currency-locale-section.component.ts"]
end
subgraph F4["settings-data-section"]
F5["settings-data-section.component.ts"]
end
subgraph F6["settings-overview"]
F7["settings-overview.component.ts"]
end
subgraph F8["settings-privacy-section"]
F9["settings-privacy-section.component.ts"]
end
subgraph FA["settings-reporting-section"]
FB["settings-reporting-section.component.ts"]
end
subgraph FC["settings-theme-section"]
FD["settings-theme-section.component.ts"]
end
end
FE["index.ts"]
FF["settings.routes.ts"]
end
subgraph FG["feature-transactions"]
FH["category-picker.ts"]
subgraph FI["components"]
subgraph FJ["attribution-override-fieldset"]
FK["attribution-override-fieldset.component.ts"]
end
subgraph FL["category-select-cell"]
FM["category-select-cell.component.ts"]
end
FN["index.ts"]
subgraph FO["transaction-bulk-bar"]
FP["transaction-bulk-bar.component.ts"]
end
subgraph FQ["transaction-card"]
FR["transaction-card.component.ts"]
end
subgraph FS["transaction-edit-form"]
FT["transaction-edit-form.component.ts"]
end
subgraph FU["transaction-filters"]
FV["transaction-filters.component.ts"]
end
subgraph FW["transaction-row"]
FX["transaction-row.component.ts"]
end
subgraph FY["transactions-overview"]
FZ["transactions-overview.component.ts"]
end
subgraph G0["transfer-review"]
G1["transfer-review.component.ts"]
end
end
G2["index.ts"]
G3["transaction-filters.ts"]
G4["transaction-row-vm.ts"]
G5["transactions.routes.ts"]
G6["transfer-label.ts"]
end
subgraph G7["shared"]
subgraph G8["echarts"]
G9["bucketed-axis-option.ts"]
GA["chart-theme.ts"]
GB["echarts-jsdom.testing.ts"]
GC["echarts-setup.ts"]
GD["index.ts"]
GE["legend-option.ts"]
GF["tooltip-formatter.ts"]
end
subgraph GG["ui"]
subgraph GH["absolute-range-panel"]
GI["absolute-range-panel.component.ts"]
end
subgraph GJ["alert"]
GK["alert.component.ts"]
end
subgraph GL["badge"]
GM["badge.component.ts"]
end
subgraph GN["button"]
GO["button.component.ts"]
end
subgraph GP["collapse"]
GQ["collapse.component.ts"]
end
subgraph GR["confirm-dialog"]
GS["confirm-dialog.component.ts"]
end
subgraph GT["cycle-picker"]
GU["cycle-picker.component.ts"]
end
subgraph GV["date-range-input"]
GW["date-range-input.component.ts"]
end
subgraph GX["divider"]
GY["divider.component.ts"]
end
subgraph GZ["dropdown"]
H0["dropdown.component.ts"]
end
subgraph H1["empty-state"]
H2["empty-state.component.ts"]
end
subgraph H3["fieldset"]
H4["fieldset.component.ts"]
end
subgraph H5["flex"]
H6["flex.component.ts"]
end
subgraph H7["granularity-picker"]
H8["granularity-picker.component.ts"]
end
subgraph H9["hydration-boundary"]
HA["hydration-boundary.component.ts"]
end
HB["index.ts"]
subgraph HC["input"]
HD["input.component.ts"]
end
subgraph HE["label"]
HF["label.component.ts"]
end
subgraph HG["loading-skeleton"]
HH["loading-skeleton.component.ts"]
end
subgraph HI["modal"]
HJ["mm-modal.component.ts"]
end
subgraph HK["page-header"]
HL["page-header.component.ts"]
end
subgraph HM["paginator"]
HN["paginator.component.ts"]
end
subgraph HO["paper"]
HP["paper.component.ts"]
end
subgraph HQ["privacy-blur"]
HR["privacy-blur.component.ts"]
end
subgraph HS["privacy-toggle"]
HT["privacy-toggle.component.ts"]
end
subgraph HU["range-picker"]
HV["range-picker.component.ts"]
end
subgraph HW["select"]
HX["select.component.ts"]
end
subgraph HY["stat-card"]
HZ["stat-card.component.ts"]
end
subgraph I0["table"]
I1["table.component.ts"]
end
subgraph I2["tabs"]
I3["tabs.component.ts"]
end
subgraph I4["typography"]
I5["typography.component.ts"]
end
end
subgraph I6["utils"]
I7["calendar-cycles.ts"]
I8["compact-viewport.ts"]
I9["confidence-color.ts"]
IA["confirm-state.ts"]
IB["currency-format.ts"]
IC["currency-symbol-presets.ts"]
ID["daisy-classes.ts"]
IE["date-buckets.ts"]
IF["date-format.pipe.ts"]
IG["date-format.ts"]
IH["debounced-text.ts"]
II["download-json.ts"]
IJ["fingerprint.ts"]
IK["format-settings.testing.ts"]
IL["format-settings.ts"]
IM["hidden-amount.ts"]
IN["hydration-status.ts"]
IO["iban.ts"]
IP["index.ts"]
IQ["link-control-to-setting.ts"]
IR["locale-presets.ts"]
IS["money-color.ts"]
IT["number-format.ts"]
IU["pagination.ts"]
IV["percentage.ts"]
IW["quick-ranges.ts"]
IX["range-expression.ts"]
IY["search-params.ts"]
IZ["selection-model.ts"]
J0["signed-amount.pipe.ts"]
J1["sortable.ts"]
J2["structural-filters.ts"]
J3["theme-hooks.ts"]
J4["unrendered-markup.testing.ts"]
subgraph J5["validators"]
J6["iban.validator.ts"]
J7["percentage.validator.ts"]
end
J8["with-archivable.ts"]
J9["with-persisted-crud.ts"]
end
end
end
end
4-->16
5-->4
5-->6
6-->16
6-->IP
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
H-->2U
H-->4P
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
S-->2U
T-->S
T-->11
T-->1C
T-->4U
T-->IP
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
13-->44
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
1H-->16
1H-->IP
1I-->1M
1I-->16
1J-->1L
1J-->1M
1K-->1J
1K-->1M
1L-->16
1M-->1L
1M-->16
1O-->1L
1O-->16
1O-->IP
1P-->1H
1P-->1I
1P-->1J
1P-->1L
1P-->1M
1P-->1N
1P-->1O
1S-->1V
1S-->1X
1S-->F
1S-->2U
1S-->39
1S-->GK
1S-->GO
1S-->I5
1V-->2I
1V-->39
1V-->GK
1V-->GO
1V-->I5
1X-->F
1X-->GK
1X-->GO
1X-->I5
1Y-->1S
21-->20
23-->IP
24-->23
24-->25
24-->26
25-->23
25-->16
25-->IP
26-->23
26-->25
26-->16
28-->29
28-->2A
28-->2C
29-->2C
2A-->2C
2B-->29
2B-->2A
2B-->2C
2B-->2D
2B-->2E
2C-->11
2D-->M
2D-->16
2H-->2K
2I-->2G
2I-->2H
2I-->2J
2I-->2K
2J-->2K
2M-->2N
2M-->2O
2M-->2P
2M-->2Q
2M-->2R
2M-->2S
2R-->2P
2R-->2Q
2R-->2S
2R-->16
2S-->16
2U-->2V
2U-->2W
2U-->2Y
2U-->2Z
2V-->B
2V-->2W
2V-->2Z
2W-->2Z
31-->33
31-->3C
31-->3E
31-->5
31-->16
31-->44
31-->4P
31-->53
31-->IP
32-->16
32-->4P
32-->4U
32-->IP
33-->3C
33-->16
33-->4P
33-->IP
34-->35
34-->44
34-->GD
34-->IP
35-->44
35-->GD
35-->IP
36-->16
36-->44
36-->4P
37-->16
37-->4P
37-->IP
38-->3C
38-->3E
38-->M
38-->16
38-->1P
38-->4P
39-->31
39-->32
39-->33
39-->34
39-->35
39-->36
39-->37
39-->38
39-->3A
39-->3B
39-->3C
39-->3D
39-->3E
3A-->31
3A-->32
3A-->3B
3A-->3C
3A-->16
3A-->44
3A-->IP
3B-->32
3B-->IP
3C-->16
3C-->4P
3C-->4Z
3C-->53
3D-->16
3D-->4P
3E-->3C
3E-->3D
3E-->16
3E-->4P
3E-->53
3G-->16
3G-->IP
3H-->3G
3H-->16
3H-->IP
3I-->3K
3I-->3Z
3I-->IP
3J-->3Q
3J-->16
3K-->3J
3K-->16
3K-->IP
3L-->3J
3L-->3Q
3L-->16
3L-->IP
3M-->3Q
3M-->16
3N-->16
3O-->3J
3O-->4C
3O-->16
3P-->IP
3Q-->3N
3Q-->3R
3Q-->16
3Q-->53
3R-->5
3R-->16
3S-->16
3T-->3K
3T-->3Z
3T-->16
3T-->IP
3U-->16
3V-->16
3V-->IP
3W-->IP
3X-->3Y
3Y-->3Z
3Y-->16
3Z-->3K
3Z-->16
3Z-->IP
40-->41
40-->43
40-->4K
40-->16
41-->3K
41-->3Z
41-->IP
42-->3Z
42-->4M
42-->IP
43-->3K
43-->3T
43-->3Z
43-->IP
44-->3G
44-->3H
44-->3I
44-->3J
44-->3K
44-->3L
44-->3M
44-->3N
44-->3O
44-->3P
44-->3Q
44-->3R
44-->3S
44-->3T
44-->3U
44-->3V
44-->3W
44-->3X
44-->3Y
44-->3Z
44-->40
44-->41
44-->42
44-->43
44-->45
44-->46
44-->47
44-->48
44-->49
44-->4A
44-->4B
44-->4C
44-->4D
44-->4E
44-->4F
44-->4G
44-->4H
44-->4I
44-->4J
44-->4K
44-->4L
44-->4M
44-->4N
45-->3R
45-->16
46-->3R
46-->5
46-->16
47-->16
47-->IP
48-->4N
4A-->IP
4B-->3Q
4B-->16
4C-->IP
4D-->IP
4E-->3Q
4E-->M
4E-->16
4E-->IP
4F-->4E
4F-->IP
4G-->16
4G-->IP
4H-->4B
4H-->16
4H-->11
4H-->IP
4I-->3J
4I-->3M
4I-->16
4J-->16
4J-->53
4K-->3Y
4L-->3Q
4L-->16
4L-->IP
4M-->4B
4M-->16
4N-->3K
4N-->16
4N-->IP
4P-->4Q
4P-->4R
4R-->4Q
4R-->2U
4T-->4V
4T-->11
4U-->4T
4U-->4V
4U-->4W
4W-->4V
4Y-->16
4Z-->4Y
4Z-->50
4Z-->51
50-->16
51-->16
51-->53
53-->54
53-->55
53-->57
53-->56
55-->57
55-->16
56-->55
56-->57
56-->16
57-->6
57-->16
57-->IP
59-->5X
59-->16
5A-->16
5B-->16
5C-->16
5D-->5S
5D-->5U
5D-->GD
5E-->44
5E-->IP
5F-->16
5F-->39
5F-->44
5F-->IP
5I-->HB
5I-->IP
5K-->5E
5K-->5F
5K-->16
5K-->44
5K-->GD
5K-->HB
5K-->IP
5M-->5E
5M-->5F
5M-->16
5M-->39
5M-->44
5M-->GD
5M-->HB
5O-->59
5O-->5A
5O-->5I
5O-->HB
5Q-->5A
5Q-->5C
5Q-->16
5Q-->HB
5Q-->IP
5Q-->J6
5Q-->J7
5S-->5X
5S-->5I
5S-->5K
5S-->5Q
5S-->39
5S-->HB
5S-->IP
5U-->59
5U-->5A
5U-->5B
5U-->5X
5U-->5M
5U-->5O
5U-->5Q
5U-->16
5U-->39
5U-->HB
5U-->IP
5V-->5I
5V-->5K
5V-->5M
5V-->5O
5V-->5Q
5V-->5S
5V-->5U
5W-->5A
5W-->5C
5W-->5D
5W-->5V
5X-->IP
5Z-->F
5Z-->HB
5Z-->IP
60-->F
60-->4P
61-->6B
62-->6E
65-->60
65-->F
65-->HB
67-->5Z
67-->60
67-->HB
69-->5Z
69-->HB
6B-->5Z
6B-->60
6B-->65
6B-->67
6B-->69
6B-->F
6B-->HB
6C-->6E
6E-->F
6E-->GK
6E-->GO
6E-->H4
6E-->HD
6E-->HP
6E-->I5
6F-->61
6F-->62
6F-->6C
6H-->6O
6H-->71
6J-->2B
6K-->6J
6K-->78
6K-->16
6K-->2B
6K-->39
6K-->4P
6L-->16
6L-->HB
6O-->6I
6O-->6L
6O-->6Q
6O-->M
6O-->16
6O-->39
6O-->HB
6O-->IP
6Q-->6I
6Q-->16
6Q-->HB
6R-->6O
6R-->6Q
6R-->6V
6R-->6X
6R-->6Z
6R-->71
6T-->73
6T-->75
6T-->M
6T-->16
6T-->39
6T-->HB
6V-->74
6V-->39
6V-->HB
6V-->IP
6X-->73
6X-->6T
6X-->M
6X-->16
6X-->39
6X-->HB
6Z-->76
6Z-->78
6Z-->HB
6Z-->IP
71-->74
71-->77
71-->78
71-->6V
71-->6X
71-->6Z
71-->16
71-->39
71-->HB
71-->IP
72-->6H
72-->6I
72-->6J
72-->6K
72-->6R
72-->74
72-->77
72-->78
73-->75
73-->16
74-->77
74-->16
75-->16
76-->16
77-->75
77-->16
78-->76
78-->M
78-->16
78-->39
78-->4P
78-->IP
7A-->7F
7D-->HB
7F-->7I
7F-->7J
7F-->7K
7F-->7L
7F-->7D
7F-->HB
7G-->7F
7K-->7I
7L-->7J
7M-->7A
7M-->7G
7O-->16
7O-->4P
7S-->39
7S-->HB
7S-->IP
7U-->39
7U-->53
7U-->HB
7U-->IP
7W-->8K
7W-->39
7W-->44
7W-->GD
7W-->HB
7W-->IP
7Y-->7O
7Y-->7P
7Y-->8K
7Y-->80
7Y-->82
7Y-->39
7Y-->HB
7Y-->IP
80-->39
80-->HB
82-->7P
82-->HB
84-->8G
84-->8H
84-->16
84-->HB
86-->8G
86-->8H
86-->8K
86-->7S
86-->7U
86-->7W
86-->7Y
86-->84
86-->89
86-->8B
86-->8D
86-->8F
86-->39
86-->44
86-->HB
86-->IP
87-->7S
87-->7U
87-->7W
87-->7Y
87-->80
87-->84
87-->86
87-->89
87-->8B
87-->8D
87-->8F
89-->80
89-->39
89-->44
89-->53
89-->GD
89-->HB
89-->IP
8B-->8K
8B-->39
8B-->HB
8B-->IP
8D-->39
8D-->44
8D-->53
8D-->GD
8D-->HB
8D-->IP
8F-->8K
8F-->39
8F-->HB
8F-->IP
8G-->8H
8G-->16
8G-->4P
8H-->16
8I-->86
8I-->GD
8J-->87
8J-->8I
8K-->7O
8K-->39
8K-->44
8K-->53
8O-->8R
8O-->8T
8O-->16
8O-->2M
8O-->HB
8O-->IP
8P-->8O
8R-->2M
8R-->HB
8T-->16
8T-->2M
8T-->HB
8U-->8P
8Y-->91
8Y-->93
8Y-->39
8Y-->HB
8Z-->8Y
8Z-->91
8Z-->93
91-->39
91-->44
91-->GD
91-->HB
91-->IP
93-->16
93-->39
93-->44
93-->53
93-->GD
93-->HB
93-->IP
94-->8Y
94-->GD
95-->8Z
95-->94
99-->9Q
99-->9S
99-->16
99-->39
99-->44
99-->HB
99-->IP
9B-->9R
9B-->HB
9D-->99
9D-->9J
9D-->9M
9D-->HB
9F-->16
9F-->HB
9H-->9U
9H-->HB
9J-->9R
9J-->9S
9J-->9U
9J-->9B
9J-->9F
9J-->9H
9J-->16
9J-->39
9J-->HB
9J-->IP
9K-->99
9K-->9B
9K-->9D
9K-->9F
9K-->9H
9K-->9J
9K-->9M
9K-->9O
9M-->9P
9M-->9S
9M-->9W
9M-->9X
9M-->9O
9M-->39
9M-->HB
9M-->IP
9O-->9X
9P-->16
9Q-->16
9Q-->44
9Q-->HB
9Q-->IP
9R-->9P
9R-->16
9R-->44
9R-->HB
9R-->IP
9S-->16
9S-->39
9S-->44
9S-->53
9T-->9D
9T-->GD
9U-->16
9U-->44
9U-->HB
9U-->IP
9V-->9K
9V-->9P
9V-->9Q
9V-->9R
9V-->9S
9V-->9T
9V-->9U
9V-->9W
9V-->9X
9W-->44
9W-->GD
9W-->IP
A1-->AA
A1-->HB
A3-->AB
A3-->A5
A3-->HB
A5-->AB
A5-->HB
A7-->AB
A7-->HB
A8-->A1
A8-->A3
A8-->A5
A8-->A7
AC-->A1
AC-->A3
AC-->A7
AC-->AB
AD-->A8
AD-->AB
AD-->AC
AH-->21
AH-->HB
AI-->AH
AJ-->AH
AK-->AI
AK-->AJ
AM-->16
AP-->BL
AP-->5W
AP-->HB
AR-->HB
AT-->AX
AT-->HB
AV-->AX
AV-->HB
AX-->HB
AZ-->AM
AZ-->AX
AZ-->HB
B1-->BP
B1-->HB
B3-->AM
B3-->HB
B5-->BK
B5-->1P
B5-->39
B5-->HB
B7-->AM
B7-->BJ
B7-->BP
B7-->BQ
B7-->AT
B7-->AV
B7-->AZ
B7-->B1
B7-->B3
B7-->B9
B7-->16
B7-->1P
B7-->HB
B9-->BJ
B9-->1P
B9-->HB
B9-->IP
BB-->BL
BB-->BQ
BB-->B5
BB-->BI
BB-->16
BB-->1P
BB-->HB
BD-->BK
BD-->16
BD-->1P
BD-->39
BD-->HB
BF-->BM
BF-->AR
BF-->B7
BF-->BB
BF-->BD
BF-->39
BF-->HB
BG-->B7
BG-->B9
BG-->BB
BG-->BD
BG-->BF
BI-->BL
BI-->AP
BI-->16
BI-->HB
BJ-->1P
BJ-->HB
BK-->16
BK-->1P
BK-->IP
BL-->16
BM-->AM
BM-->BJ
BM-->BL
BM-->BQ
BM-->16
BM-->1P
BM-->39
BM-->5W
BN-->BF
BO-->AM
BO-->BG
BO-->BL
BO-->BN
BO-->BP
BO-->BQ
BP-->AM
BQ-->16
BQ-->4P
BS-->44
BV-->BS
BV-->CW
BV-->HB
BV-->IP
BX-->CS
BX-->HB
BZ-->HB
C1-->CT
C1-->CU
C1-->CW
C1-->39
C1-->44
C1-->HB
C3-->CW
C3-->4U
C3-->GD
C3-->HB
C5-->CR
C5-->CW
C5-->BZ
C5-->39
C5-->44
C5-->GD
C5-->HB
C5-->IP
C7-->CU
C7-->CW
C7-->BV
C7-->C9
C7-->39
C7-->44
C7-->HB
C7-->IP
C9-->HB
CB-->CS
CB-->CW
CB-->BX
CD-->CS
CD-->CW
CD-->HB
CF-->CW
CF-->CZ
CF-->C1
CF-->C5
CF-->C7
CF-->C9
CF-->CB
CF-->CD
CF-->CJ
CF-->CQ
CF-->39
CF-->44
CF-->GD
CF-->HB
CF-->IP
CH-->CS
CH-->CW
CH-->BV
CH-->BX
CH-->C3
CH-->CB
CH-->CD
CH-->HB
CJ-->CW
CJ-->39
CJ-->44
CJ-->53
CJ-->GD
CJ-->HB
CJ-->IP
CK-->BV
CK-->BX
CK-->BZ
CK-->C1
CK-->C5
CK-->C7
CK-->CD
CK-->CF
CK-->CH
CK-->CJ
CK-->CM
CK-->CO
CK-->CQ
CM-->CO
CM-->HB
CO-->CU
CO-->CW
CO-->CY
CO-->CZ
CO-->HB
CO-->IP
CQ-->CW
CQ-->CY
CQ-->CZ
CQ-->CO
CQ-->16
CQ-->HB
CR-->44
CR-->GD
CR-->IP
CS-->16
CT-->CU
CT-->16
CT-->44
CT-->HB
CT-->IP
CU-->IP
CV-->CF
CV-->CH
CV-->CM
CV-->GD
CW-->BS
CW-->CU
CW-->16
CW-->39
CW-->44
CW-->4P
CW-->4U
CW-->53
CX-->CK
CX-->CS
CX-->CU
CX-->CV
CX-->CW
CX-->CY
CX-->CZ
CY-->16
CZ-->16
D2-->D4
D2-->D8
D2-->DA
D2-->DC
D4-->D6
D4-->D8
D4-->DA
D4-->DC
D4-->HB
D6-->DF
D6-->72
D6-->HB
D8-->DF
D8-->2B
D8-->39
D8-->72
D8-->HB
DA-->16
DA-->2B
DA-->39
DA-->72
DA-->HB
DA-->IP
DC-->16
DC-->39
DC-->72
DC-->HB
DC-->IP
DD-->D2
DD-->DE
DE-->D4
DF-->72
DF-->HB
DI-->DK
DI-->DM
DI-->DO
DI-->DQ
DI-->DS
DI-->DU
DI-->DW
DI-->DY
DI-->E0
DK-->DQ
DK-->16
DK-->24
DK-->HB
DK-->IP
DM-->16
DM-->24
DM-->GD
DM-->HB
DO-->E2
DO-->HB
DQ-->16
DQ-->24
DQ-->GD
DQ-->HB
DQ-->IP
DS-->E3
DS-->E7
DS-->DK
DS-->DM
DS-->DU
DS-->DW
DS-->DY
DS-->24
DS-->39
DS-->HB
DU-->E4
DU-->16
DU-->39
DU-->HB
DU-->J7
DW-->16
DW-->39
DW-->HB
DW-->IP
DY-->E5
DY-->16
DY-->24
DY-->39
DY-->GD
DY-->HB
E0-->E2
E0-->E7
E0-->DO
E0-->DU
E0-->16
E0-->HB
E1-->DI
E1-->E2
E1-->E3
E1-->E4
E1-->E5
E1-->E6
E1-->E7
E2-->E3
E2-->E4
E2-->16
E2-->24
E2-->HB
E2-->IP
E3-->24
E3-->HB
E3-->IP
E4-->16
E5-->24
E5-->IP
E6-->DS
E6-->E0
E6-->GD
E7-->16
E7-->24
E7-->39
E7-->4P
E7-->IP
E9-->HB
EC-->E9
EC-->ER
EC-->EE
EC-->EG
EC-->39
EC-->44
EC-->HB
EC-->IP
EE-->E9
EE-->HB
EG-->E9
EG-->HB
EH-->EC
EH-->EE
EH-->EG
EH-->EL
EH-->EN
EJ-->HB
EL-->EC
EL-->EN
EL-->39
EL-->HB
EN-->EQ
EN-->ER
EN-->EJ
EN-->39
EN-->44
EN-->GD
EN-->HB
EN-->IP
EO-->EH
EO-->ES
EP-->16
EP-->44
EQ-->HB
ER-->EP
ER-->16
ER-->39
ER-->44
ER-->4P
ER-->53
ES-->EL
EW-->F
EW-->HB
EX-->F7
EZ-->21
EZ-->HB
F1-->EW
F1-->F
F1-->HB
F3-->39
F3-->HB
F3-->IP
F5-->8U
F5-->HB
F7-->EZ
F7-->F1
F7-->F3
F7-->F5
F7-->F9
F7-->FB
F7-->FD
F7-->HB
F9-->39
F9-->HB
F9-->IP
FB-->39
FB-->HB
FB-->IP
FD-->39
FD-->4U
FD-->HB
FE-->EX
FE-->FF
FF-->F7
FH-->16
FK-->16
FK-->39
FK-->4Z
FK-->HB
FK-->IP
FM-->FH
FN-->FP
FN-->FT
FN-->FV
FN-->FZ
FN-->G1
FP-->FH
FP-->M
FP-->39
FP-->HB
FR-->FH
FR-->G4
FR-->FM
FR-->HB
FR-->IP
FT-->FH
FT-->FK
FT-->M
FT-->16
FT-->39
FT-->4Z
FT-->72
FT-->HB
FT-->IP
FV-->FH
FV-->G3
FV-->M
FV-->39
FV-->HB
FV-->IP
FX-->FH
FX-->G4
FX-->FM
FX-->HB
FX-->IP
FZ-->FH
FZ-->G3
FZ-->G4
FZ-->G6
FZ-->FP
FZ-->FR
FZ-->FT
FZ-->FV
FZ-->FX
FZ-->G1
FZ-->M
FZ-->16
FZ-->39
FZ-->53
FZ-->72
FZ-->HB
FZ-->IP
G1-->39
G1-->53
G1-->HB
G1-->IP
G2-->G5
G3-->16
G3-->53
G4-->16
G4-->IP
G5-->FZ
G6-->16
GD-->G9
GD-->GA
GD-->GC
GD-->GE
GD-->GF
GF-->IP
GI-->GO
GI-->H2
GI-->H4
GI-->HD
GI-->I5
GI-->16
GI-->IP
GK-->IP
GM-->IP
GO-->IP
GQ-->IP
GS-->GO
GS-->HF
GS-->HJ
GS-->I5
GU-->IP
GW-->GO
GW-->H0
GW-->IP
GY-->IP
H0-->IP
H2-->H6
H2-->I5
H4-->IP
H6-->IP
HA-->GO
HA-->HH
HB-->GI
HB-->GK
HB-->GM
HB-->GO
HB-->GQ
HB-->GS
HB-->GU
HB-->GW
HB-->GY
HB-->H0
HB-->H2
HB-->H4
HB-->H6
HB-->H8
HB-->HA
HB-->HD
HB-->HF
HB-->HH
HB-->HJ
HB-->HL
HB-->HN
HB-->HP
HB-->HR
HB-->HT
HB-->HV
HB-->HX
HB-->HZ
HB-->I1
HB-->I3
HB-->I5
HD-->IP
HF-->IP
HH-->H6
HJ-->IP
HL-->H6
HL-->I5
HN-->GO
HN-->H6
HN-->I5
HN-->IP
HP-->IP
HR-->IP
HT-->GO
HT-->39
HV-->GI
HV-->GO
HV-->H6
HV-->HP
HV-->I5
HV-->16
HV-->IP
HX-->IP
HZ-->HR
HZ-->I5
HZ-->IP
I1-->IP
I3-->IP
I5-->IP
I7-->IG
IB-->IL
IE-->IL
IF-->IG
IG-->IL
IK-->IL
IL-->11
IP-->I7
IP-->I8
IP-->I9
IP-->IA
IP-->IB
IP-->IC
IP-->ID
IP-->IE
IP-->IG
IP-->IF
IP-->IH
IP-->II
IP-->IJ
IP-->IL
IP-->IM
IP-->IN
IP-->IO
IP-->IQ
IP-->IR
IP-->IS
IP-->IT
IP-->IU
IP-->IV
IP-->IW
IP-->IX
IP-->IY
IP-->IZ
IP-->J0
IP-->J1
IP-->J2
IP-->J3
IP-->J8
IP-->J9
IT-->IL
IW-->IE
IW-->IX
IX-->IE
J0-->IB
```
