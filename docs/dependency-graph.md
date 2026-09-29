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
- 465 leaf nodes, 1431 edges.
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
R["app-db.ts"]
S["app-settings.repository.ts"]
T["categories.repository.ts"]
U["category-comparison-settings.repository.ts"]
V["category-model.repository.ts"]
W["dashboard-layout-settings.repository.ts"]
X["data-management.repository.ts"]
Y["entities.ts"]
Z["forecast-settings.repository.ts"]
10["goals.repository.ts"]
11["import-batches.repository.ts"]
12["index.ts"]
13["loans.repository.ts"]
14["mapping-profiles.repository.ts"]
15["recurring-overrides.repository.ts"]
16["rules.repository.ts"]
17["salary-metadata.repository.ts"]
18["seed-data.ts"]
19["transactions.repository.ts"]
1A["transfer-settings.repository.ts"]
1B["transfers.repository.ts"]
end
subgraph 1C["import"]
1D["account-detection.ts"]
1E["csv-import.service.ts"]
1F["csv-parse.ts"]
1G["csv-parse.worker.ts"]
1H["csv-row-mapper.ts"]
1I["csv-worker.types.ts"]
1J["delimiter-guess.ts"]
1K["import.service.ts"]
1L["index.ts"]
end
subgraph 1M["layout"]
subgraph 1N["app-shell"]
1O["app-shell.component.ts"]
end
1P["app-title.strategy.ts"]
subgraph 1Q["default-password-notice"]
1R["default-password-notice.component.ts"]
end
1S["index.ts"]
end
subgraph 1T["links"]
1U["external-links.ts"]
1V["index.ts"]
end
subgraph 1W["loans"]
1X["amortization.ts"]
1Y["index.ts"]
1Z["loan-progress.ts"]
20["what-if.ts"]
end
subgraph 21["ml"]
22["category-model.worker.ts"]
23["category-model.worker.types.ts"]
24["feature-hashing.ts"]
25["index.ts"]
26["model-config.ts"]
27["rule-proposal-mining.ts"]
28["training-window.ts"]
end
subgraph 29["onboarding"]
2A["home-redirect.guard.ts"]
2B["index.ts"]
2C["mark-visited.guard.ts"]
2D["visited.service.ts"]
end
subgraph 2E["qr-sync"]
2F["index.ts"]
2G["qr-camera-scanner.ts"]
2H["qr-code-renderer.ts"]
2I["qr-frames.ts"]
2J["qr-payload-codec.ts"]
2K["qr-sync.service.ts"]
2L["qr-transfer-payload.ts"]
end
subgraph 2M["state"]
2N["accounts.store.ts"]
2O["app-settings.store.ts"]
2P["categories.store.ts"]
2Q["chart-options-control.ts"]
2R["chart-options.store.ts"]
2S["forecast-settings.store.ts"]
2T["goals.store.ts"]
2U["import-batches.store.ts"]
2V["index.ts"]
2W["page-range-control.ts"]
2X["range-state.store.ts"]
2Y["transactions.store.ts"]
2Z["transfer-settings.store.ts"]
30["transfers.store.ts"]
end
subgraph 31["stats"]
32["account-balance-history.ts"]
33["account-balance-trend.ts"]
34["annual-lump-sum-smoothing.ts"]
35["category-breakdown.ts"]
36["category-composition-trend.ts"]
37["category-cycle-heatmap.ts"]
38["category-expense-transactions.ts"]
39["category-kind-contribution.ts"]
3A["category-period-comparison.ts"]
3B["chart-zoom-window.ts"]
3C["classify-for-stats.ts"]
3D["classify-joint-leg.ts"]
3E["day-transactions.ts"]
3F["embedded-bonus-smoothing.ts"]
3G["full-history-range.ts"]
3H["goal-affordability.ts"]
3I["granularity-for-span.ts"]
3J["gross-net-growth.ts"]
3K["gross-net-ratio.ts"]
3L["income-category-series.ts"]
3M["income-events.ts"]
3N["income-gap-detection.ts"]
3O["income-growth.ts"]
3P["income-step-change-detection.ts"]
3Q["index.ts"]
3R["joint-account-stake.ts"]
3S["joint-contributor-breakdown.ts"]
3T["money-flow-graph.ts"]
3U["multi-year-income-comparison.ts"]
3V["net-margin.ts"]
3W["net-worth-projection.ts"]
3X["period-stats.ts"]
3Y["period-window.ts"]
3Z["periodized-rate.ts"]
40["recurring-payments.ts"]
41["recurring-projection.ts"]
42["required-saving-rate.ts"]
43["saving-velocity.ts"]
44["spending-mosaic.ts"]
45["top-transactions.ts"]
46["wage-change-detection.ts"]
47["weekday-weekend-split.ts"]
48["year-over-year.ts"]
49["yearly-income-summary.ts"]
end
subgraph 4A["storage"]
4B["index.ts"]
4C["storage-status.service.ts"]
end
subgraph 4D["store-reset"]
4E["index.ts"]
4F["store-reset.service.ts"]
end
subgraph 4G["theme"]
4H["accent-colors.ts"]
4I["index.ts"]
4J["theme-styles.ts"]
4K["theme.service.ts"]
end
subgraph 4L["transactions"]
4M["attribution-override.ts"]
4N["index.ts"]
4O["nullify-transaction.ts"]
4P["transaction-deletion.service.ts"]
end
subgraph 4Q["transfers"]
4R["index.ts"]
4S["transfer-cleanup.service.ts"]
4T["transfer-linking.service.ts"]
4U["transfer-matching.service.ts"]
4V["transfer-matching.ts"]
end
end
subgraph 4W["feature-accounts"]
4X["account-card-vm.ts"]
4Y["account-icons.ts"]
4Z["account-list-order.ts"]
50["account-types.ts"]
51["accounts.routes.ts"]
52["balance-day-tooltip.ts"]
53["balance-trend-signals.ts"]
subgraph 54["components"]
subgraph 55["account-balance-block"]
56["account-balance-block.component.ts"]
end
subgraph 57["account-balance-chart"]
58["account-balance-chart.component.ts"]
end
subgraph 59["account-balance-history-chart"]
5A["account-balance-history-chart.component.ts"]
end
subgraph 5B["account-card"]
5C["account-card.component.ts"]
end
subgraph 5D["account-form"]
5E["account-form.component.ts"]
end
subgraph 5F["accounts-detail"]
5G["accounts-detail.component.ts"]
end
subgraph 5H["accounts-overview"]
5I["accounts-overview.component.ts"]
end
5J["index.ts"]
end
5K["index.ts"]
5L["last-import-status.ts"]
end
subgraph 5M["feature-auth"]
5N["admin-user-row.ts"]
5O["admin-users.store.ts"]
5P["admin.routes.ts"]
5Q["auth.routes.ts"]
subgraph 5R["components"]
subgraph 5S["admin-create-account-dialog"]
5T["admin-create-account-dialog.component.ts"]
end
subgraph 5U["admin-reset-password-dialog"]
5V["admin-reset-password-dialog.component.ts"]
end
subgraph 5W["admin-user-actions"]
5X["admin-user-actions.component.ts"]
end
subgraph 5Y["admin-users-page"]
5Z["admin-users-page.component.ts"]
end
60["index.ts"]
subgraph 61["login-page"]
62["login-page.component.ts"]
end
end
63["index.ts"]
end
subgraph 64["feature-categories"]
65["categories.routes.ts"]
66["category-icons.ts"]
67["category-model.service.ts"]
68["category-model.store.ts"]
69["category-row-vm.ts"]
subgraph 6A["components"]
subgraph 6B["categories-overview"]
6C["categories-overview.component.ts"]
end
subgraph 6D["category-form"]
6E["category-form.component.ts"]
end
6F["index.ts"]
subgraph 6G["rule-condition-row"]
6H["rule-condition-row.component.ts"]
end
subgraph 6I["rule-filters"]
6J["rule-filters.component.ts"]
end
subgraph 6K["rule-form"]
6L["rule-form.component.ts"]
end
subgraph 6M["rule-share-bar"]
6N["rule-share-bar.component.ts"]
end
subgraph 6O["rules-overview"]
6P["rules-overview.component.ts"]
end
end
6Q["index.ts"]
6R["rule-condition-editor.ts"]
6S["rule-filters.ts"]
6T["rule-labels.ts"]
6U["rule-share.ts"]
6V["rule-summary.ts"]
6W["rules.store.ts"]
end
subgraph 6X["feature-changelog"]
6Y["changelog.routes.ts"]
subgraph 6Z["components"]
subgraph 70["changelog-entry-row"]
71["changelog-entry-row.component.ts"]
end
subgraph 72["changelog-page"]
73["changelog-page.component.ts"]
end
74["index.ts"]
end
subgraph 75["data"]
76["changelog-entries.ts"]
77["roadmap-entries.ts"]
end
78["group-changelog-entries.ts"]
79["group-roadmap-entries.ts"]
7A["index.ts"]
end
subgraph 7B["feature-dashboard"]
7C["category-comparison-settings.store.ts"]
7D["category-comparison-vm.ts"]
subgraph 7E["components"]
subgraph 7F["account-balance-strip"]
7G["account-balance-strip.component.ts"]
end
subgraph 7H["action-queue-panel"]
7I["action-queue-panel.component.ts"]
end
subgraph 7J["category-breakdown-panel"]
7K["category-breakdown-panel.component.ts"]
end
subgraph 7L["category-comparison-panel"]
7M["category-comparison-panel.component.ts"]
end
subgraph 7N["category-exclusion-dropdown"]
7O["category-exclusion-dropdown.component.ts"]
end
subgraph 7P["comparison-category-card"]
7Q["comparison-category-card.component.ts"]
end
subgraph 7R["dashboard-customize-panel"]
7S["dashboard-customize-panel.component.ts"]
end
subgraph 7T["dashboard-overview"]
7U["dashboard-overview.component.ts"]
end
7V["index.ts"]
subgraph 7W["spending-heatmap-panel"]
7X["spending-heatmap-panel.component.ts"]
end
subgraph 7Y["top-transactions-panel"]
7Z["top-transactions-panel.component.ts"]
end
subgraph 80["trend-chart-panel"]
81["trend-chart-panel.component.ts"]
end
subgraph 82["weekday-weekend-split-panel"]
83["weekday-weekend-split-panel.component.ts"]
end
end
84["dashboard-layout-settings.store.ts"]
85["dashboard-row-order.ts"]
86["dashboard.routes.ts"]
87["index.ts"]
88["stats.store.ts"]
end
subgraph 89["feature-data-management"]
subgraph 8A["components"]
subgraph 8B["data-management-overview"]
8C["data-management-overview.component.ts"]
end
8D["index.ts"]
subgraph 8E["qr-receive-dialog"]
8F["qr-receive-dialog.component.ts"]
end
subgraph 8G["qr-send-dialog"]
8H["qr-send-dialog.component.ts"]
end
end
8I["index.ts"]
end
subgraph 8J["feature-explore"]
subgraph 8K["components"]
subgraph 8L["explore-overview"]
8M["explore-overview.component.ts"]
end
8N["index.ts"]
subgraph 8O["money-flow-panel"]
8P["money-flow-panel.component.ts"]
end
subgraph 8Q["spending-mosaic-panel"]
8R["spending-mosaic-panel.component.ts"]
end
end
8S["explore.routes.ts"]
8T["index.ts"]
end
subgraph 8U["feature-future"]
subgraph 8V["components"]
subgraph 8W["forecast-controls"]
8X["forecast-controls.component.ts"]
end
subgraph 8Y["forecast-notice"]
8Z["forecast-notice.component.ts"]
end
subgraph 90["future-overview"]
91["future-overview.component.ts"]
end
subgraph 92["goal-form"]
93["goal-form.component.ts"]
end
subgraph 94["goal-row"]
95["goal-row.component.ts"]
end
subgraph 96["goals-panel"]
97["goals-panel.component.ts"]
end
98["index.ts"]
subgraph 99["net-worth-projection-chart"]
9A["net-worth-projection-chart.component.ts"]
end
subgraph 9B["projection-figure-table"]
9C["projection-figure-table.component.ts"]
end
end
9D["forecast-chart-copy.ts"]
9E["forecast-controls-vm.ts"]
9F["forecast-notices.ts"]
9G["forecast.store.ts"]
9H["future.routes.ts"]
9I["goal-row-vm.ts"]
9J["index.ts"]
9K["net-worth-projection-chart-option.ts"]
9L["projection-accessible-row.ts"]
end
subgraph 9M["feature-help"]
subgraph 9N["components"]
subgraph 9O["faq-page"]
9P["faq-page.component.ts"]
end
subgraph 9Q["guide-detail"]
9R["guide-detail.component.ts"]
end
subgraph 9S["guide-steps"]
9T["guide-steps.component.ts"]
end
subgraph 9U["guides-index"]
9V["guides-index.component.ts"]
end
9W["index.ts"]
end
subgraph 9X["data"]
9Y["faq.ts"]
9Z["guides.ts"]
end
A0["help.routes.ts"]
A1["index.ts"]
end
subgraph A2["feature-home"]
subgraph A3["components"]
subgraph A4["home-landing"]
A5["home-landing.component.ts"]
end
A6["index.ts"]
end
A7["home.routes.ts"]
A8["index.ts"]
end
subgraph A9["feature-import"]
AA["column-mapping.ts"]
subgraph AB["components"]
subgraph AC["account-draft-editor"]
AD["account-draft-editor.component.ts"]
end
subgraph AE["batch-wait-card"]
AF["batch-wait-card.component.ts"]
end
subgraph AG["column-map-amount-field"]
AH["column-map-amount-field.component.ts"]
end
subgraph AI["column-map-counterparty-field"]
AJ["column-map-counterparty-field.component.ts"]
end
subgraph AK["column-map-sample-caption"]
AL["column-map-sample-caption.component.ts"]
end
subgraph AM["column-map-simple-field"]
AN["column-map-simple-field.component.ts"]
end
subgraph AO["column-map-stepper"]
AP["column-map-stepper.component.ts"]
end
subgraph AQ["column-map-summary-step"]
AR["column-map-summary-step.component.ts"]
end
subgraph AS["import-history"]
AT["import-history.component.ts"]
end
subgraph AU["import-map-step"]
AV["import-map-step.component.ts"]
end
subgraph AW["import-preview-step"]
AX["import-preview-step.component.ts"]
end
subgraph AY["import-select-step"]
AZ["import-select-step.component.ts"]
end
subgraph B0["import-summary-step"]
B1["import-summary-step.component.ts"]
end
subgraph B2["import-wizard"]
B3["import-wizard.component.ts"]
end
B4["index.ts"]
subgraph B5["queued-file-row"]
B6["queued-file-row.component.ts"]
end
end
B7["duplicate-scan.ts"]
B8["import-history-rows.ts"]
B9["import-queue.ts"]
BA["import-wizard-session.ts"]
BB["import.routes.ts"]
BC["index.ts"]
BD["mapper-steps.ts"]
BE["mapping-profiles.store.ts"]
end
subgraph BF["feature-income"]
BG["career-start-date.ts"]
subgraph BH["components"]
subgraph BI["income-career-start"]
BJ["income-career-start.component.ts"]
end
subgraph BK["income-category-checklist"]
BL["income-category-checklist.component.ts"]
end
subgraph BM["income-chart-cell"]
BN["income-chart-cell.component.ts"]
end
subgraph BO["income-events-sidebar"]
BP["income-events-sidebar.component.ts"]
end
subgraph BQ["income-gross-color"]
BR["income-gross-color.component.ts"]
end
subgraph BS["income-gross-net-section"]
BT["income-gross-net-section.component.ts"]
end
subgraph BU["income-growth-panel"]
BV["income-growth-panel.component.ts"]
end
subgraph BW["income-inference-note"]
BX["income-inference-note.component.ts"]
end
subgraph BY["income-lump-sum-checklist"]
BZ["income-lump-sum-checklist.component.ts"]
end
subgraph C0["income-main-category"]
C1["income-main-category.component.ts"]
end
subgraph C2["income-overview"]
C3["income-overview.component.ts"]
end
subgraph C4["income-settings-page"]
C5["income-settings-page.component.ts"]
end
subgraph C6["income-yearly-panel"]
C7["income-yearly-panel.component.ts"]
end
C8["index.ts"]
subgraph C9["salary-details-page"]
CA["salary-details-page.component.ts"]
end
subgraph CB["salary-metadata-table"]
CC["salary-metadata-table.component.ts"]
end
subgraph CD["salary-month-modal"]
CE["salary-month-modal.component.ts"]
end
end
CF["gross-net-chart-options.ts"]
CG["income-category-vm.ts"]
CH["income-event-vm.ts"]
CI["income-granularity.ts"]
CJ["income.routes.ts"]
CK["income.store.ts"]
CL["index.ts"]
CM["salary-metadata-edit.ts"]
CN["salary-metadata-rows.ts"]
end
subgraph CO["feature-learning"]
subgraph CP["components"]
CQ["index.ts"]
subgraph CR["learning-overview"]
CS["learning-overview.component.ts"]
end
subgraph CT["model-status-badge"]
CU["model-status-badge.component.ts"]
end
subgraph CV["model-status"]
CW["model-status.component.ts"]
end
subgraph CX["rule-proposals"]
CY["rule-proposals.component.ts"]
end
subgraph CZ["suggestions-table"]
D0["suggestions-table.component.ts"]
end
end
D1["index.ts"]
D2["learning.routes.ts"]
D3["model-status-display.ts"]
end
subgraph D4["feature-loans"]
subgraph D5["components"]
D6["index.ts"]
subgraph D7["loan-amortization-table"]
D8["loan-amortization-table.component.ts"]
end
subgraph D9["loan-balance-chart"]
DA["loan-balance-chart.component.ts"]
end
subgraph DB["loan-card"]
DC["loan-card.component.ts"]
end
subgraph DD["loan-composition-chart"]
DE["loan-composition-chart.component.ts"]
end
subgraph DF["loan-detail"]
DG["loan-detail.component.ts"]
end
subgraph DH["loan-form"]
DI["loan-form.component.ts"]
end
subgraph DJ["loan-payments-list"]
DK["loan-payments-list.component.ts"]
end
subgraph DL["loan-what-if"]
DM["loan-what-if.component.ts"]
end
subgraph DN["loans-overview"]
DO["loans-overview.component.ts"]
end
end
DP["index.ts"]
DQ["loan-card-vm.ts"]
DR["loan-schedule-status.ts"]
DS["loan-types.ts"]
DT["loan-what-if-vm.ts"]
DU["loans.routes.ts"]
DV["loans.store.ts"]
end
subgraph DW["feature-recurring"]
DX["bills-calendar-vm.ts"]
subgraph DY["components"]
subgraph DZ["bills-calendar"]
E0["bills-calendar.component.ts"]
end
subgraph E1["bills-day-list"]
E2["bills-day-list.component.ts"]
end
subgraph E3["bills-month-grid"]
E4["bills-month-grid.component.ts"]
end
E5["index.ts"]
subgraph E6["recurring-dismissed-list"]
E7["recurring-dismissed-list.component.ts"]
end
subgraph E8["recurring-overview"]
E9["recurring-overview.component.ts"]
end
subgraph EA["recurring-payments-panel"]
EB["recurring-payments-panel.component.ts"]
end
end
EC["index.ts"]
ED["recurring-overrides.ts"]
EE["recurring-payments-row-vm.ts"]
EF["recurring-series.store.ts"]
EG["recurring.routes.ts"]
end
subgraph EH["feature-settings"]
subgraph EI["components"]
subgraph EJ["account-password-form"]
EK["account-password-form.component.ts"]
end
EL["index.ts"]
subgraph EM["settings-about-section"]
EN["settings-about-section.component.ts"]
end
subgraph EO["settings-account-section"]
EP["settings-account-section.component.ts"]
end
subgraph EQ["settings-currency-locale-section"]
ER["settings-currency-locale-section.component.ts"]
end
subgraph ES["settings-data-section"]
ET["settings-data-section.component.ts"]
end
subgraph EU["settings-overview"]
EV["settings-overview.component.ts"]
end
subgraph EW["settings-privacy-section"]
EX["settings-privacy-section.component.ts"]
end
subgraph EY["settings-reporting-section"]
EZ["settings-reporting-section.component.ts"]
end
subgraph F0["settings-theme-section"]
F1["settings-theme-section.component.ts"]
end
end
F2["index.ts"]
F3["settings.routes.ts"]
end
subgraph F4["feature-transactions"]
F5["category-picker.ts"]
subgraph F6["components"]
subgraph F7["attribution-override-fieldset"]
F8["attribution-override-fieldset.component.ts"]
end
subgraph F9["category-select-cell"]
FA["category-select-cell.component.ts"]
end
FB["index.ts"]
subgraph FC["transaction-bulk-bar"]
FD["transaction-bulk-bar.component.ts"]
end
subgraph FE["transaction-card"]
FF["transaction-card.component.ts"]
end
subgraph FG["transaction-edit-form"]
FH["transaction-edit-form.component.ts"]
end
subgraph FI["transaction-filters"]
FJ["transaction-filters.component.ts"]
end
subgraph FK["transaction-row"]
FL["transaction-row.component.ts"]
end
subgraph FM["transactions-overview"]
FN["transactions-overview.component.ts"]
end
subgraph FO["transfer-review"]
FP["transfer-review.component.ts"]
end
end
FQ["index.ts"]
FR["transaction-filters.ts"]
FS["transaction-row-vm.ts"]
FT["transactions.routes.ts"]
FU["transfer-label.ts"]
end
subgraph FV["shared"]
subgraph FW["echarts"]
FX["bucketed-axis-option.ts"]
FY["chart-theme.ts"]
FZ["echarts-jsdom.testing.ts"]
G0["echarts-setup.ts"]
G1["index.ts"]
G2["legend-option.ts"]
G3["tooltip-formatter.ts"]
end
subgraph G4["ui"]
subgraph G5["absolute-range-panel"]
G6["absolute-range-panel.component.ts"]
end
subgraph G7["alert"]
G8["alert.component.ts"]
end
subgraph G9["badge"]
GA["badge.component.ts"]
end
subgraph GB["button"]
GC["button.component.ts"]
end
subgraph GD["collapse"]
GE["collapse.component.ts"]
end
subgraph GF["confirm-dialog"]
GG["confirm-dialog.component.ts"]
end
subgraph GH["cycle-picker"]
GI["cycle-picker.component.ts"]
end
subgraph GJ["date-range-input"]
GK["date-range-input.component.ts"]
end
subgraph GL["divider"]
GM["divider.component.ts"]
end
subgraph GN["dropdown"]
GO["dropdown.component.ts"]
end
subgraph GP["empty-state"]
GQ["empty-state.component.ts"]
end
subgraph GR["fieldset"]
GS["fieldset.component.ts"]
end
subgraph GT["flex"]
GU["flex.component.ts"]
end
subgraph GV["granularity-picker"]
GW["granularity-picker.component.ts"]
end
GX["index.ts"]
subgraph GY["input"]
GZ["input.component.ts"]
end
subgraph H0["label"]
H1["label.component.ts"]
end
subgraph H2["loading-skeleton"]
H3["loading-skeleton.component.ts"]
end
subgraph H4["modal"]
H5["mm-modal.component.ts"]
end
subgraph H6["page-header"]
H7["page-header.component.ts"]
end
subgraph H8["paginator"]
H9["paginator.component.ts"]
end
subgraph HA["paper"]
HB["paper.component.ts"]
end
subgraph HC["privacy-blur"]
HD["privacy-blur.component.ts"]
end
subgraph HE["privacy-toggle"]
HF["privacy-toggle.component.ts"]
end
subgraph HG["range-picker"]
HH["range-picker.component.ts"]
end
subgraph HI["select"]
HJ["select.component.ts"]
end
subgraph HK["stat-card"]
HL["stat-card.component.ts"]
end
subgraph HM["table"]
HN["table.component.ts"]
end
subgraph HO["tabs"]
HP["tabs.component.ts"]
end
subgraph HQ["typography"]
HR["typography.component.ts"]
end
end
subgraph HS["utils"]
HT["calendar-cycles.ts"]
HU["compact-viewport.ts"]
HV["confidence-color.ts"]
HW["confirm-state.ts"]
HX["currency-format.ts"]
HY["currency-symbol-presets.ts"]
HZ["daisy-classes.ts"]
I0["date-buckets.ts"]
I1["date-format.pipe.ts"]
I2["date-format.ts"]
I3["debounced-text.ts"]
I4["download-json.ts"]
I5["fingerprint.ts"]
I6["format-settings.testing.ts"]
I7["format-settings.ts"]
I8["hidden-amount.ts"]
I9["iban.ts"]
IA["index.ts"]
IB["link-control-to-setting.ts"]
IC["locale-presets.ts"]
ID["money-color.ts"]
IE["number-format.ts"]
IF["pagination.ts"]
IG["percentage.ts"]
IH["quick-ranges.ts"]
II["range-expression.ts"]
IJ["search-params.ts"]
IK["selection-model.ts"]
IL["signed-amount.pipe.ts"]
IM["sortable.ts"]
IN["structural-filters.ts"]
IO["theme-hooks.ts"]
IP["unrendered-markup.testing.ts"]
subgraph IQ["validators"]
IR["iban.validator.ts"]
IS["percentage.validator.ts"]
end
IT["with-archivable.ts"]
IU["with-persisted-crud.ts"]
end
end
end
end
4-->12
4-->4R
5-->4
5-->6
6-->12
6-->IA
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
H-->4E
J-->12
K-->L
K-->12
L-->5
L-->12
M-->J
M-->L
M-->K
M-->N
M-->O
N-->12
O-->N
O-->12
Q-->R
R-->Y
R-->18
R-->I5
S-->R
S-->4I
S-->IA
T-->R
U-->R
V-->R
W-->R
X-->R
Z-->R
Z-->3Q
10-->R
11-->R
12-->Q
12-->R
12-->S
12-->T
12-->U
12-->V
12-->W
12-->X
12-->Z
12-->10
12-->11
12-->13
12-->14
12-->15
12-->16
12-->17
12-->19
12-->1A
12-->1B
13-->R
14-->R
15-->R
16-->R
17-->R
19-->R
1A-->R
1B-->R
1D-->12
1D-->IA
1E-->1I
1E-->12
1F-->1H
1F-->1I
1G-->1F
1G-->1I
1H-->12
1I-->1H
1I-->12
1K-->1H
1K-->12
1K-->4R
1K-->IA
1L-->1D
1L-->1E
1L-->1F
1L-->1H
1L-->1I
1L-->1J
1L-->1K
1O-->1R
1O-->F
1O-->2V
1O-->GC
1O-->HR
1R-->F
1R-->G8
1R-->GC
1R-->HR
1S-->1O
1V-->1U
1X-->IA
1Y-->1X
1Y-->1Z
1Y-->20
1Z-->1X
1Z-->12
1Z-->IA
20-->1X
20-->1Z
20-->12
22-->23
22-->24
22-->26
23-->26
24-->26
25-->23
25-->24
25-->26
25-->27
25-->28
26-->Y
27-->M
27-->12
2A-->2D
2B-->2A
2B-->2C
2B-->2D
2C-->2D
2F-->2G
2F-->2H
2F-->2I
2F-->2J
2F-->2K
2F-->2L
2K-->2I
2K-->2J
2K-->2L
2K-->12
2L-->12
2N-->2P
2N-->2Y
2N-->30
2N-->5
2N-->12
2N-->3Q
2N-->4E
2N-->4R
2N-->IA
2O-->12
2O-->4E
2O-->4I
2O-->IA
2P-->2Y
2P-->12
2P-->4E
2P-->IA
2Q-->2R
2Q-->3Q
2Q-->G1
2Q-->IA
2R-->3Q
2R-->G1
2R-->IA
2S-->12
2S-->3Q
2S-->4E
2T-->12
2T-->4E
2T-->IA
2U-->2Y
2U-->30
2U-->M
2U-->12
2U-->1L
2U-->4E
2V-->2N
2V-->2O
2V-->2P
2V-->2Q
2V-->2R
2V-->2S
2V-->2T
2V-->2U
2V-->2W
2V-->2X
2V-->2Y
2V-->2Z
2V-->30
2W-->2N
2W-->2O
2W-->2X
2W-->2Y
2W-->12
2W-->3Q
2W-->IA
2X-->2O
2X-->IA
2Y-->12
2Y-->4E
2Y-->4N
2Y-->4R
2Z-->12
2Z-->4E
30-->2Y
30-->2Z
30-->12
30-->4E
30-->4R
32-->12
32-->IA
33-->32
33-->12
33-->IA
34-->36
34-->3L
34-->IA
35-->3C
35-->12
36-->35
36-->12
36-->IA
37-->35
37-->3C
37-->12
37-->IA
38-->3C
38-->12
39-->12
3A-->35
3A-->3Y
3A-->12
3B-->IA
3C-->39
3C-->3D
3C-->12
3C-->4R
3D-->5
3D-->12
3E-->12
3F-->36
3F-->3L
3F-->12
3F-->IA
3G-->12
3H-->12
3H-->IA
3I-->IA
3J-->3K
3K-->3L
3K-->12
3L-->36
3L-->12
3L-->IA
3M-->3N
3M-->3P
3M-->46
3M-->12
3N-->36
3N-->3L
3N-->IA
3O-->3L
3O-->48
3O-->IA
3P-->36
3P-->3F
3P-->3L
3P-->IA
3Q-->32
3Q-->33
3Q-->34
3Q-->35
3Q-->36
3Q-->37
3Q-->38
3Q-->39
3Q-->3A
3Q-->3B
3Q-->3C
3Q-->3D
3Q-->3E
3Q-->3F
3Q-->3G
3Q-->3H
3Q-->3I
3Q-->3J
3Q-->3K
3Q-->3L
3Q-->3M
3Q-->3N
3Q-->3O
3Q-->3P
3Q-->3R
3Q-->3S
3Q-->3T
3Q-->3U
3Q-->3V
3Q-->3W
3Q-->3X
3Q-->3Y
3Q-->3Z
3Q-->40
3Q-->41
3Q-->42
3Q-->43
3Q-->44
3Q-->45
3Q-->46
3Q-->47
3Q-->48
3Q-->49
3R-->3D
3R-->12
3S-->3D
3S-->5
3S-->12
3T-->12
3T-->IA
3U-->49
3W-->IA
3X-->3C
3X-->12
3Y-->IA
3Z-->IA
40-->3C
40-->M
40-->12
40-->IA
41-->40
41-->IA
42-->12
42-->IA
43-->3X
43-->12
43-->Y
43-->IA
44-->35
44-->38
44-->12
45-->12
45-->4R
46-->3K
47-->3C
47-->12
47-->IA
48-->3X
48-->12
49-->36
49-->12
49-->IA
4B-->4C
4E-->4F
4H-->4J
4H-->Y
4I-->4H
4I-->4J
4I-->4K
4K-->4J
4M-->12
4N-->4M
4N-->4O
4N-->4P
4O-->12
4P-->12
4P-->4R
4R-->4S
4R-->4T
4R-->4V
4R-->4U
4S-->12
4T-->4V
4T-->12
4U-->4T
4U-->4V
4U-->12
4V-->6
4V-->12
4V-->IA
4X-->5L
4X-->12
4Y-->12
4Z-->12
50-->12
51-->5G
51-->5I
51-->G1
52-->3Q
52-->IA
53-->12
53-->2V
53-->3Q
53-->IA
56-->GX
56-->IA
58-->52
58-->53
58-->12
58-->3Q
58-->G1
58-->GX
58-->IA
5A-->52
5A-->53
5A-->12
5A-->2V
5A-->3Q
5A-->G1
5A-->GX
5C-->4X
5C-->4Y
5C-->56
5C-->GX
5E-->4Y
5E-->50
5E-->12
5E-->GX
5E-->IA
5E-->IR
5E-->IS
5G-->5L
5G-->56
5G-->58
5G-->5E
5G-->2V
5G-->GX
5G-->IA
5I-->4X
5I-->4Y
5I-->4Z
5I-->5L
5I-->5A
5I-->5C
5I-->5E
5I-->12
5I-->2V
5I-->GX
5I-->IA
5J-->56
5J-->58
5J-->5A
5J-->5C
5J-->5E
5J-->5G
5J-->5I
5K-->4Y
5K-->50
5K-->51
5K-->5J
5L-->IA
5N-->F
5N-->GX
5N-->IA
5O-->F
5O-->4E
5P-->5Z
5Q-->62
5T-->5O
5T-->F
5T-->GX
5V-->5N
5V-->5O
5V-->GX
5X-->5N
5X-->GX
5Z-->5N
5Z-->5O
5Z-->5T
5Z-->5V
5Z-->5X
5Z-->F
5Z-->GX
60-->62
62-->F
62-->G8
62-->GC
62-->GS
62-->GZ
62-->HB
62-->HR
63-->5P
63-->5Q
63-->60
65-->6C
65-->6P
67-->25
68-->67
68-->6W
68-->12
68-->25
68-->2V
68-->4E
69-->12
69-->GX
6C-->66
6C-->69
6C-->6E
6C-->M
6C-->12
6C-->2V
6C-->GX
6C-->IA
6E-->66
6E-->12
6E-->GX
6F-->6C
6F-->6E
6F-->6J
6F-->6L
6F-->6N
6F-->6P
6H-->6R
6H-->6T
6H-->M
6H-->12
6H-->2V
6H-->GX
6J-->6S
6J-->2V
6J-->GX
6J-->IA
6L-->6R
6L-->6H
6L-->M
6L-->12
6L-->2V
6L-->GX
6N-->6U
6N-->6W
6N-->GX
6N-->IA
6P-->6S
6P-->6V
6P-->6W
6P-->6J
6P-->6L
6P-->6N
6P-->12
6P-->2V
6P-->GX
6P-->IA
6Q-->65
6Q-->66
6Q-->67
6Q-->68
6Q-->6F
6Q-->6S
6Q-->6V
6Q-->6W
6R-->6T
6R-->12
6S-->6V
6S-->12
6T-->12
6U-->12
6V-->6T
6V-->12
6W-->6U
6W-->M
6W-->12
6W-->2V
6W-->4E
6W-->IA
6Y-->73
71-->GX
73-->76
73-->77
73-->78
73-->79
73-->71
73-->GX
74-->73
78-->76
79-->77
7A-->6Y
7A-->74
7C-->12
7C-->4E
7G-->2V
7G-->GX
7G-->IA
7I-->2V
7I-->4R
7I-->GX
7I-->IA
7K-->88
7K-->2V
7K-->3Q
7K-->G1
7K-->GX
7K-->IA
7M-->7C
7M-->7D
7M-->88
7M-->7O
7M-->7Q
7M-->2V
7M-->GX
7M-->IA
7O-->2V
7O-->GX
7Q-->7D
7Q-->GX
7S-->84
7S-->85
7S-->12
7S-->GX
7U-->84
7U-->85
7U-->88
7U-->7G
7U-->7I
7U-->7K
7U-->7M
7U-->7S
7U-->7X
7U-->7Z
7U-->81
7U-->83
7U-->2V
7U-->3Q
7U-->GX
7U-->IA
7V-->7G
7V-->7I
7V-->7K
7V-->7M
7V-->7O
7V-->7S
7V-->7U
7V-->7X
7V-->7Z
7V-->81
7V-->83
7X-->7O
7X-->2V
7X-->3Q
7X-->4R
7X-->G1
7X-->GX
7X-->IA
7Z-->88
7Z-->2V
7Z-->GX
7Z-->IA
81-->2V
81-->3Q
81-->4R
81-->G1
81-->GX
81-->IA
83-->88
83-->2V
83-->GX
83-->IA
84-->85
84-->12
84-->4E
85-->12
86-->7U
86-->G1
87-->7V
87-->86
88-->7C
88-->2V
88-->3Q
88-->4R
8C-->8F
8C-->8H
8C-->12
8C-->2F
8C-->4B
8C-->GX
8C-->IA
8D-->8C
8F-->2F
8F-->GX
8H-->12
8H-->2F
8H-->GX
8I-->8D
8M-->8P
8M-->8R
8M-->2V
8M-->GX
8N-->8M
8N-->8P
8N-->8R
8P-->2V
8P-->3Q
8P-->G1
8P-->GX
8P-->IA
8R-->12
8R-->2V
8R-->3Q
8R-->4R
8R-->G1
8R-->GX
8R-->IA
8S-->8M
8S-->G1
8T-->8N
8T-->8S
8X-->9E
8X-->9G
8X-->12
8X-->2V
8X-->3Q
8X-->GX
8X-->IA
8Z-->9F
8Z-->GX
91-->8X
91-->97
91-->9A
91-->GX
93-->12
93-->GX
95-->9I
95-->GX
97-->9F
97-->9G
97-->9I
97-->8Z
97-->93
97-->95
97-->12
97-->2V
97-->GX
97-->IA
98-->8X
98-->8Z
98-->91
98-->93
98-->95
98-->97
98-->9A
98-->9C
9A-->9D
9A-->9G
9A-->9K
9A-->9L
9A-->9C
9A-->2V
9A-->GX
9A-->IA
9C-->9L
9D-->12
9E-->12
9E-->3Q
9E-->GX
9E-->IA
9F-->9D
9F-->12
9F-->3Q
9F-->GX
9F-->IA
9G-->12
9G-->2V
9G-->3Q
9G-->4R
9H-->91
9H-->G1
9I-->12
9I-->3Q
9I-->GX
9I-->IA
9J-->98
9J-->9D
9J-->9E
9J-->9F
9J-->9G
9J-->9H
9J-->9I
9J-->9K
9J-->9L
9K-->3Q
9K-->G1
9K-->IA
9P-->9Y
9P-->GX
9R-->9Z
9R-->9T
9R-->GX
9T-->9Z
9T-->GX
9V-->9Z
9V-->GX
9W-->9P
9W-->9R
9W-->9T
9W-->9V
A0-->9P
A0-->9R
A0-->9V
A0-->9Z
A1-->9W
A1-->9Z
A1-->A0
A5-->1V
A5-->GX
A6-->A5
A7-->A5
A8-->A6
A8-->A7
AA-->12
AD-->B9
AD-->5K
AD-->GX
AF-->GX
AH-->AL
AH-->GX
AJ-->AL
AJ-->GX
AL-->GX
AN-->AA
AN-->AL
AN-->GX
AP-->BD
AP-->GX
AR-->AA
AR-->GX
AT-->B8
AT-->1L
AT-->2V
AT-->GX
AV-->AA
AV-->B7
AV-->BD
AV-->BE
AV-->AH
AV-->AJ
AV-->AN
AV-->AP
AV-->AR
AV-->AX
AV-->12
AV-->1L
AV-->GX
AX-->B7
AX-->1L
AX-->GX
AX-->IA
AZ-->B9
AZ-->BE
AZ-->AT
AZ-->B6
AZ-->12
AZ-->1L
AZ-->GX
B1-->B8
B1-->12
B1-->1L
B1-->2V
B1-->GX
B3-->BA
B3-->AF
B3-->AV
B3-->AZ
B3-->B1
B3-->2V
B3-->GX
B4-->AV
B4-->AX
B4-->AZ
B4-->B1
B4-->B3
B6-->B9
B6-->AD
B6-->12
B6-->GX
B7-->1L
B7-->GX
B8-->12
B8-->1L
B8-->IA
B9-->12
BA-->AA
BA-->B7
BA-->B9
BA-->BE
BA-->12
BA-->1L
BA-->2V
BA-->5K
BB-->B3
BC-->AA
BC-->B4
BC-->B9
BC-->BB
BC-->BD
BC-->BE
BD-->AA
BE-->12
BE-->4E
BG-->3Q
BJ-->BG
BJ-->CK
BJ-->GX
BJ-->IA
BL-->CG
BL-->GX
BN-->GX
BP-->CH
BP-->CI
BP-->CK
BP-->2V
BP-->3Q
BP-->GX
BR-->CK
BR-->4I
BR-->G1
BR-->GX
BT-->CF
BT-->CK
BT-->BN
BT-->2V
BT-->3Q
BT-->G1
BT-->GX
BT-->IA
BV-->CI
BV-->CK
BV-->BJ
BV-->BX
BV-->2V
BV-->3Q
BV-->GX
BV-->IA
BX-->GX
BZ-->CG
BZ-->CK
BZ-->BL
C1-->CG
C1-->CK
C1-->GX
C3-->CK
C3-->CN
C3-->BP
C3-->BT
C3-->BV
C3-->BX
C3-->BZ
C3-->C1
C3-->C7
C3-->CE
C3-->2V
C3-->3Q
C3-->G1
C3-->GX
C3-->IA
C5-->CG
C5-->CK
C5-->BJ
C5-->BL
C5-->BR
C5-->BZ
C5-->C1
C5-->GX
C7-->CK
C7-->2V
C7-->3Q
C7-->4R
C7-->G1
C7-->GX
C7-->IA
C8-->BJ
C8-->BL
C8-->BN
C8-->BP
C8-->BT
C8-->BV
C8-->C1
C8-->C3
C8-->C5
C8-->C7
C8-->CA
C8-->CC
C8-->CE
CA-->CC
CA-->GX
CC-->CI
CC-->CK
CC-->CM
CC-->CN
CC-->GX
CC-->IA
CE-->CK
CE-->CM
CE-->CN
CE-->CC
CE-->12
CE-->GX
CF-->3Q
CF-->G1
CF-->IA
CG-->12
CH-->CI
CH-->12
CH-->3Q
CH-->GX
CH-->IA
CI-->IA
CJ-->C3
CJ-->C5
CJ-->CA
CJ-->G1
CK-->BG
CK-->CI
CK-->12
CK-->2V
CK-->3Q
CK-->4E
CK-->4I
CK-->4R
CL-->C8
CL-->CG
CL-->CI
CL-->CJ
CL-->CK
CL-->CM
CL-->CN
CM-->12
CN-->12
CQ-->CS
CQ-->CW
CQ-->CY
CQ-->D0
CS-->CU
CS-->CW
CS-->CY
CS-->D0
CS-->GX
CU-->D3
CU-->6Q
CU-->GX
CW-->D3
CW-->25
CW-->2V
CW-->6Q
CW-->GX
CY-->12
CY-->25
CY-->2V
CY-->6Q
CY-->GX
CY-->IA
D0-->12
D0-->2V
D0-->6Q
D0-->GX
D0-->IA
D1-->CQ
D1-->D2
D2-->CS
D3-->6Q
D3-->GX
D6-->D8
D6-->DA
D6-->DC
D6-->DE
D6-->DG
D6-->DI
D6-->DK
D6-->DM
D6-->DO
D8-->DE
D8-->12
D8-->1Y
D8-->GX
D8-->IA
DA-->12
DA-->1Y
DA-->G1
DA-->GX
DC-->DQ
DC-->GX
DE-->12
DE-->1Y
DE-->G1
DE-->GX
DE-->IA
DG-->DR
DG-->DV
DG-->D8
DG-->DA
DG-->DI
DG-->DK
DG-->DM
DG-->1Y
DG-->2V
DG-->GX
DI-->DS
DI-->12
DI-->2V
DI-->GX
DI-->IS
DK-->12
DK-->2V
DK-->GX
DK-->IA
DM-->DT
DM-->12
DM-->1Y
DM-->2V
DM-->G1
DM-->GX
DO-->DQ
DO-->DV
DO-->DC
DO-->DI
DO-->12
DO-->GX
DP-->D6
DP-->DQ
DP-->DR
DP-->DS
DP-->DT
DP-->DU
DP-->DV
DQ-->DR
DQ-->DS
DQ-->12
DQ-->1Y
DQ-->GX
DQ-->IA
DR-->1Y
DR-->GX
DR-->IA
DS-->12
DT-->1Y
DT-->IA
DU-->DG
DU-->DO
DU-->G1
DV-->12
DV-->1Y
DV-->2V
DV-->4E
DV-->IA
DX-->GX
E0-->DX
E0-->EF
E0-->E2
E0-->E4
E0-->2V
E0-->3Q
E0-->GX
E0-->IA
E2-->DX
E2-->GX
E4-->DX
E4-->GX
E5-->E0
E5-->E2
E5-->E4
E5-->E9
E5-->EB
E7-->GX
E9-->E0
E9-->EB
E9-->2V
E9-->GX
EB-->EE
EB-->EF
EB-->E7
EB-->2V
EB-->3Q
EB-->G1
EB-->GX
EB-->IA
EC-->E5
EC-->EG
ED-->12
ED-->3Q
EE-->GX
EF-->ED
EF-->12
EF-->2V
EF-->3Q
EF-->4E
EF-->4R
EG-->E9
EK-->F
EK-->GX
EL-->EV
EN-->1V
EN-->GX
EP-->EK
EP-->F
EP-->GX
ER-->2V
ER-->GX
ER-->IA
ET-->8I
ET-->GX
EV-->EN
EV-->EP
EV-->ER
EV-->ET
EV-->EX
EV-->EZ
EV-->F1
EV-->GX
EX-->2V
EX-->GX
EX-->IA
EZ-->2V
EZ-->GX
EZ-->IA
F1-->2V
F1-->4I
F1-->GX
F2-->EL
F2-->F3
F3-->EV
F5-->12
F8-->12
F8-->2V
F8-->4N
F8-->GX
F8-->IA
FA-->F5
FB-->FD
FB-->FH
FB-->FJ
FB-->FN
FB-->FP
FD-->F5
FD-->M
FD-->2V
FD-->GX
FF-->F5
FF-->FS
FF-->FA
FF-->GX
FF-->IA
FH-->F5
FH-->F8
FH-->M
FH-->12
FH-->2V
FH-->4N
FH-->6Q
FH-->GX
FH-->IA
FJ-->F5
FJ-->FR
FJ-->M
FJ-->2V
FJ-->GX
FJ-->IA
FL-->F5
FL-->FS
FL-->FA
FL-->GX
FL-->IA
FN-->F5
FN-->FR
FN-->FS
FN-->FU
FN-->FD
FN-->FF
FN-->FH
FN-->FJ
FN-->FL
FN-->FP
FN-->M
FN-->12
FN-->2V
FN-->4R
FN-->6Q
FN-->GX
FN-->IA
FP-->2V
FP-->4R
FP-->GX
FP-->IA
FQ-->FT
FR-->12
FR-->4R
FS-->12
FS-->IA
FT-->FN
FU-->12
G1-->FX
G1-->FY
G1-->G0
G1-->G2
G1-->G3
G3-->IA
G6-->GC
G6-->GQ
G6-->GS
G6-->GZ
G6-->HR
G6-->12
G6-->IA
G8-->IA
GA-->IA
GC-->IA
GE-->IA
GG-->GC
GG-->H1
GG-->H5
GG-->HR
GI-->IA
GK-->GC
GK-->GO
GK-->IA
GM-->IA
GO-->IA
GQ-->GU
GQ-->HR
GS-->IA
GU-->IA
GX-->G6
GX-->G8
GX-->GA
GX-->GC
GX-->GE
GX-->GG
GX-->GI
GX-->GK
GX-->GM
GX-->GO
GX-->GQ
GX-->GS
GX-->GU
GX-->GW
GX-->GZ
GX-->H1
GX-->H3
GX-->H5
GX-->H7
GX-->H9
GX-->HB
GX-->HD
GX-->HF
GX-->HH
GX-->HJ
GX-->HL
GX-->HN
GX-->HP
GX-->HR
GZ-->IA
H1-->IA
H3-->GU
H5-->IA
H7-->GU
H7-->HR
H9-->GC
H9-->GU
H9-->HR
H9-->IA
HB-->IA
HD-->IA
HF-->GC
HF-->2V
HH-->G6
HH-->GC
HH-->GU
HH-->HB
HH-->HR
HH-->12
HH-->IA
HJ-->IA
HL-->HD
HL-->HR
HL-->IA
HN-->IA
HP-->IA
HR-->IA
HT-->I2
HX-->I7
I0-->I7
I1-->I2
I2-->I7
I6-->I7
I7-->Y
IA-->HT
IA-->HU
IA-->HV
IA-->HW
IA-->HX
IA-->HY
IA-->HZ
IA-->I0
IA-->I2
IA-->I1
IA-->I3
IA-->I4
IA-->I5
IA-->I7
IA-->I8
IA-->I9
IA-->IB
IA-->IC
IA-->ID
IA-->IE
IA-->IF
IA-->IG
IA-->IH
IA-->II
IA-->IJ
IA-->IK
IA-->IL
IA-->IM
IA-->IN
IA-->IO
IA-->IT
IA-->IU
IE-->I7
IH-->I0
IH-->II
II-->I0
IL-->HX
```
