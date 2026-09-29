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
- 484 leaf nodes, 1494 edges.
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
T["app-db.ts"]
U["app-settings.repository.ts"]
V["binary-artifact.ts"]
W["categories.repository.ts"]
X["category-comparison-settings.repository.ts"]
Y["category-model.repository.ts"]
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
subgraph 25["local-migration"]
26["index.ts"]
27["local-database-name.ts"]
28["local-database.gateway.ts"]
29["local-database.ts"]
subgraph 2A["local-migration-dialog"]
2B["local-migration-dialog.component.ts"]
end
2C["local-migration.service.ts"]
2D["migration-choice.ts"]
end
subgraph 2E["ml"]
2F["category-model.worker.ts"]
2G["category-model.worker.types.ts"]
2H["feature-hashing.ts"]
2I["index.ts"]
2J["model-config.ts"]
2K["rule-proposal-mining.ts"]
2L["training-window.ts"]
end
subgraph 2M["onboarding"]
2N["home-redirect.guard.ts"]
2O["index.ts"]
2P["mark-visited.guard.ts"]
2Q["visited.service.ts"]
end
subgraph 2R["qr-sync"]
2S["index.ts"]
2T["qr-camera-scanner.ts"]
2U["qr-code-renderer.ts"]
2V["qr-frames.ts"]
2W["qr-payload-codec.ts"]
2X["qr-sync.service.ts"]
2Y["qr-transfer-payload.ts"]
end
subgraph 2Z["server-status"]
30["index.ts"]
31["server-status.interceptor.ts"]
32["server-status.service.ts"]
subgraph 33["server-unreachable"]
34["server-unreachable.component.ts"]
end
35["transport-failure.ts"]
end
subgraph 36["state"]
37["accounts.store.ts"]
38["app-settings.store.ts"]
39["categories.store.ts"]
3A["chart-options-control.ts"]
3B["chart-options.store.ts"]
3C["forecast-settings.store.ts"]
3D["goals.store.ts"]
3E["import-batches.store.ts"]
3F["index.ts"]
3G["page-range-control.ts"]
3H["range-state.store.ts"]
3I["transactions.store.ts"]
3J["transfer-settings.store.ts"]
3K["transfers.store.ts"]
end
subgraph 3L["stats"]
3M["account-balance-history.ts"]
3N["account-balance-trend.ts"]
3O["annual-lump-sum-smoothing.ts"]
3P["category-breakdown.ts"]
3Q["category-composition-trend.ts"]
3R["category-cycle-heatmap.ts"]
3S["category-expense-transactions.ts"]
3T["category-kind-contribution.ts"]
3U["category-period-comparison.ts"]
3V["chart-zoom-window.ts"]
3W["classify-for-stats.ts"]
3X["classify-joint-leg.ts"]
3Y["day-transactions.ts"]
3Z["embedded-bonus-smoothing.ts"]
40["full-history-range.ts"]
41["goal-affordability.ts"]
42["granularity-for-span.ts"]
43["gross-net-growth.ts"]
44["gross-net-ratio.ts"]
45["income-category-series.ts"]
46["income-events.ts"]
47["income-gap-detection.ts"]
48["income-growth.ts"]
49["income-step-change-detection.ts"]
4A["index.ts"]
4B["joint-account-stake.ts"]
4C["joint-contributor-breakdown.ts"]
4D["money-flow-graph.ts"]
4E["multi-year-income-comparison.ts"]
4F["net-margin.ts"]
4G["net-worth-projection.ts"]
4H["period-stats.ts"]
4I["period-window.ts"]
4J["periodized-rate.ts"]
4K["recurring-payments.ts"]
4L["recurring-projection.ts"]
4M["required-saving-rate.ts"]
4N["saving-velocity.ts"]
4O["spending-mosaic.ts"]
4P["top-transactions.ts"]
4Q["wage-change-detection.ts"]
4R["weekday-weekend-split.ts"]
4S["year-over-year.ts"]
4T["yearly-income-summary.ts"]
end
subgraph 4U["storage"]
4V["index.ts"]
4W["storage-status.service.ts"]
end
subgraph 4X["store-reset"]
4Y["index.ts"]
4Z["store-reset.service.ts"]
50["with-hydration.ts"]
end
subgraph 51["theme"]
52["accent-colors.ts"]
53["index.ts"]
54["theme-styles.ts"]
55["theme.service.ts"]
end
subgraph 56["transactions"]
57["attribution-override.ts"]
58["index.ts"]
59["nullify-transaction.ts"]
5A["transaction-deletion.service.ts"]
end
subgraph 5B["transfers"]
5C["index.ts"]
5D["transfer-cleanup-result.ts"]
5E["transfer-linking.service.ts"]
5F["transfer-matching.service.ts"]
5G["transfer-matching.ts"]
end
end
subgraph 5H["feature-accounts"]
5I["account-card-vm.ts"]
5J["account-icons.ts"]
5K["account-list-order.ts"]
5L["account-types.ts"]
5M["accounts.routes.ts"]
5N["balance-day-tooltip.ts"]
5O["balance-trend-signals.ts"]
subgraph 5P["components"]
subgraph 5Q["account-balance-block"]
5R["account-balance-block.component.ts"]
end
subgraph 5S["account-balance-chart"]
5T["account-balance-chart.component.ts"]
end
subgraph 5U["account-balance-history-chart"]
5V["account-balance-history-chart.component.ts"]
end
subgraph 5W["account-card"]
5X["account-card.component.ts"]
end
subgraph 5Y["account-form"]
5Z["account-form.component.ts"]
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
H-->30
H-->4Y
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
S-->30
T-->11
T-->1C
T-->IS
U-->S
U-->11
U-->1C
U-->53
U-->IY
W-->S
W-->11
X-->S
X-->11
X-->1C
Y-->S
Y-->V
Y-->11
Y-->1C
Z-->S
Z-->11
Z-->1C
10-->S
13-->S
13-->11
13-->1C
13-->4A
14-->S
14-->11
15-->S
15-->11
16-->Q
16-->S
16-->T
16-->U
16-->W
16-->X
16-->Y
16-->Z
16-->10
16-->13
16-->14
16-->15
16-->17
16-->18
16-->19
16-->1A
16-->1B
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
1H-->IY
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
1O-->IY
1P-->1H
1P-->1I
1P-->1J
1P-->1L
1P-->1M
1P-->1N
1P-->1O
1S-->1V
1S-->F
1S-->26
1S-->30
1S-->3F
1S-->GT
1S-->GX
1S-->IE
1V-->F
1V-->GT
1V-->GX
1V-->IE
1W-->1S
1Z-->1Y
21-->IY
22-->21
22-->23
22-->24
23-->21
23-->16
23-->IY
24-->21
24-->23
24-->16
26-->2B
26-->2C
28-->29
28-->27
29-->27
29-->T
29-->10
29-->11
2B-->2C
2B-->16
2B-->GT
2B-->GX
2B-->HS
2B-->IE
2C-->29
2C-->28
2C-->2D
2C-->16
2C-->2J
2C-->4Y
2F-->2G
2F-->2H
2F-->2J
2G-->2J
2H-->2J
2I-->2G
2I-->2H
2I-->2J
2I-->2K
2I-->2L
2J-->11
2K-->M
2K-->16
2N-->2Q
2O-->2N
2O-->2P
2O-->2Q
2P-->2Q
2S-->2T
2S-->2U
2S-->2V
2S-->2W
2S-->2X
2S-->2Y
2X-->2V
2X-->2W
2X-->2Y
2X-->16
2Y-->16
30-->31
30-->32
30-->34
30-->35
31-->B
31-->32
31-->35
32-->35
37-->39
37-->3I
37-->3K
37-->5
37-->16
37-->4A
37-->4Y
37-->5C
37-->IY
38-->16
38-->4Y
38-->53
38-->IY
39-->3I
39-->16
39-->4Y
39-->IY
3A-->3B
3A-->4A
3A-->GM
3A-->IY
3B-->4A
3B-->GM
3B-->IY
3C-->16
3C-->4A
3C-->4Y
3D-->16
3D-->4Y
3D-->IY
3E-->3I
3E-->3K
3E-->M
3E-->16
3E-->1P
3E-->4Y
3F-->37
3F-->38
3F-->39
3F-->3A
3F-->3B
3F-->3C
3F-->3D
3F-->3E
3F-->3G
3F-->3H
3F-->3I
3F-->3J
3F-->3K
3G-->37
3G-->38
3G-->3H
3G-->3I
3G-->16
3G-->4A
3G-->IY
3H-->38
3H-->IY
3I-->16
3I-->4Y
3I-->58
3I-->5C
3J-->16
3J-->4Y
3K-->3I
3K-->3J
3K-->16
3K-->4Y
3K-->5C
3M-->16
3M-->IY
3N-->3M
3N-->16
3N-->IY
3O-->3Q
3O-->45
3O-->IY
3P-->3W
3P-->16
3Q-->3P
3Q-->16
3Q-->IY
3R-->3P
3R-->3W
3R-->16
3R-->IY
3S-->3W
3S-->16
3T-->16
3U-->3P
3U-->4I
3U-->16
3V-->IY
3W-->3T
3W-->3X
3W-->16
3W-->5C
3X-->5
3X-->16
3Y-->16
3Z-->3Q
3Z-->45
3Z-->16
3Z-->IY
40-->16
41-->16
41-->IY
42-->IY
43-->44
44-->45
44-->16
45-->3Q
45-->16
45-->IY
46-->47
46-->49
46-->4Q
46-->16
47-->3Q
47-->45
47-->IY
48-->45
48-->4S
48-->IY
49-->3Q
49-->3Z
49-->45
49-->IY
4A-->3M
4A-->3N
4A-->3O
4A-->3P
4A-->3Q
4A-->3R
4A-->3S
4A-->3T
4A-->3U
4A-->3V
4A-->3W
4A-->3X
4A-->3Y
4A-->3Z
4A-->40
4A-->41
4A-->42
4A-->43
4A-->44
4A-->45
4A-->46
4A-->47
4A-->48
4A-->49
4A-->4B
4A-->4C
4A-->4D
4A-->4E
4A-->4F
4A-->4G
4A-->4H
4A-->4I
4A-->4J
4A-->4K
4A-->4L
4A-->4M
4A-->4N
4A-->4O
4A-->4P
4A-->4Q
4A-->4R
4A-->4S
4A-->4T
4B-->3X
4B-->16
4C-->3X
4C-->5
4C-->16
4D-->16
4D-->IY
4E-->4T
4G-->IY
4H-->3W
4H-->16
4I-->IY
4J-->IY
4K-->3W
4K-->M
4K-->16
4K-->IY
4L-->4K
4L-->IY
4M-->16
4M-->IY
4N-->4H
4N-->16
4N-->11
4N-->IY
4O-->3P
4O-->3S
4O-->16
4P-->16
4P-->5C
4Q-->44
4R-->3W
4R-->16
4R-->IY
4S-->4H
4S-->16
4T-->3Q
4T-->16
4T-->IY
4V-->4W
4Y-->4Z
4Y-->50
50-->4Z
50-->30
52-->54
52-->11
53-->52
53-->54
53-->55
55-->54
57-->16
58-->57
58-->59
58-->5A
59-->16
5A-->16
5A-->5C
5C-->5D
5C-->5E
5C-->5G
5C-->5F
5E-->5G
5E-->16
5F-->5E
5F-->5G
5F-->16
5G-->6
5G-->16
5G-->IY
5I-->66
5I-->16
5J-->16
5K-->16
5L-->16
5M-->61
5M-->63
5M-->GM
5N-->4A
5N-->IY
5O-->16
5O-->3F
5O-->4A
5O-->IY
5R-->HK
5R-->IY
5T-->5N
5T-->5O
5T-->16
5T-->4A
5T-->GM
5T-->HK
5T-->IY
5V-->5N
5V-->5O
5V-->16
5V-->3F
5V-->4A
5V-->GM
5V-->HK
5X-->5I
5X-->5J
5X-->5R
5X-->HK
5Z-->5J
5Z-->5L
5Z-->16
5Z-->HK
5Z-->IY
5Z-->JF
5Z-->JG
61-->66
61-->5R
61-->5T
61-->5Z
61-->3F
61-->HK
61-->IY
63-->5I
63-->5J
63-->5K
63-->66
63-->5V
63-->5X
63-->5Z
63-->16
63-->3F
63-->HK
63-->IY
64-->5R
64-->5T
64-->5V
64-->5X
64-->5Z
64-->61
64-->63
65-->5J
65-->5L
65-->5M
65-->64
66-->IY
68-->F
68-->HK
68-->IY
69-->F
69-->4Y
6A-->6K
6B-->6N
6E-->69
6E-->F
6E-->HK
6G-->68
6G-->69
6G-->HK
6I-->68
6I-->HK
6K-->68
6K-->69
6K-->6E
6K-->6G
6K-->6I
6K-->F
6K-->HK
6L-->6N
6N-->F
6N-->GT
6N-->GX
6N-->HD
6N-->HM
6N-->HY
6N-->IE
6O-->6A
6O-->6B
6O-->6L
6Q-->6X
6Q-->7A
6S-->2I
6T-->6S
6T-->7H
6T-->16
6T-->2I
6T-->3F
6T-->4Y
6U-->16
6U-->HK
6X-->6R
6X-->6U
6X-->6Z
6X-->M
6X-->16
6X-->3F
6X-->HK
6X-->IY
6Z-->6R
6Z-->16
6Z-->HK
70-->6X
70-->6Z
70-->74
70-->76
70-->78
70-->7A
72-->7C
72-->7E
72-->M
72-->16
72-->3F
72-->HK
74-->7D
74-->3F
74-->HK
74-->IY
76-->7C
76-->72
76-->M
76-->16
76-->3F
76-->HK
78-->7F
78-->7H
78-->HK
78-->IY
7A-->7D
7A-->7G
7A-->7H
7A-->74
7A-->76
7A-->78
7A-->16
7A-->3F
7A-->HK
7A-->IY
7B-->6Q
7B-->6R
7B-->6S
7B-->6T
7B-->70
7B-->7D
7B-->7G
7B-->7H
7C-->7E
7C-->16
7D-->7G
7D-->16
7E-->16
7F-->16
7G-->7E
7G-->16
7H-->7F
7H-->M
7H-->16
7H-->3F
7H-->4Y
7H-->IY
7J-->7O
7M-->HK
7O-->7R
7O-->7S
7O-->7T
7O-->7U
7O-->7M
7O-->HK
7P-->7O
7T-->7R
7U-->7S
7V-->7J
7V-->7P
7X-->16
7X-->4Y
81-->3F
81-->HK
81-->IY
83-->3F
83-->5C
83-->HK
83-->IY
85-->8T
85-->3F
85-->4A
85-->GM
85-->HK
85-->IY
87-->7X
87-->7Y
87-->8T
87-->89
87-->8B
87-->3F
87-->HK
87-->IY
89-->3F
89-->HK
8B-->7Y
8B-->HK
8D-->8P
8D-->8Q
8D-->16
8D-->HK
8F-->8P
8F-->8Q
8F-->8T
8F-->81
8F-->83
8F-->85
8F-->87
8F-->8D
8F-->8I
8F-->8K
8F-->8M
8F-->8O
8F-->3F
8F-->4A
8F-->HK
8F-->IY
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
8I-->3F
8I-->4A
8I-->5C
8I-->GM
8I-->HK
8I-->IY
8K-->8T
8K-->3F
8K-->HK
8K-->IY
8M-->3F
8M-->4A
8M-->5C
8M-->GM
8M-->HK
8M-->IY
8O-->8T
8O-->3F
8O-->HK
8O-->IY
8P-->8Q
8P-->16
8P-->4Y
8Q-->16
8R-->8F
8R-->GM
8S-->8G
8S-->8R
8T-->7X
8T-->3F
8T-->4A
8T-->5C
8X-->90
8X-->92
8X-->16
8X-->26
8X-->2S
8X-->4V
8X-->HK
8X-->IY
8Y-->8X
90-->2S
90-->HK
92-->16
92-->2S
92-->HK
93-->8Y
97-->9A
97-->9C
97-->3F
97-->HK
98-->97
98-->9A
98-->9C
9A-->3F
9A-->4A
9A-->GM
9A-->HK
9A-->IY
9C-->16
9C-->3F
9C-->4A
9C-->5C
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
9I-->3F
9I-->4A
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
9S-->3F
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
9V-->3F
9V-->HK
9V-->IY
9X-->A6
9Y-->16
9Z-->16
9Z-->4A
9Z-->HK
9Z-->IY
A0-->9Y
A0-->16
A0-->4A
A0-->HK
A0-->IY
A1-->16
A1-->3F
A1-->4A
A1-->5C
A2-->9M
A2-->GM
A3-->16
A3-->4A
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
A5-->4A
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
AQ-->1Z
AQ-->HK
AR-->AQ
AS-->AQ
AT-->AR
AT-->AS
AV-->16
AY-->BU
AY-->65
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
BE-->1P
BE-->3F
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
BG-->1P
BG-->HK
BI-->BS
BI-->1P
BI-->HK
BI-->IY
BK-->BU
BK-->BZ
BK-->BE
BK-->BR
BK-->16
BK-->1P
BK-->HK
BM-->BT
BM-->16
BM-->1P
BM-->3F
BM-->HK
BO-->BV
BO-->B0
BO-->BG
BO-->BK
BO-->BM
BO-->3F
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
BS-->1P
BS-->HK
BT-->16
BT-->1P
BT-->IY
BU-->16
BV-->AV
BV-->BS
BV-->BU
BV-->BZ
BV-->16
BV-->1P
BV-->3F
BV-->65
BW-->BO
BX-->AV
BX-->BP
BX-->BU
BX-->BW
BX-->BY
BX-->BZ
BY-->AV
BZ-->16
BZ-->4Y
C1-->4A
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
CA-->3F
CA-->4A
CA-->HK
CC-->D5
CC-->53
CC-->GM
CC-->HK
CE-->D0
CE-->D5
CE-->C8
CE-->3F
CE-->4A
CE-->GM
CE-->HK
CE-->IY
CG-->D3
CG-->D5
CG-->C4
CG-->CI
CG-->3F
CG-->4A
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
CO-->3F
CO-->4A
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
CS-->3F
CS-->4A
CS-->5C
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
D0-->4A
D0-->GM
D0-->IY
D1-->16
D2-->D3
D2-->16
D2-->4A
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
D5-->3F
D5-->4A
D5-->4Y
D5-->53
D5-->5C
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
DF-->7B
DF-->HK
DH-->DO
DH-->2I
DH-->3F
DH-->7B
DH-->HK
DJ-->16
DJ-->2I
DJ-->3F
DJ-->7B
DJ-->HK
DJ-->IY
DL-->16
DL-->3F
DL-->7B
DL-->HK
DL-->IY
DM-->DB
DM-->DN
DN-->DD
DO-->7B
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
DT-->22
DT-->HK
DT-->IY
DV-->16
DV-->22
DV-->GM
DV-->HK
DX-->EB
DX-->HK
DZ-->16
DZ-->22
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
E1-->22
E1-->3F
E1-->HK
E3-->ED
E3-->16
E3-->3F
E3-->HK
E3-->JG
E5-->16
E5-->3F
E5-->HK
E5-->IY
E7-->EE
E7-->16
E7-->22
E7-->3F
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
EB-->22
EB-->HK
EB-->IY
EC-->22
EC-->HK
EC-->IY
ED-->16
EE-->22
EE-->IY
EF-->E1
EF-->E9
EF-->GM
EG-->16
EG-->22
EG-->3F
EG-->4Y
EG-->IY
EI-->HK
EL-->EI
EL-->F0
EL-->EN
EL-->EP
EL-->3F
EL-->4A
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
EU-->3F
EU-->HK
EW-->EZ
EW-->F0
EW-->ES
EW-->3F
EW-->4A
EW-->GM
EW-->HK
EW-->IY
EX-->EQ
EX-->F1
EY-->16
EY-->4A
EZ-->HK
F0-->EY
F0-->16
F0-->3F
F0-->4A
F0-->4Y
F0-->5C
F1-->EU
F5-->F
F5-->HK
F6-->FG
F8-->1Z
F8-->HK
FA-->F5
FA-->F
FA-->HK
FC-->3F
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
FI-->3F
FI-->HK
FI-->IY
FK-->3F
FK-->HK
FK-->IY
FM-->3F
FM-->53
FM-->HK
FN-->F6
FN-->FO
FO-->FG
FQ-->16
FT-->16
FT-->3F
FT-->58
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
FY-->3F
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
G2-->3F
G2-->58
G2-->7B
G2-->HK
G2-->IY
G4-->FQ
G4-->GC
G4-->M
G4-->3F
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
G8-->3F
G8-->5C
G8-->7B
G8-->HK
G8-->IY
GA-->3F
GA-->5C
GA-->HK
GA-->IY
GB-->GE
GC-->16
GC-->5C
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
I2-->3F
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
