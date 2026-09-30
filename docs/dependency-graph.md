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
- 475 leaf nodes, 1470 edges.
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
subgraph 1U["default-password-notice"]
1V["default-password-notice.component.ts"]
end
1W["index.ts"]
end
subgraph 1X["links"]
1Y["external-links.ts"]
1Z["index.ts"]
end
subgraph 20["loans"]
21["amortization.ts"]
22["index.ts"]
23["loan-progress.ts"]
24["what-if.ts"]
end
subgraph 25["ml"]
26["category-model.worker.ts"]
27["category-model.worker.types.ts"]
28["feature-hashing.ts"]
29["index.ts"]
2A["model-config.ts"]
2B["rule-proposal-mining.ts"]
2C["training-window.ts"]
end
subgraph 2D["onboarding"]
2E["home-redirect.guard.ts"]
2F["index.ts"]
2G["mark-visited.guard.ts"]
2H["visited.service.ts"]
end
subgraph 2I["qr-sync"]
2J["index.ts"]
2K["qr-camera-scanner.ts"]
2L["qr-code-renderer.ts"]
2M["qr-frames.ts"]
2N["qr-payload-codec.ts"]
2O["qr-sync.service.ts"]
2P["qr-transfer-payload.ts"]
end
subgraph 2Q["server-status"]
2R["index.ts"]
2S["server-status.interceptor.ts"]
2T["server-status.service.ts"]
subgraph 2U["server-unreachable"]
2V["server-unreachable.component.ts"]
end
2W["transport-failure.ts"]
end
subgraph 2X["state"]
2Y["accounts.store.ts"]
2Z["app-settings.store.ts"]
30["categories.store.ts"]
31["chart-options-control.ts"]
32["chart-options.store.ts"]
33["forecast-settings.store.ts"]
34["goals.store.ts"]
35["import-batches.store.ts"]
36["index.ts"]
37["page-range-control.ts"]
38["range-state.store.ts"]
39["transactions.store.ts"]
3A["transfer-settings.store.ts"]
3B["transfers.store.ts"]
end
subgraph 3C["stats"]
3D["account-balance-history.ts"]
3E["account-balance-trend.ts"]
3F["annual-lump-sum-smoothing.ts"]
3G["category-breakdown.ts"]
3H["category-composition-trend.ts"]
3I["category-cycle-heatmap.ts"]
3J["category-expense-transactions.ts"]
3K["category-kind-contribution.ts"]
3L["category-period-comparison.ts"]
3M["chart-zoom-window.ts"]
3N["classify-for-stats.ts"]
3O["classify-joint-leg.ts"]
3P["day-transactions.ts"]
3Q["embedded-bonus-smoothing.ts"]
3R["full-history-range.ts"]
3S["goal-affordability.ts"]
3T["granularity-for-span.ts"]
3U["gross-net-growth.ts"]
3V["gross-net-ratio.ts"]
3W["income-category-series.ts"]
3X["income-events.ts"]
3Y["income-gap-detection.ts"]
3Z["income-growth.ts"]
40["income-step-change-detection.ts"]
41["index.ts"]
42["joint-account-stake.ts"]
43["joint-contributor-breakdown.ts"]
44["money-flow-graph.ts"]
45["multi-year-income-comparison.ts"]
46["net-margin.ts"]
47["net-worth-projection.ts"]
48["period-stats.ts"]
49["period-window.ts"]
4A["periodized-rate.ts"]
4B["recurring-payments.ts"]
4C["recurring-projection.ts"]
4D["required-saving-rate.ts"]
4E["saving-velocity.ts"]
4F["spending-mosaic.ts"]
4G["top-transactions.ts"]
4H["wage-change-detection.ts"]
4I["weekday-weekend-split.ts"]
4J["year-over-year.ts"]
4K["yearly-income-summary.ts"]
end
subgraph 4L["store-reset"]
4M["index.ts"]
4N["store-reset.service.ts"]
4O["with-hydration.ts"]
end
subgraph 4P["theme"]
4Q["accent-colors.ts"]
4R["index.ts"]
4S["theme-styles.ts"]
4T["theme.service.ts"]
end
subgraph 4U["transactions"]
4V["attribution-override.ts"]
4W["index.ts"]
4X["nullify-transaction.ts"]
4Y["transaction-deletion.service.ts"]
end
subgraph 4Z["transfers"]
50["index.ts"]
51["transfer-cleanup-result.ts"]
52["transfer-linking.service.ts"]
53["transfer-matching.service.ts"]
54["transfer-matching.ts"]
end
end
subgraph 55["feature-accounts"]
56["account-card-vm.ts"]
57["account-icons.ts"]
58["account-list-order.ts"]
59["account-types.ts"]
5A["accounts.routes.ts"]
5B["balance-day-tooltip.ts"]
5C["balance-trend-signals.ts"]
subgraph 5D["components"]
subgraph 5E["account-balance-block"]
5F["account-balance-block.component.ts"]
end
subgraph 5G["account-balance-chart"]
5H["account-balance-chart.component.ts"]
end
subgraph 5I["account-balance-history-chart"]
5J["account-balance-history-chart.component.ts"]
end
subgraph 5K["account-card"]
5L["account-card.component.ts"]
end
subgraph 5M["account-form"]
5N["account-form.component.ts"]
end
subgraph 5O["accounts-detail"]
5P["accounts-detail.component.ts"]
end
subgraph 5Q["accounts-overview"]
5R["accounts-overview.component.ts"]
end
5S["index.ts"]
end
5T["index.ts"]
5U["last-import-status.ts"]
end
subgraph 5V["feature-auth"]
5W["admin-user-row.ts"]
5X["admin-users.store.ts"]
5Y["admin.routes.ts"]
5Z["auth.routes.ts"]
subgraph 60["components"]
subgraph 61["admin-create-account-dialog"]
62["admin-create-account-dialog.component.ts"]
end
subgraph 63["admin-reset-password-dialog"]
64["admin-reset-password-dialog.component.ts"]
end
subgraph 65["admin-user-actions"]
66["admin-user-actions.component.ts"]
end
subgraph 67["admin-users-page"]
68["admin-users-page.component.ts"]
end
69["index.ts"]
subgraph 6A["login-page"]
6B["login-page.component.ts"]
end
end
6C["index.ts"]
end
subgraph 6D["feature-categories"]
6E["categories.routes.ts"]
6F["category-icons.ts"]
6G["category-model.service.ts"]
6H["category-model.store.ts"]
6I["category-row-vm.ts"]
subgraph 6J["components"]
subgraph 6K["categories-overview"]
6L["categories-overview.component.ts"]
end
subgraph 6M["category-form"]
6N["category-form.component.ts"]
end
6O["index.ts"]
subgraph 6P["rule-condition-row"]
6Q["rule-condition-row.component.ts"]
end
subgraph 6R["rule-filters"]
6S["rule-filters.component.ts"]
end
subgraph 6T["rule-form"]
6U["rule-form.component.ts"]
end
subgraph 6V["rule-share-bar"]
6W["rule-share-bar.component.ts"]
end
subgraph 6X["rules-overview"]
6Y["rules-overview.component.ts"]
end
end
6Z["index.ts"]
70["rule-condition-editor.ts"]
71["rule-filters.ts"]
72["rule-labels.ts"]
73["rule-share.ts"]
74["rule-summary.ts"]
75["rules.store.ts"]
end
subgraph 76["feature-changelog"]
77["changelog.routes.ts"]
subgraph 78["components"]
subgraph 79["changelog-entry-row"]
7A["changelog-entry-row.component.ts"]
end
subgraph 7B["changelog-page"]
7C["changelog-page.component.ts"]
end
7D["index.ts"]
end
subgraph 7E["data"]
7F["changelog-entries.ts"]
7G["roadmap-entries.ts"]
end
7H["group-changelog-entries.ts"]
7I["group-roadmap-entries.ts"]
7J["index.ts"]
end
subgraph 7K["feature-dashboard"]
7L["category-comparison-settings.store.ts"]
7M["category-comparison-vm.ts"]
subgraph 7N["components"]
subgraph 7O["account-balance-strip"]
7P["account-balance-strip.component.ts"]
end
subgraph 7Q["action-queue-panel"]
7R["action-queue-panel.component.ts"]
end
subgraph 7S["category-breakdown-panel"]
7T["category-breakdown-panel.component.ts"]
end
subgraph 7U["category-comparison-panel"]
7V["category-comparison-panel.component.ts"]
end
subgraph 7W["category-exclusion-dropdown"]
7X["category-exclusion-dropdown.component.ts"]
end
subgraph 7Y["comparison-category-card"]
7Z["comparison-category-card.component.ts"]
end
subgraph 80["dashboard-customize-panel"]
81["dashboard-customize-panel.component.ts"]
end
subgraph 82["dashboard-overview"]
83["dashboard-overview.component.ts"]
end
84["index.ts"]
subgraph 85["spending-heatmap-panel"]
86["spending-heatmap-panel.component.ts"]
end
subgraph 87["top-transactions-panel"]
88["top-transactions-panel.component.ts"]
end
subgraph 89["trend-chart-panel"]
8A["trend-chart-panel.component.ts"]
end
subgraph 8B["weekday-weekend-split-panel"]
8C["weekday-weekend-split-panel.component.ts"]
end
end
8D["dashboard-layout-settings.store.ts"]
8E["dashboard-row-order.ts"]
8F["dashboard.routes.ts"]
8G["index.ts"]
8H["stats.store.ts"]
end
subgraph 8I["feature-data-management"]
subgraph 8J["components"]
subgraph 8K["data-management-overview"]
8L["data-management-overview.component.ts"]
end
8M["index.ts"]
subgraph 8N["qr-receive-dialog"]
8O["qr-receive-dialog.component.ts"]
end
subgraph 8P["qr-send-dialog"]
8Q["qr-send-dialog.component.ts"]
end
end
8R["index.ts"]
end
subgraph 8S["feature-explore"]
subgraph 8T["components"]
subgraph 8U["explore-overview"]
8V["explore-overview.component.ts"]
end
8W["index.ts"]
subgraph 8X["money-flow-panel"]
8Y["money-flow-panel.component.ts"]
end
subgraph 8Z["spending-mosaic-panel"]
90["spending-mosaic-panel.component.ts"]
end
end
91["explore.routes.ts"]
92["index.ts"]
end
subgraph 93["feature-future"]
subgraph 94["components"]
subgraph 95["forecast-controls"]
96["forecast-controls.component.ts"]
end
subgraph 97["forecast-notice"]
98["forecast-notice.component.ts"]
end
subgraph 99["future-overview"]
9A["future-overview.component.ts"]
end
subgraph 9B["goal-form"]
9C["goal-form.component.ts"]
end
subgraph 9D["goal-row"]
9E["goal-row.component.ts"]
end
subgraph 9F["goals-panel"]
9G["goals-panel.component.ts"]
end
9H["index.ts"]
subgraph 9I["net-worth-projection-chart"]
9J["net-worth-projection-chart.component.ts"]
end
subgraph 9K["projection-figure-table"]
9L["projection-figure-table.component.ts"]
end
end
9M["forecast-chart-copy.ts"]
9N["forecast-controls-vm.ts"]
9O["forecast-notices.ts"]
9P["forecast.store.ts"]
9Q["future.routes.ts"]
9R["goal-row-vm.ts"]
9S["index.ts"]
9T["net-worth-projection-chart-option.ts"]
9U["projection-accessible-row.ts"]
end
subgraph 9V["feature-help"]
subgraph 9W["components"]
subgraph 9X["faq-page"]
9Y["faq-page.component.ts"]
end
subgraph 9Z["guide-detail"]
A0["guide-detail.component.ts"]
end
subgraph A1["guide-steps"]
A2["guide-steps.component.ts"]
end
subgraph A3["guides-index"]
A4["guides-index.component.ts"]
end
A5["index.ts"]
end
subgraph A6["data"]
A7["faq.ts"]
A8["guides.ts"]
end
A9["help.routes.ts"]
AA["index.ts"]
end
subgraph AB["feature-home"]
subgraph AC["components"]
subgraph AD["home-landing"]
AE["home-landing.component.ts"]
end
AF["index.ts"]
end
AG["home.routes.ts"]
AH["index.ts"]
end
subgraph AI["feature-import"]
AJ["column-mapping.ts"]
subgraph AK["components"]
subgraph AL["account-draft-editor"]
AM["account-draft-editor.component.ts"]
end
subgraph AN["batch-wait-card"]
AO["batch-wait-card.component.ts"]
end
subgraph AP["column-map-amount-field"]
AQ["column-map-amount-field.component.ts"]
end
subgraph AR["column-map-counterparty-field"]
AS["column-map-counterparty-field.component.ts"]
end
subgraph AT["column-map-sample-caption"]
AU["column-map-sample-caption.component.ts"]
end
subgraph AV["column-map-simple-field"]
AW["column-map-simple-field.component.ts"]
end
subgraph AX["column-map-stepper"]
AY["column-map-stepper.component.ts"]
end
subgraph AZ["column-map-summary-step"]
B0["column-map-summary-step.component.ts"]
end
subgraph B1["import-history"]
B2["import-history.component.ts"]
end
subgraph B3["import-map-step"]
B4["import-map-step.component.ts"]
end
subgraph B5["import-preview-step"]
B6["import-preview-step.component.ts"]
end
subgraph B7["import-select-step"]
B8["import-select-step.component.ts"]
end
subgraph B9["import-summary-step"]
BA["import-summary-step.component.ts"]
end
subgraph BB["import-wizard"]
BC["import-wizard.component.ts"]
end
BD["index.ts"]
subgraph BE["queued-file-row"]
BF["queued-file-row.component.ts"]
end
end
BG["duplicate-scan.ts"]
BH["import-history-rows.ts"]
BI["import-queue.ts"]
BJ["import-wizard-session.ts"]
BK["import.routes.ts"]
BL["index.ts"]
BM["mapper-steps.ts"]
BN["mapping-profiles.store.ts"]
end
subgraph BO["feature-income"]
BP["career-start-date.ts"]
subgraph BQ["components"]
subgraph BR["income-career-start"]
BS["income-career-start.component.ts"]
end
subgraph BT["income-category-checklist"]
BU["income-category-checklist.component.ts"]
end
subgraph BV["income-chart-cell"]
BW["income-chart-cell.component.ts"]
end
subgraph BX["income-events-sidebar"]
BY["income-events-sidebar.component.ts"]
end
subgraph BZ["income-gross-color"]
C0["income-gross-color.component.ts"]
end
subgraph C1["income-gross-net-section"]
C2["income-gross-net-section.component.ts"]
end
subgraph C3["income-growth-panel"]
C4["income-growth-panel.component.ts"]
end
subgraph C5["income-inference-note"]
C6["income-inference-note.component.ts"]
end
subgraph C7["income-lump-sum-checklist"]
C8["income-lump-sum-checklist.component.ts"]
end
subgraph C9["income-main-category"]
CA["income-main-category.component.ts"]
end
subgraph CB["income-overview"]
CC["income-overview.component.ts"]
end
subgraph CD["income-settings-page"]
CE["income-settings-page.component.ts"]
end
subgraph CF["income-yearly-panel"]
CG["income-yearly-panel.component.ts"]
end
CH["index.ts"]
subgraph CI["salary-details-page"]
CJ["salary-details-page.component.ts"]
end
subgraph CK["salary-metadata-table"]
CL["salary-metadata-table.component.ts"]
end
subgraph CM["salary-month-modal"]
CN["salary-month-modal.component.ts"]
end
end
CO["gross-net-chart-options.ts"]
CP["income-category-vm.ts"]
CQ["income-event-vm.ts"]
CR["income-granularity.ts"]
CS["income.routes.ts"]
CT["income.store.ts"]
CU["index.ts"]
CV["salary-metadata-edit.ts"]
CW["salary-metadata-rows.ts"]
end
subgraph CX["feature-learning"]
subgraph CY["components"]
CZ["index.ts"]
subgraph D0["learning-overview"]
D1["learning-overview.component.ts"]
end
subgraph D2["model-status-badge"]
D3["model-status-badge.component.ts"]
end
subgraph D4["model-status"]
D5["model-status.component.ts"]
end
subgraph D6["rule-proposals"]
D7["rule-proposals.component.ts"]
end
subgraph D8["suggestions-table"]
D9["suggestions-table.component.ts"]
end
end
DA["index.ts"]
DB["learning.routes.ts"]
DC["model-status-display.ts"]
end
subgraph DD["feature-loans"]
subgraph DE["components"]
DF["index.ts"]
subgraph DG["loan-amortization-table"]
DH["loan-amortization-table.component.ts"]
end
subgraph DI["loan-balance-chart"]
DJ["loan-balance-chart.component.ts"]
end
subgraph DK["loan-card"]
DL["loan-card.component.ts"]
end
subgraph DM["loan-composition-chart"]
DN["loan-composition-chart.component.ts"]
end
subgraph DO["loan-detail"]
DP["loan-detail.component.ts"]
end
subgraph DQ["loan-form"]
DR["loan-form.component.ts"]
end
subgraph DS["loan-payments-list"]
DT["loan-payments-list.component.ts"]
end
subgraph DU["loan-what-if"]
DV["loan-what-if.component.ts"]
end
subgraph DW["loans-overview"]
DX["loans-overview.component.ts"]
end
end
DY["index.ts"]
DZ["loan-card-vm.ts"]
E0["loan-schedule-status.ts"]
E1["loan-types.ts"]
E2["loan-what-if-vm.ts"]
E3["loans.routes.ts"]
E4["loans.store.ts"]
end
subgraph E5["feature-recurring"]
E6["bills-calendar-vm.ts"]
subgraph E7["components"]
subgraph E8["bills-calendar"]
E9["bills-calendar.component.ts"]
end
subgraph EA["bills-day-list"]
EB["bills-day-list.component.ts"]
end
subgraph EC["bills-month-grid"]
ED["bills-month-grid.component.ts"]
end
EE["index.ts"]
subgraph EF["recurring-dismissed-list"]
EG["recurring-dismissed-list.component.ts"]
end
subgraph EH["recurring-overview"]
EI["recurring-overview.component.ts"]
end
subgraph EJ["recurring-payments-panel"]
EK["recurring-payments-panel.component.ts"]
end
end
EL["index.ts"]
EM["recurring-overrides.ts"]
EN["recurring-payments-row-vm.ts"]
EO["recurring-series.store.ts"]
EP["recurring.routes.ts"]
end
subgraph EQ["feature-settings"]
subgraph ER["components"]
subgraph ES["account-password-form"]
ET["account-password-form.component.ts"]
end
EU["index.ts"]
subgraph EV["settings-about-section"]
EW["settings-about-section.component.ts"]
end
subgraph EX["settings-account-section"]
EY["settings-account-section.component.ts"]
end
subgraph EZ["settings-currency-locale-section"]
F0["settings-currency-locale-section.component.ts"]
end
subgraph F1["settings-data-section"]
F2["settings-data-section.component.ts"]
end
subgraph F3["settings-overview"]
F4["settings-overview.component.ts"]
end
subgraph F5["settings-privacy-section"]
F6["settings-privacy-section.component.ts"]
end
subgraph F7["settings-reporting-section"]
F8["settings-reporting-section.component.ts"]
end
subgraph F9["settings-theme-section"]
FA["settings-theme-section.component.ts"]
end
end
FB["index.ts"]
FC["settings.routes.ts"]
end
subgraph FD["feature-transactions"]
FE["category-picker.ts"]
subgraph FF["components"]
subgraph FG["attribution-override-fieldset"]
FH["attribution-override-fieldset.component.ts"]
end
subgraph FI["category-select-cell"]
FJ["category-select-cell.component.ts"]
end
FK["index.ts"]
subgraph FL["transaction-bulk-bar"]
FM["transaction-bulk-bar.component.ts"]
end
subgraph FN["transaction-card"]
FO["transaction-card.component.ts"]
end
subgraph FP["transaction-edit-form"]
FQ["transaction-edit-form.component.ts"]
end
subgraph FR["transaction-filters"]
FS["transaction-filters.component.ts"]
end
subgraph FT["transaction-row"]
FU["transaction-row.component.ts"]
end
subgraph FV["transactions-overview"]
FW["transactions-overview.component.ts"]
end
subgraph FX["transfer-review"]
FY["transfer-review.component.ts"]
end
end
FZ["index.ts"]
G0["transaction-filters.ts"]
G1["transaction-row-vm.ts"]
G2["transactions.routes.ts"]
G3["transfer-label.ts"]
end
subgraph G4["shared"]
subgraph G5["echarts"]
G6["bucketed-axis-option.ts"]
G7["chart-theme.ts"]
G8["echarts-jsdom.testing.ts"]
G9["echarts-setup.ts"]
GA["index.ts"]
GB["legend-option.ts"]
GC["tooltip-formatter.ts"]
end
subgraph GD["ui"]
subgraph GE["absolute-range-panel"]
GF["absolute-range-panel.component.ts"]
end
subgraph GG["alert"]
GH["alert.component.ts"]
end
subgraph GI["badge"]
GJ["badge.component.ts"]
end
subgraph GK["button"]
GL["button.component.ts"]
end
subgraph GM["collapse"]
GN["collapse.component.ts"]
end
subgraph GO["confirm-dialog"]
GP["confirm-dialog.component.ts"]
end
subgraph GQ["cycle-picker"]
GR["cycle-picker.component.ts"]
end
subgraph GS["date-range-input"]
GT["date-range-input.component.ts"]
end
subgraph GU["divider"]
GV["divider.component.ts"]
end
subgraph GW["dropdown"]
GX["dropdown.component.ts"]
end
subgraph GY["empty-state"]
GZ["empty-state.component.ts"]
end
subgraph H0["fieldset"]
H1["fieldset.component.ts"]
end
subgraph H2["flex"]
H3["flex.component.ts"]
end
subgraph H4["granularity-picker"]
H5["granularity-picker.component.ts"]
end
subgraph H6["hydration-boundary"]
H7["hydration-boundary.component.ts"]
end
H8["index.ts"]
subgraph H9["input"]
HA["input.component.ts"]
end
subgraph HB["label"]
HC["label.component.ts"]
end
subgraph HD["loading-skeleton"]
HE["loading-skeleton.component.ts"]
end
subgraph HF["modal"]
HG["mm-modal.component.ts"]
end
subgraph HH["page-header"]
HI["page-header.component.ts"]
end
subgraph HJ["paginator"]
HK["paginator.component.ts"]
end
subgraph HL["paper"]
HM["paper.component.ts"]
end
subgraph HN["privacy-blur"]
HO["privacy-blur.component.ts"]
end
subgraph HP["privacy-toggle"]
HQ["privacy-toggle.component.ts"]
end
subgraph HR["range-picker"]
HS["range-picker.component.ts"]
end
subgraph HT["select"]
HU["select.component.ts"]
end
subgraph HV["stat-card"]
HW["stat-card.component.ts"]
end
subgraph HX["table"]
HY["table.component.ts"]
end
subgraph HZ["tabs"]
I0["tabs.component.ts"]
end
subgraph I1["typography"]
I2["typography.component.ts"]
end
end
subgraph I3["utils"]
I4["calendar-cycles.ts"]
I5["compact-viewport.ts"]
I6["confidence-color.ts"]
I7["confirm-state.ts"]
I8["currency-format.ts"]
I9["currency-symbol-presets.ts"]
IA["daisy-classes.ts"]
IB["date-buckets.ts"]
IC["date-format.pipe.ts"]
ID["date-format.ts"]
IE["debounced-text.ts"]
IF["download-json.ts"]
IG["fingerprint.ts"]
IH["format-settings.testing.ts"]
II["format-settings.ts"]
IJ["hidden-amount.ts"]
IK["hydration-status.ts"]
IL["iban.ts"]
IM["index.ts"]
IN["link-control-to-setting.ts"]
IO["locale-presets.ts"]
IP["money-color.ts"]
IQ["number-format.ts"]
IR["pagination.ts"]
IS["percentage.ts"]
IT["quick-ranges.ts"]
IU["range-expression.ts"]
IV["search-params.ts"]
IW["selection-model.ts"]
IX["signed-amount.pipe.ts"]
IY["sortable.ts"]
IZ["structural-filters.ts"]
J0["theme-hooks.ts"]
J1["unrendered-markup.testing.ts"]
subgraph J2["validators"]
J3["iban.validator.ts"]
J4["percentage.validator.ts"]
end
J5["with-archivable.ts"]
J6["with-persisted-crud.ts"]
end
end
end
end
4-->16
5-->4
5-->6
6-->16
6-->IM
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
H-->2R
H-->4M
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
S-->2R
T-->S
T-->11
T-->1C
T-->4R
T-->IM
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
13-->41
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
1H-->IM
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
1O-->IM
1P-->1H
1P-->1I
1P-->1J
1P-->1L
1P-->1M
1P-->1N
1P-->1O
1S-->1V
1S-->F
1S-->2R
1S-->36
1S-->GH
1S-->GL
1S-->I2
1V-->F
1V-->GH
1V-->GL
1V-->I2
1W-->1S
1Z-->1Y
21-->IM
22-->21
22-->23
22-->24
23-->21
23-->16
23-->IM
24-->21
24-->23
24-->16
26-->27
26-->28
26-->2A
27-->2A
28-->2A
29-->27
29-->28
29-->2A
29-->2B
29-->2C
2A-->11
2B-->M
2B-->16
2E-->2H
2F-->2E
2F-->2G
2F-->2H
2G-->2H
2J-->2K
2J-->2L
2J-->2M
2J-->2N
2J-->2O
2J-->2P
2O-->2M
2O-->2N
2O-->2P
2O-->16
2P-->16
2R-->2S
2R-->2T
2R-->2V
2R-->2W
2S-->B
2S-->2T
2S-->2W
2T-->2W
2Y-->30
2Y-->39
2Y-->3B
2Y-->5
2Y-->16
2Y-->41
2Y-->4M
2Y-->50
2Y-->IM
2Z-->16
2Z-->4M
2Z-->4R
2Z-->IM
30-->39
30-->16
30-->4M
30-->IM
31-->32
31-->41
31-->GA
31-->IM
32-->41
32-->GA
32-->IM
33-->16
33-->41
33-->4M
34-->16
34-->4M
34-->IM
35-->39
35-->3B
35-->M
35-->16
35-->1P
35-->4M
36-->2Y
36-->2Z
36-->30
36-->31
36-->32
36-->33
36-->34
36-->35
36-->37
36-->38
36-->39
36-->3A
36-->3B
37-->2Y
37-->2Z
37-->38
37-->39
37-->16
37-->41
37-->IM
38-->2Z
38-->IM
39-->16
39-->4M
39-->4W
39-->50
3A-->16
3A-->4M
3B-->39
3B-->3A
3B-->16
3B-->4M
3B-->50
3D-->16
3D-->IM
3E-->3D
3E-->16
3E-->IM
3F-->3H
3F-->3W
3F-->IM
3G-->3N
3G-->16
3H-->3G
3H-->16
3H-->IM
3I-->3G
3I-->3N
3I-->16
3I-->IM
3J-->3N
3J-->16
3K-->16
3L-->3G
3L-->49
3L-->16
3M-->IM
3N-->3K
3N-->3O
3N-->16
3N-->50
3O-->5
3O-->16
3P-->16
3Q-->3H
3Q-->3W
3Q-->16
3Q-->IM
3R-->16
3S-->16
3S-->IM
3T-->IM
3U-->3V
3V-->3W
3V-->16
3W-->3H
3W-->16
3W-->IM
3X-->3Y
3X-->40
3X-->4H
3X-->16
3Y-->3H
3Y-->3W
3Y-->IM
3Z-->3W
3Z-->4J
3Z-->IM
40-->3H
40-->3Q
40-->3W
40-->IM
41-->3D
41-->3E
41-->3F
41-->3G
41-->3H
41-->3I
41-->3J
41-->3K
41-->3L
41-->3M
41-->3N
41-->3O
41-->3P
41-->3Q
41-->3R
41-->3S
41-->3T
41-->3U
41-->3V
41-->3W
41-->3X
41-->3Y
41-->3Z
41-->40
41-->42
41-->43
41-->44
41-->45
41-->46
41-->47
41-->48
41-->49
41-->4A
41-->4B
41-->4C
41-->4D
41-->4E
41-->4F
41-->4G
41-->4H
41-->4I
41-->4J
41-->4K
42-->3O
42-->16
43-->3O
43-->5
43-->16
44-->16
44-->IM
45-->4K
47-->IM
48-->3N
48-->16
49-->IM
4A-->IM
4B-->3N
4B-->M
4B-->16
4B-->IM
4C-->4B
4C-->IM
4D-->16
4D-->IM
4E-->48
4E-->16
4E-->11
4E-->IM
4F-->3G
4F-->3J
4F-->16
4G-->16
4G-->50
4H-->3V
4I-->3N
4I-->16
4I-->IM
4J-->48
4J-->16
4K-->3H
4K-->16
4K-->IM
4M-->4N
4M-->4O
4O-->4N
4O-->2R
4Q-->4S
4Q-->11
4R-->4Q
4R-->4S
4R-->4T
4T-->4S
4V-->16
4W-->4V
4W-->4X
4W-->4Y
4X-->16
4Y-->16
4Y-->50
50-->51
50-->52
50-->54
50-->53
52-->54
52-->16
53-->52
53-->54
53-->16
54-->6
54-->16
54-->IM
56-->5U
56-->16
57-->16
58-->16
59-->16
5A-->5P
5A-->5R
5A-->GA
5B-->41
5B-->IM
5C-->16
5C-->36
5C-->41
5C-->IM
5F-->H8
5F-->IM
5H-->5B
5H-->5C
5H-->16
5H-->41
5H-->GA
5H-->H8
5H-->IM
5J-->5B
5J-->5C
5J-->16
5J-->36
5J-->41
5J-->GA
5J-->H8
5L-->56
5L-->57
5L-->5F
5L-->H8
5N-->57
5N-->59
5N-->16
5N-->H8
5N-->IM
5N-->J3
5N-->J4
5P-->5U
5P-->5F
5P-->5H
5P-->5N
5P-->36
5P-->H8
5P-->IM
5R-->56
5R-->57
5R-->58
5R-->5U
5R-->5J
5R-->5L
5R-->5N
5R-->16
5R-->36
5R-->H8
5R-->IM
5S-->5F
5S-->5H
5S-->5J
5S-->5L
5S-->5N
5S-->5P
5S-->5R
5T-->57
5T-->59
5T-->5A
5T-->5S
5U-->IM
5W-->F
5W-->H8
5W-->IM
5X-->F
5X-->4M
5Y-->68
5Z-->6B
62-->5X
62-->F
62-->H8
64-->5W
64-->5X
64-->H8
66-->5W
66-->H8
68-->5W
68-->5X
68-->62
68-->64
68-->66
68-->F
68-->H8
69-->6B
6B-->F
6B-->GH
6B-->GL
6B-->H1
6B-->HA
6B-->HM
6B-->I2
6C-->5Y
6C-->5Z
6C-->69
6E-->6L
6E-->6Y
6G-->29
6H-->6G
6H-->75
6H-->16
6H-->29
6H-->36
6H-->4M
6I-->16
6I-->H8
6L-->6F
6L-->6I
6L-->6N
6L-->M
6L-->16
6L-->36
6L-->H8
6L-->IM
6N-->6F
6N-->16
6N-->H8
6O-->6L
6O-->6N
6O-->6S
6O-->6U
6O-->6W
6O-->6Y
6Q-->70
6Q-->72
6Q-->M
6Q-->16
6Q-->36
6Q-->H8
6S-->71
6S-->36
6S-->H8
6S-->IM
6U-->70
6U-->6Q
6U-->M
6U-->16
6U-->36
6U-->H8
6W-->73
6W-->75
6W-->H8
6W-->IM
6Y-->71
6Y-->74
6Y-->75
6Y-->6S
6Y-->6U
6Y-->6W
6Y-->16
6Y-->36
6Y-->H8
6Y-->IM
6Z-->6E
6Z-->6F
6Z-->6G
6Z-->6H
6Z-->6O
6Z-->71
6Z-->74
6Z-->75
70-->72
70-->16
71-->74
71-->16
72-->16
73-->16
74-->72
74-->16
75-->73
75-->M
75-->16
75-->36
75-->4M
75-->IM
77-->7C
7A-->H8
7C-->7F
7C-->7G
7C-->7H
7C-->7I
7C-->7A
7C-->H8
7D-->7C
7H-->7F
7I-->7G
7J-->77
7J-->7D
7L-->16
7L-->4M
7P-->36
7P-->H8
7P-->IM
7R-->36
7R-->50
7R-->H8
7R-->IM
7T-->8H
7T-->36
7T-->41
7T-->GA
7T-->H8
7T-->IM
7V-->7L
7V-->7M
7V-->8H
7V-->7X
7V-->7Z
7V-->36
7V-->H8
7V-->IM
7X-->36
7X-->H8
7Z-->7M
7Z-->H8
81-->8D
81-->8E
81-->16
81-->H8
83-->8D
83-->8E
83-->8H
83-->7P
83-->7R
83-->7T
83-->7V
83-->81
83-->86
83-->88
83-->8A
83-->8C
83-->36
83-->41
83-->H8
83-->IM
84-->7P
84-->7R
84-->7T
84-->7V
84-->7X
84-->81
84-->83
84-->86
84-->88
84-->8A
84-->8C
86-->7X
86-->36
86-->41
86-->50
86-->GA
86-->H8
86-->IM
88-->8H
88-->36
88-->H8
88-->IM
8A-->36
8A-->41
8A-->50
8A-->GA
8A-->H8
8A-->IM
8C-->8H
8C-->36
8C-->H8
8C-->IM
8D-->8E
8D-->16
8D-->4M
8E-->16
8F-->83
8F-->GA
8G-->84
8G-->8F
8H-->7L
8H-->36
8H-->41
8H-->50
8L-->8O
8L-->8Q
8L-->16
8L-->2J
8L-->H8
8L-->IM
8M-->8L
8O-->2J
8O-->H8
8Q-->16
8Q-->2J
8Q-->H8
8R-->8M
8V-->8Y
8V-->90
8V-->36
8V-->H8
8W-->8V
8W-->8Y
8W-->90
8Y-->36
8Y-->41
8Y-->GA
8Y-->H8
8Y-->IM
90-->16
90-->36
90-->41
90-->50
90-->GA
90-->H8
90-->IM
91-->8V
91-->GA
92-->8W
92-->91
96-->9N
96-->9P
96-->16
96-->36
96-->41
96-->H8
96-->IM
98-->9O
98-->H8
9A-->96
9A-->9G
9A-->9J
9A-->H8
9C-->16
9C-->H8
9E-->9R
9E-->H8
9G-->9O
9G-->9P
9G-->9R
9G-->98
9G-->9C
9G-->9E
9G-->16
9G-->36
9G-->H8
9G-->IM
9H-->96
9H-->98
9H-->9A
9H-->9C
9H-->9E
9H-->9G
9H-->9J
9H-->9L
9J-->9M
9J-->9P
9J-->9T
9J-->9U
9J-->9L
9J-->36
9J-->H8
9J-->IM
9L-->9U
9M-->16
9N-->16
9N-->41
9N-->H8
9N-->IM
9O-->9M
9O-->16
9O-->41
9O-->H8
9O-->IM
9P-->16
9P-->36
9P-->41
9P-->50
9Q-->9A
9Q-->GA
9R-->16
9R-->41
9R-->H8
9R-->IM
9S-->9H
9S-->9M
9S-->9N
9S-->9O
9S-->9P
9S-->9Q
9S-->9R
9S-->9T
9S-->9U
9T-->41
9T-->GA
9T-->IM
9Y-->A7
9Y-->H8
A0-->A8
A0-->A2
A0-->H8
A2-->A8
A2-->H8
A4-->A8
A4-->H8
A5-->9Y
A5-->A0
A5-->A2
A5-->A4
A9-->9Y
A9-->A0
A9-->A4
A9-->A8
AA-->A5
AA-->A8
AA-->A9
AE-->1Z
AE-->H8
AF-->AE
AG-->AE
AH-->AF
AH-->AG
AJ-->16
AM-->BI
AM-->5T
AM-->H8
AO-->H8
AQ-->AU
AQ-->H8
AS-->AU
AS-->H8
AU-->H8
AW-->AJ
AW-->AU
AW-->H8
AY-->BM
AY-->H8
B0-->AJ
B0-->H8
B2-->BH
B2-->1P
B2-->36
B2-->H8
B4-->AJ
B4-->BG
B4-->BM
B4-->BN
B4-->AQ
B4-->AS
B4-->AW
B4-->AY
B4-->B0
B4-->B6
B4-->16
B4-->1P
B4-->H8
B6-->BG
B6-->1P
B6-->H8
B6-->IM
B8-->BI
B8-->BN
B8-->B2
B8-->BF
B8-->16
B8-->1P
B8-->H8
BA-->BH
BA-->16
BA-->1P
BA-->36
BA-->H8
BC-->BJ
BC-->AO
BC-->B4
BC-->B8
BC-->BA
BC-->36
BC-->H8
BD-->B4
BD-->B6
BD-->B8
BD-->BA
BD-->BC
BF-->BI
BF-->AM
BF-->16
BF-->H8
BG-->1P
BG-->H8
BH-->16
BH-->1P
BH-->IM
BI-->16
BJ-->AJ
BJ-->BG
BJ-->BI
BJ-->BN
BJ-->16
BJ-->1P
BJ-->36
BJ-->5T
BK-->BC
BL-->AJ
BL-->BD
BL-->BI
BL-->BK
BL-->BM
BL-->BN
BM-->AJ
BN-->16
BN-->4M
BP-->41
BS-->BP
BS-->CT
BS-->H8
BS-->IM
BU-->CP
BU-->H8
BW-->H8
BY-->CQ
BY-->CR
BY-->CT
BY-->36
BY-->41
BY-->H8
C0-->CT
C0-->4R
C0-->GA
C0-->H8
C2-->CO
C2-->CT
C2-->BW
C2-->36
C2-->41
C2-->GA
C2-->H8
C2-->IM
C4-->CR
C4-->CT
C4-->BS
C4-->C6
C4-->36
C4-->41
C4-->H8
C4-->IM
C6-->H8
C8-->CP
C8-->CT
C8-->BU
CA-->CP
CA-->CT
CA-->H8
CC-->CT
CC-->CW
CC-->BY
CC-->C2
CC-->C4
CC-->C6
CC-->C8
CC-->CA
CC-->CG
CC-->CN
CC-->36
CC-->41
CC-->GA
CC-->H8
CC-->IM
CE-->CP
CE-->CT
CE-->BS
CE-->BU
CE-->C0
CE-->C8
CE-->CA
CE-->H8
CG-->CT
CG-->36
CG-->41
CG-->50
CG-->GA
CG-->H8
CG-->IM
CH-->BS
CH-->BU
CH-->BW
CH-->BY
CH-->C2
CH-->C4
CH-->CA
CH-->CC
CH-->CE
CH-->CG
CH-->CJ
CH-->CL
CH-->CN
CJ-->CL
CJ-->H8
CL-->CR
CL-->CT
CL-->CV
CL-->CW
CL-->H8
CL-->IM
CN-->CT
CN-->CV
CN-->CW
CN-->CL
CN-->16
CN-->H8
CO-->41
CO-->GA
CO-->IM
CP-->16
CQ-->CR
CQ-->16
CQ-->41
CQ-->H8
CQ-->IM
CR-->IM
CS-->CC
CS-->CE
CS-->CJ
CS-->GA
CT-->BP
CT-->CR
CT-->16
CT-->36
CT-->41
CT-->4M
CT-->4R
CT-->50
CU-->CH
CU-->CP
CU-->CR
CU-->CS
CU-->CT
CU-->CV
CU-->CW
CV-->16
CW-->16
CZ-->D1
CZ-->D5
CZ-->D7
CZ-->D9
D1-->D3
D1-->D5
D1-->D7
D1-->D9
D1-->H8
D3-->DC
D3-->6Z
D3-->H8
D5-->DC
D5-->29
D5-->36
D5-->6Z
D5-->H8
D7-->16
D7-->29
D7-->36
D7-->6Z
D7-->H8
D7-->IM
D9-->16
D9-->36
D9-->6Z
D9-->H8
D9-->IM
DA-->CZ
DA-->DB
DB-->D1
DC-->6Z
DC-->H8
DF-->DH
DF-->DJ
DF-->DL
DF-->DN
DF-->DP
DF-->DR
DF-->DT
DF-->DV
DF-->DX
DH-->DN
DH-->16
DH-->22
DH-->H8
DH-->IM
DJ-->16
DJ-->22
DJ-->GA
DJ-->H8
DL-->DZ
DL-->H8
DN-->16
DN-->22
DN-->GA
DN-->H8
DN-->IM
DP-->E0
DP-->E4
DP-->DH
DP-->DJ
DP-->DR
DP-->DT
DP-->DV
DP-->22
DP-->36
DP-->H8
DR-->E1
DR-->16
DR-->36
DR-->H8
DR-->J4
DT-->16
DT-->36
DT-->H8
DT-->IM
DV-->E2
DV-->16
DV-->22
DV-->36
DV-->GA
DV-->H8
DX-->DZ
DX-->E4
DX-->DL
DX-->DR
DX-->16
DX-->H8
DY-->DF
DY-->DZ
DY-->E0
DY-->E1
DY-->E2
DY-->E3
DY-->E4
DZ-->E0
DZ-->E1
DZ-->16
DZ-->22
DZ-->H8
DZ-->IM
E0-->22
E0-->H8
E0-->IM
E1-->16
E2-->22
E2-->IM
E3-->DP
E3-->DX
E3-->GA
E4-->16
E4-->22
E4-->36
E4-->4M
E4-->IM
E6-->H8
E9-->E6
E9-->EO
E9-->EB
E9-->ED
E9-->36
E9-->41
E9-->H8
E9-->IM
EB-->E6
EB-->H8
ED-->E6
ED-->H8
EE-->E9
EE-->EB
EE-->ED
EE-->EI
EE-->EK
EG-->H8
EI-->E9
EI-->EK
EI-->36
EI-->H8
EK-->EN
EK-->EO
EK-->EG
EK-->36
EK-->41
EK-->GA
EK-->H8
EK-->IM
EL-->EE
EL-->EP
EM-->16
EM-->41
EN-->H8
EO-->EM
EO-->16
EO-->36
EO-->41
EO-->4M
EO-->50
EP-->EI
ET-->F
ET-->H8
EU-->F4
EW-->1Z
EW-->H8
EY-->ET
EY-->F
EY-->H8
F0-->36
F0-->H8
F0-->IM
F2-->8R
F2-->H8
F4-->EW
F4-->EY
F4-->F0
F4-->F2
F4-->F6
F4-->F8
F4-->FA
F4-->H8
F6-->36
F6-->H8
F6-->IM
F8-->36
F8-->H8
F8-->IM
FA-->36
FA-->4R
FA-->H8
FB-->EU
FB-->FC
FC-->F4
FE-->16
FH-->16
FH-->36
FH-->4W
FH-->H8
FH-->IM
FJ-->FE
FK-->FM
FK-->FQ
FK-->FS
FK-->FW
FK-->FY
FM-->FE
FM-->M
FM-->36
FM-->H8
FO-->FE
FO-->G1
FO-->FJ
FO-->H8
FO-->IM
FQ-->FE
FQ-->FH
FQ-->M
FQ-->16
FQ-->36
FQ-->4W
FQ-->6Z
FQ-->H8
FQ-->IM
FS-->FE
FS-->G0
FS-->M
FS-->36
FS-->H8
FS-->IM
FU-->FE
FU-->G1
FU-->FJ
FU-->H8
FU-->IM
FW-->FE
FW-->G0
FW-->G1
FW-->G3
FW-->FM
FW-->FO
FW-->FQ
FW-->FS
FW-->FU
FW-->FY
FW-->M
FW-->16
FW-->36
FW-->50
FW-->6Z
FW-->H8
FW-->IM
FY-->36
FY-->50
FY-->H8
FY-->IM
FZ-->G2
G0-->16
G0-->50
G1-->16
G1-->IM
G2-->FW
G3-->16
GA-->G6
GA-->G7
GA-->G9
GA-->GB
GA-->GC
GC-->IM
GF-->GL
GF-->GZ
GF-->H1
GF-->HA
GF-->I2
GF-->16
GF-->IM
GH-->IM
GJ-->IM
GL-->IM
GN-->IM
GP-->GL
GP-->HC
GP-->HG
GP-->I2
GR-->IM
GT-->GL
GT-->GX
GT-->IM
GV-->IM
GX-->IM
GZ-->H3
GZ-->I2
H1-->IM
H3-->IM
H7-->GL
H7-->HE
H8-->GF
H8-->GH
H8-->GJ
H8-->GL
H8-->GN
H8-->GP
H8-->GR
H8-->GT
H8-->GV
H8-->GX
H8-->GZ
H8-->H1
H8-->H3
H8-->H5
H8-->H7
H8-->HA
H8-->HC
H8-->HE
H8-->HG
H8-->HI
H8-->HK
H8-->HM
H8-->HO
H8-->HQ
H8-->HS
H8-->HU
H8-->HW
H8-->HY
H8-->I0
H8-->I2
HA-->IM
HC-->IM
HE-->H3
HG-->IM
HI-->H3
HI-->I2
HK-->GL
HK-->H3
HK-->I2
HK-->IM
HM-->IM
HO-->IM
HQ-->GL
HQ-->36
HS-->GF
HS-->GL
HS-->H3
HS-->HM
HS-->I2
HS-->16
HS-->IM
HU-->IM
HW-->HO
HW-->I2
HW-->IM
HY-->IM
I0-->IM
I2-->IM
I4-->ID
I8-->II
IB-->II
IC-->ID
ID-->II
IH-->II
II-->11
IM-->I4
IM-->I5
IM-->I6
IM-->I7
IM-->I8
IM-->I9
IM-->IA
IM-->IB
IM-->ID
IM-->IC
IM-->IE
IM-->IF
IM-->IG
IM-->II
IM-->IJ
IM-->IK
IM-->IL
IM-->IN
IM-->IO
IM-->IP
IM-->IQ
IM-->IR
IM-->IS
IM-->IT
IM-->IU
IM-->IV
IM-->IW
IM-->IX
IM-->IY
IM-->IZ
IM-->J0
IM-->J5
IM-->J6
IQ-->II
IT-->IB
IT-->IU
IU-->IB
IX-->I8
```
