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
- 487 leaf nodes, 1544 edges.
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
1J["column-guess.ts"]
1K["csv-import.service.ts"]
1L["csv-parse.ts"]
1M["csv-parse.worker.ts"]
1N["csv-row-mapper.ts"]
1O["csv-worker.types.ts"]
1P["import.service.ts"]
1Q["index.ts"]
1R["reading-guess.ts"]
end
subgraph 1S["layout"]
subgraph 1T["app-shell"]
1U["app-shell.component.ts"]
end
1V["app-title.strategy.ts"]
subgraph 1W["backup-reminder"]
1X["backup-reminder.component.ts"]
end
subgraph 1Y["default-password-notice"]
1Z["default-password-notice.component.ts"]
end
20["index.ts"]
end
subgraph 21["links"]
22["external-links.ts"]
23["index.ts"]
end
subgraph 24["loans"]
25["amortization.ts"]
26["index.ts"]
27["loan-progress.ts"]
28["what-if.ts"]
end
subgraph 29["ml"]
2A["category-model.worker.ts"]
2B["category-model.worker.types.ts"]
2C["feature-hashing.ts"]
2D["index.ts"]
2E["model-config.ts"]
2F["rule-proposal-mining.ts"]
2G["training-window.ts"]
end
subgraph 2H["onboarding"]
2I["backup-reminder.service.ts"]
2J["home-redirect.guard.ts"]
2K["index.ts"]
2L["mark-visited.guard.ts"]
2M["visited.service.ts"]
end
subgraph 2N["qr-sync"]
2O["index.ts"]
2P["qr-camera-scanner.ts"]
2Q["qr-code-renderer.ts"]
2R["qr-frames.ts"]
2S["qr-payload-codec.ts"]
2T["qr-sync.service.ts"]
2U["qr-transfer-payload.ts"]
end
subgraph 2V["server-status"]
2W["index.ts"]
2X["server-status.interceptor.ts"]
2Y["server-status.service.ts"]
subgraph 2Z["server-unreachable"]
30["server-unreachable.component.ts"]
end
31["transport-failure.ts"]
end
subgraph 32["state"]
33["accounts.store.ts"]
34["app-settings.store.ts"]
35["categories.store.ts"]
36["chart-options-control.ts"]
37["chart-options.store.ts"]
38["forecast-settings.store.ts"]
39["goals.store.ts"]
3A["import-batches.store.ts"]
3B["index.ts"]
3C["page-range-control.ts"]
3D["range-state.store.ts"]
3E["transactions.store.ts"]
3F["transfer-settings.store.ts"]
3G["transfers.store.ts"]
end
subgraph 3H["stats"]
3I["account-balance-history.ts"]
3J["account-balance-trend.ts"]
3K["annual-lump-sum-smoothing.ts"]
3L["category-breakdown.ts"]
3M["category-composition-trend.ts"]
3N["category-cycle-heatmap.ts"]
3O["category-expense-transactions.ts"]
3P["category-kind-contribution.ts"]
3Q["category-period-comparison.ts"]
3R["chart-zoom-window.ts"]
3S["classify-for-stats.ts"]
3T["classify-joint-leg.ts"]
3U["day-transactions.ts"]
3V["embedded-bonus-smoothing.ts"]
3W["full-history-range.ts"]
3X["goal-affordability.ts"]
3Y["granularity-for-span.ts"]
3Z["gross-net-growth.ts"]
40["gross-net-ratio.ts"]
41["income-category-series.ts"]
42["income-events.ts"]
43["income-gap-detection.ts"]
44["income-growth.ts"]
45["income-step-change-detection.ts"]
46["index.ts"]
47["joint-account-stake.ts"]
48["joint-contributor-breakdown.ts"]
49["money-flow-graph.ts"]
4A["multi-year-income-comparison.ts"]
4B["net-margin.ts"]
4C["net-worth-projection.ts"]
4D["period-stats.ts"]
4E["period-window.ts"]
4F["periodized-rate.ts"]
4G["recurring-payments.ts"]
4H["recurring-projection.ts"]
4I["required-saving-rate.ts"]
4J["saving-velocity.ts"]
4K["spending-mosaic.ts"]
4L["top-transactions.ts"]
4M["transfer-flows.ts"]
4N["wage-change-detection.ts"]
4O["weekday-weekend-split.ts"]
4P["year-over-year.ts"]
4Q["yearly-income-summary.ts"]
end
subgraph 4R["store-reset"]
4S["index.ts"]
4T["store-reset.service.ts"]
4U["with-hydration.ts"]
end
subgraph 4V["theme"]
4W["accent-colors.ts"]
4X["index.ts"]
4Y["theme-styles.ts"]
4Z["theme.service.ts"]
end
subgraph 50["transactions"]
51["attribution-override.ts"]
52["index.ts"]
53["nullify-transaction.ts"]
54["transaction-deletion.service.ts"]
end
subgraph 55["transfers"]
56["index.ts"]
57["transfer-cleanup-result.ts"]
58["transfer-counterpart.ts"]
59["transfer-linking.service.ts"]
5A["transfer-matching.service.ts"]
5B["transfer-matching.ts"]
end
subgraph 5C["ui-preferences"]
5D["index.ts"]
5E["ui-preferences.service.ts"]
5F["ui-preferences.testing.ts"]
end
end
subgraph 5G["feature-accounts"]
5H["account-card-vm.ts"]
5I["account-icons.ts"]
5J["account-list-order.ts"]
5K["account-types.ts"]
5L["accounts.routes.ts"]
5M["balance-day-tooltip.ts"]
5N["balance-trend-signals.ts"]
subgraph 5O["components"]
subgraph 5P["account-balance-block"]
5Q["account-balance-block.component.ts"]
end
subgraph 5R["account-balance-chart"]
5S["account-balance-chart.component.ts"]
end
subgraph 5T["account-balance-history-chart"]
5U["account-balance-history-chart.component.ts"]
end
subgraph 5V["account-card"]
5W["account-card.component.ts"]
end
subgraph 5X["account-form"]
5Y["account-form.component.ts"]
end
subgraph 5Z["account-insights"]
60["account-insights.component.ts"]
end
subgraph 61["accounts-detail"]
62["accounts-detail.component.ts"]
end
subgraph 63["accounts-overview"]
64["accounts-overview.component.ts"]
end
65["index.ts"]
end
66["index.ts"]
67["last-import-status.ts"]
end
subgraph 68["feature-auth"]
69["admin-user-row.ts"]
6A["admin-users.store.ts"]
6B["admin.routes.ts"]
6C["auth.routes.ts"]
subgraph 6D["components"]
subgraph 6E["admin-create-account-dialog"]
6F["admin-create-account-dialog.component.ts"]
end
subgraph 6G["admin-reset-password-dialog"]
6H["admin-reset-password-dialog.component.ts"]
end
subgraph 6I["admin-user-actions"]
6J["admin-user-actions.component.ts"]
end
subgraph 6K["admin-users-page"]
6L["admin-users-page.component.ts"]
end
6M["index.ts"]
subgraph 6N["login-page"]
6O["login-page.component.ts"]
end
end
6P["index.ts"]
end
subgraph 6Q["feature-categories"]
6R["categories.routes.ts"]
6S["category-icons.ts"]
6T["category-model.service.ts"]
6U["category-model.store.ts"]
6V["category-row-vm.ts"]
subgraph 6W["components"]
subgraph 6X["categories-overview"]
6Y["categories-overview.component.ts"]
end
subgraph 6Z["category-form"]
70["category-form.component.ts"]
end
71["index.ts"]
subgraph 72["rule-condition-row"]
73["rule-condition-row.component.ts"]
end
subgraph 74["rule-filters"]
75["rule-filters.component.ts"]
end
subgraph 76["rule-form"]
77["rule-form.component.ts"]
end
subgraph 78["rule-share-bar"]
79["rule-share-bar.component.ts"]
end
subgraph 7A["rules-overview"]
7B["rules-overview.component.ts"]
end
end
7C["index.ts"]
7D["rule-condition-editor.ts"]
7E["rule-filters.ts"]
7F["rule-labels.ts"]
7G["rule-share.ts"]
7H["rule-summary.ts"]
7I["rules.store.ts"]
end
subgraph 7J["feature-changelog"]
7K["changelog.routes.ts"]
subgraph 7L["components"]
subgraph 7M["changelog-entry-row"]
7N["changelog-entry-row.component.ts"]
end
subgraph 7O["changelog-page"]
7P["changelog-page.component.ts"]
end
7Q["index.ts"]
end
subgraph 7R["data"]
7S["changelog-entries.ts"]
7T["roadmap-entries.ts"]
end
7U["group-changelog-entries.ts"]
7V["group-roadmap-entries.ts"]
7W["index.ts"]
end
subgraph 7X["feature-dashboard"]
7Y["category-comparison-settings.store.ts"]
7Z["category-comparison-vm.ts"]
subgraph 80["components"]
subgraph 81["account-balance-strip"]
82["account-balance-strip.component.ts"]
end
subgraph 83["action-queue-panel"]
84["action-queue-panel.component.ts"]
end
subgraph 85["category-breakdown-panel"]
86["category-breakdown-panel.component.ts"]
end
subgraph 87["category-comparison-panel"]
88["category-comparison-panel.component.ts"]
end
subgraph 89["category-exclusion-dropdown"]
8A["category-exclusion-dropdown.component.ts"]
end
subgraph 8B["comparison-category-card"]
8C["comparison-category-card.component.ts"]
end
subgraph 8D["dashboard-customize-panel"]
8E["dashboard-customize-panel.component.ts"]
end
subgraph 8F["dashboard-overview"]
8G["dashboard-overview.component.ts"]
end
8H["index.ts"]
subgraph 8I["spending-heatmap-panel"]
8J["spending-heatmap-panel.component.ts"]
end
subgraph 8K["top-transactions-panel"]
8L["top-transactions-panel.component.ts"]
end
subgraph 8M["trend-chart-panel"]
8N["trend-chart-panel.component.ts"]
end
subgraph 8O["weekday-weekend-split-panel"]
8P["weekday-weekend-split-panel.component.ts"]
end
end
8Q["dashboard-layout-settings.store.ts"]
8R["dashboard-row-order.ts"]
8S["dashboard.routes.ts"]
8T["index.ts"]
8U["stats-scope.ts"]
8V["stats.store.ts"]
8W["transfer-categories.ts"]
end
subgraph 8X["feature-data-management"]
subgraph 8Y["components"]
subgraph 8Z["data-management-overview"]
90["data-management-overview.component.ts"]
end
91["index.ts"]
subgraph 92["qr-receive-dialog"]
93["qr-receive-dialog.component.ts"]
end
subgraph 94["qr-send-dialog"]
95["qr-send-dialog.component.ts"]
end
end
96["index.ts"]
end
subgraph 97["feature-explore"]
subgraph 98["components"]
subgraph 99["explore-overview"]
9A["explore-overview.component.ts"]
end
9B["index.ts"]
subgraph 9C["money-flow-panel"]
9D["money-flow-panel.component.ts"]
end
subgraph 9E["spending-mosaic-panel"]
9F["spending-mosaic-panel.component.ts"]
end
end
9G["explore.routes.ts"]
9H["index.ts"]
end
subgraph 9I["feature-future"]
subgraph 9J["components"]
subgraph 9K["forecast-controls"]
9L["forecast-controls.component.ts"]
end
subgraph 9M["forecast-notice"]
9N["forecast-notice.component.ts"]
end
subgraph 9O["future-overview"]
9P["future-overview.component.ts"]
end
subgraph 9Q["goal-form"]
9R["goal-form.component.ts"]
end
subgraph 9S["goal-row"]
9T["goal-row.component.ts"]
end
subgraph 9U["goals-panel"]
9V["goals-panel.component.ts"]
end
9W["index.ts"]
subgraph 9X["net-worth-projection-chart"]
9Y["net-worth-projection-chart.component.ts"]
end
subgraph 9Z["projection-figure-table"]
A0["projection-figure-table.component.ts"]
end
end
A1["forecast-chart-copy.ts"]
A2["forecast-controls-vm.ts"]
A3["forecast-notices.ts"]
A4["forecast.store.ts"]
A5["future.routes.ts"]
A6["goal-row-vm.ts"]
A7["index.ts"]
A8["net-worth-projection-chart-option.ts"]
A9["projection-accessible-row.ts"]
end
subgraph AA["feature-help"]
subgraph AB["components"]
subgraph AC["faq-page"]
AD["faq-page.component.ts"]
end
subgraph AE["guide-detail"]
AF["guide-detail.component.ts"]
end
subgraph AG["guide-steps"]
AH["guide-steps.component.ts"]
end
subgraph AI["guides-index"]
AJ["guides-index.component.ts"]
end
AK["index.ts"]
end
subgraph AL["data"]
AM["faq.ts"]
AN["guides.ts"]
end
AO["help.routes.ts"]
AP["index.ts"]
end
subgraph AQ["feature-home"]
subgraph AR["components"]
subgraph AS["home-landing"]
AT["home-landing.component.ts"]
end
AU["index.ts"]
end
AV["home.routes.ts"]
AW["index.ts"]
end
subgraph AX["feature-import"]
AY["column-mapping.ts"]
AZ["column-statements.ts"]
subgraph B0["components"]
subgraph B1["account-draft-editor"]
B2["account-draft-editor.component.ts"]
end
subgraph B3["batch-wait-card"]
B4["batch-wait-card.component.ts"]
end
subgraph B5["import-column-row"]
B6["import-column-row.component.ts"]
end
subgraph B7["import-columns-section"]
B8["import-columns-section.component.ts"]
end
subgraph B9["import-history"]
BA["import-history.component.ts"]
end
subgraph BB["import-map-step"]
BC["import-map-step.component.ts"]
end
subgraph BD["import-preview-step"]
BE["import-preview-step.component.ts"]
end
subgraph BF["import-reading-lines"]
BG["import-reading-lines.component.ts"]
end
subgraph BH["import-reading-section"]
BI["import-reading-section.component.ts"]
end
subgraph BJ["import-select-step"]
BK["import-select-step.component.ts"]
end
subgraph BL["import-what-changed"]
BM["import-what-changed.component.ts"]
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
BV["import-what-changed.ts"]
BW["import-wizard-session.ts"]
BX["import.routes.ts"]
BY["index.ts"]
BZ["mapping-profiles.store.ts"]
C0["reading-statements.ts"]
end
subgraph C1["feature-income"]
C2["career-start-date.ts"]
subgraph C3["components"]
subgraph C4["income-career-start"]
C5["income-career-start.component.ts"]
end
subgraph C6["income-category-checklist"]
C7["income-category-checklist.component.ts"]
end
subgraph C8["income-chart-cell"]
C9["income-chart-cell.component.ts"]
end
subgraph CA["income-events-sidebar"]
CB["income-events-sidebar.component.ts"]
end
subgraph CC["income-gross-color"]
CD["income-gross-color.component.ts"]
end
subgraph CE["income-gross-net-section"]
CF["income-gross-net-section.component.ts"]
end
subgraph CG["income-growth-panel"]
CH["income-growth-panel.component.ts"]
end
subgraph CI["income-inference-note"]
CJ["income-inference-note.component.ts"]
end
subgraph CK["income-lump-sum-checklist"]
CL["income-lump-sum-checklist.component.ts"]
end
subgraph CM["income-main-category"]
CN["income-main-category.component.ts"]
end
subgraph CO["income-overview"]
CP["income-overview.component.ts"]
end
subgraph CQ["income-settings-page"]
CR["income-settings-page.component.ts"]
end
subgraph CS["income-yearly-panel"]
CT["income-yearly-panel.component.ts"]
end
CU["index.ts"]
subgraph CV["salary-details-page"]
CW["salary-details-page.component.ts"]
end
subgraph CX["salary-metadata-table"]
CY["salary-metadata-table.component.ts"]
end
subgraph CZ["salary-month-modal"]
D0["salary-month-modal.component.ts"]
end
end
D1["gross-net-chart-options.ts"]
D2["income-category-vm.ts"]
D3["income-event-vm.ts"]
D4["income-granularity.ts"]
D5["income.routes.ts"]
D6["income.store.ts"]
D7["index.ts"]
D8["salary-metadata-edit.ts"]
D9["salary-metadata-rows.ts"]
end
subgraph DA["feature-learning"]
subgraph DB["components"]
DC["index.ts"]
subgraph DD["learning-overview"]
DE["learning-overview.component.ts"]
end
subgraph DF["model-status-badge"]
DG["model-status-badge.component.ts"]
end
subgraph DH["model-status"]
DI["model-status.component.ts"]
end
subgraph DJ["rule-proposals"]
DK["rule-proposals.component.ts"]
end
subgraph DL["suggestions-table"]
DM["suggestions-table.component.ts"]
end
end
DN["index.ts"]
DO["learning.routes.ts"]
DP["model-status-display.ts"]
end
subgraph DQ["feature-loans"]
subgraph DR["components"]
DS["index.ts"]
subgraph DT["loan-amortization-table"]
DU["loan-amortization-table.component.ts"]
end
subgraph DV["loan-balance-chart"]
DW["loan-balance-chart.component.ts"]
end
subgraph DX["loan-card"]
DY["loan-card.component.ts"]
end
subgraph DZ["loan-composition-chart"]
E0["loan-composition-chart.component.ts"]
end
subgraph E1["loan-detail"]
E2["loan-detail.component.ts"]
end
subgraph E3["loan-form"]
E4["loan-form.component.ts"]
end
subgraph E5["loan-payments-list"]
E6["loan-payments-list.component.ts"]
end
subgraph E7["loan-what-if"]
E8["loan-what-if.component.ts"]
end
subgraph E9["loans-overview"]
EA["loans-overview.component.ts"]
end
end
EB["index.ts"]
EC["loan-card-vm.ts"]
ED["loan-schedule-status.ts"]
EE["loan-types.ts"]
EF["loan-what-if-vm.ts"]
EG["loans.routes.ts"]
EH["loans.store.ts"]
end
subgraph EI["feature-recurring"]
EJ["bills-calendar-vm.ts"]
subgraph EK["components"]
subgraph EL["bills-calendar"]
EM["bills-calendar.component.ts"]
end
subgraph EN["bills-day-list"]
EO["bills-day-list.component.ts"]
end
subgraph EP["bills-month-grid"]
EQ["bills-month-grid.component.ts"]
end
ER["index.ts"]
subgraph ES["recurring-dismissed-list"]
ET["recurring-dismissed-list.component.ts"]
end
subgraph EU["recurring-overview"]
EV["recurring-overview.component.ts"]
end
subgraph EW["recurring-payments-panel"]
EX["recurring-payments-panel.component.ts"]
end
end
EY["index.ts"]
EZ["recurring-overrides.ts"]
F0["recurring-payments-row-vm.ts"]
F1["recurring-series.store.ts"]
F2["recurring.routes.ts"]
end
subgraph F3["feature-settings"]
subgraph F4["components"]
subgraph F5["account-password-form"]
F6["account-password-form.component.ts"]
end
F7["index.ts"]
subgraph F8["settings-about-section"]
F9["settings-about-section.component.ts"]
end
subgraph FA["settings-account-section"]
FB["settings-account-section.component.ts"]
end
subgraph FC["settings-currency-locale-section"]
FD["settings-currency-locale-section.component.ts"]
end
subgraph FE["settings-data-section"]
FF["settings-data-section.component.ts"]
end
subgraph FG["settings-overview"]
FH["settings-overview.component.ts"]
end
subgraph FI["settings-privacy-section"]
FJ["settings-privacy-section.component.ts"]
end
subgraph FK["settings-reporting-section"]
FL["settings-reporting-section.component.ts"]
end
subgraph FM["settings-theme-section"]
FN["settings-theme-section.component.ts"]
end
end
FO["index.ts"]
FP["settings.routes.ts"]
end
subgraph FQ["feature-transactions"]
FR["category-picker.ts"]
subgraph FS["components"]
subgraph FT["attribution-override-fieldset"]
FU["attribution-override-fieldset.component.ts"]
end
subgraph FV["category-select-cell"]
FW["category-select-cell.component.ts"]
end
FX["index.ts"]
subgraph FY["transaction-bulk-bar"]
FZ["transaction-bulk-bar.component.ts"]
end
subgraph G0["transaction-card"]
G1["transaction-card.component.ts"]
end
subgraph G2["transaction-edit-form"]
G3["transaction-edit-form.component.ts"]
end
subgraph G4["transaction-filters"]
G5["transaction-filters.component.ts"]
end
subgraph G6["transaction-row"]
G7["transaction-row.component.ts"]
end
subgraph G8["transactions-overview"]
G9["transactions-overview.component.ts"]
end
subgraph GA["transfer-review"]
GB["transfer-review.component.ts"]
end
end
GC["index.ts"]
GD["transaction-filters.ts"]
GE["transaction-row-vm.ts"]
GF["transactions.routes.ts"]
GG["transfer-label.ts"]
end
subgraph GH["shared"]
subgraph GI["echarts"]
GJ["bucketed-axis-option.ts"]
GK["chart-theme.ts"]
GL["echarts-jsdom.testing.ts"]
GM["echarts-setup.ts"]
GN["index.ts"]
GO["legend-option.ts"]
GP["tooltip-formatter.ts"]
end
subgraph GQ["ui"]
subgraph GR["absolute-range-panel"]
GS["absolute-range-panel.component.ts"]
end
subgraph GT["alert"]
GU["alert.component.ts"]
end
subgraph GV["badge"]
GW["badge.component.ts"]
end
subgraph GX["button"]
GY["button.component.ts"]
end
subgraph GZ["collapse"]
H0["collapse.component.ts"]
end
subgraph H1["confirm-dialog"]
H2["confirm-dialog.component.ts"]
end
subgraph H3["cycle-picker"]
H4["cycle-picker.component.ts"]
end
subgraph H5["date-range-input"]
H6["date-range-input.component.ts"]
end
subgraph H7["divider"]
H8["divider.component.ts"]
end
subgraph H9["dropdown"]
HA["dropdown.component.ts"]
end
subgraph HB["empty-state"]
HC["empty-state.component.ts"]
end
subgraph HD["fieldset"]
HE["fieldset.component.ts"]
end
subgraph HF["flex"]
HG["flex.component.ts"]
end
subgraph HH["granularity-picker"]
HI["granularity-picker.component.ts"]
end
subgraph HJ["hydration-boundary"]
HK["hydration-boundary.component.ts"]
end
HL["index.ts"]
subgraph HM["input"]
HN["input.component.ts"]
end
subgraph HO["label"]
HP["label.component.ts"]
end
subgraph HQ["loading-skeleton"]
HR["loading-skeleton.component.ts"]
end
subgraph HS["modal"]
HT["mm-modal.component.ts"]
end
subgraph HU["page-header"]
HV["page-header.component.ts"]
end
subgraph HW["paginator"]
HX["paginator.component.ts"]
end
subgraph HY["paper"]
HZ["paper.component.ts"]
end
subgraph I0["privacy-blur"]
I1["privacy-blur.component.ts"]
end
subgraph I2["privacy-toggle"]
I3["privacy-toggle.component.ts"]
end
subgraph I4["range-picker"]
I5["range-picker.component.ts"]
end
subgraph I6["select"]
I7["select.component.ts"]
end
subgraph I8["stat-card"]
I9["stat-card.component.ts"]
end
subgraph IA["table"]
IB["table.component.ts"]
end
subgraph IC["tabs"]
ID["tabs.component.ts"]
end
subgraph IE["typography"]
IF["typography.component.ts"]
end
end
subgraph IG["utils"]
IH["calendar-cycles.ts"]
II["compact-viewport.ts"]
IJ["confidence-color.ts"]
IK["confirm-state.ts"]
IL["currency-format.ts"]
IM["currency-symbol-presets.ts"]
IN["daisy-classes.ts"]
IO["date-buckets.ts"]
IP["date-format.pipe.ts"]
IQ["date-format.ts"]
IR["debounced-text.ts"]
IS["download-json.ts"]
IT["fingerprint.ts"]
IU["format-settings.testing.ts"]
IV["format-settings.ts"]
IW["hidden-amount.ts"]
IX["hydration-status.ts"]
IY["iban.ts"]
IZ["index.ts"]
J0["link-control-to-setting.ts"]
J1["locale-presets.ts"]
J2["money-color.ts"]
J3["number-format.ts"]
J4["pagination.ts"]
J5["percentage.ts"]
J6["quick-ranges.ts"]
J7["range-expression.ts"]
J8["search-params.ts"]
J9["selection-model.ts"]
JA["signed-amount.pipe.ts"]
JB["sortable.ts"]
JC["structural-filters.ts"]
JD["theme-hooks.ts"]
JE["unrendered-markup.testing.ts"]
subgraph JF["validators"]
JG["iban.validator.ts"]
JH["percentage.validator.ts"]
end
JI["with-archivable.ts"]
JJ["with-persisted-crud.ts"]
end
end
end
end
4-->16
5-->4
5-->6
6-->16
6-->IZ
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
H-->2W
H-->4S
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
S-->2W
T-->S
T-->11
T-->1C
T-->4X
T-->IZ
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
13-->46
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
1I-->IZ
1J-->1N
1J-->1R
1J-->16
1K-->1O
1K-->16
1L-->1N
1L-->1O
1M-->1L
1M-->1O
1N-->16
1O-->1N
1O-->16
1P-->1N
1P-->16
1P-->IZ
1Q-->1I
1Q-->1J
1Q-->1K
1Q-->1L
1Q-->1N
1Q-->1O
1Q-->1P
1Q-->1R
1R-->16
1U-->1X
1U-->1Z
1U-->F
1U-->2W
1U-->3B
1U-->GU
1U-->GY
1U-->IF
1X-->F
1X-->2K
1X-->3B
1X-->GU
1X-->GY
1X-->IF
1Z-->F
1Z-->GU
1Z-->GY
1Z-->IF
20-->1U
23-->22
25-->IZ
26-->25
26-->27
26-->28
27-->25
27-->16
27-->IZ
28-->25
28-->27
28-->16
2A-->2B
2A-->2C
2A-->2E
2B-->2E
2C-->2E
2D-->2B
2D-->2C
2D-->2E
2D-->2F
2D-->2G
2E-->11
2F-->M
2F-->16
2I-->5D
2J-->2M
2K-->2I
2K-->2J
2K-->2L
2K-->2M
2L-->2M
2M-->5D
2O-->2P
2O-->2Q
2O-->2R
2O-->2S
2O-->2T
2O-->2U
2T-->2R
2T-->2S
2T-->2U
2T-->16
2U-->16
2W-->2X
2W-->2Y
2W-->30
2W-->31
2X-->B
2X-->2Y
2X-->31
2Y-->31
33-->35
33-->3E
33-->3G
33-->5
33-->16
33-->46
33-->4S
33-->56
33-->IZ
34-->16
34-->4S
34-->4X
34-->IZ
35-->3E
35-->16
35-->4S
35-->IZ
36-->37
36-->46
36-->GN
36-->IZ
37-->46
37-->GN
37-->IZ
38-->16
38-->46
38-->4S
39-->16
39-->4S
39-->IZ
3A-->3E
3A-->3G
3A-->M
3A-->16
3A-->1Q
3A-->4S
3B-->33
3B-->34
3B-->35
3B-->36
3B-->37
3B-->38
3B-->39
3B-->3A
3B-->3C
3B-->3D
3B-->3E
3B-->3F
3B-->3G
3C-->33
3C-->34
3C-->3D
3C-->3E
3C-->16
3C-->46
3C-->IZ
3D-->34
3D-->IZ
3E-->16
3E-->4S
3E-->52
3E-->56
3F-->16
3F-->4S
3G-->3E
3G-->3F
3G-->16
3G-->4S
3G-->56
3I-->16
3I-->IZ
3J-->3I
3J-->16
3J-->IZ
3K-->3M
3K-->41
3K-->IZ
3L-->3S
3L-->16
3M-->3L
3M-->3S
3M-->16
3M-->IZ
3N-->3L
3N-->3S
3N-->16
3N-->IZ
3O-->3S
3O-->16
3P-->16
3Q-->3L
3Q-->3S
3Q-->4E
3Q-->16
3R-->IZ
3S-->3P
3S-->3T
3S-->16
3S-->56
3T-->5
3T-->16
3U-->16
3V-->3M
3V-->41
3V-->16
3V-->IZ
3W-->16
3X-->16
3X-->IZ
3Y-->IZ
3Z-->40
40-->41
40-->16
41-->3M
41-->16
41-->IZ
42-->43
42-->45
42-->4N
42-->16
43-->3M
43-->41
43-->IZ
44-->41
44-->4P
44-->IZ
45-->3M
45-->3V
45-->41
45-->IZ
46-->3I
46-->3J
46-->3K
46-->3L
46-->3M
46-->3N
46-->3O
46-->3P
46-->3Q
46-->3R
46-->3S
46-->3T
46-->3U
46-->3V
46-->3W
46-->3X
46-->3Y
46-->3Z
46-->40
46-->41
46-->42
46-->43
46-->44
46-->45
46-->47
46-->48
46-->49
46-->4A
46-->4B
46-->4C
46-->4D
46-->4E
46-->4F
46-->4G
46-->4H
46-->4I
46-->4J
46-->4K
46-->4L
46-->4M
46-->4N
46-->4O
46-->4P
46-->4Q
47-->3T
47-->16
48-->3T
48-->5
48-->16
49-->16
49-->IZ
4A-->4Q
4C-->IZ
4D-->3S
4D-->16
4E-->IZ
4F-->IZ
4G-->3S
4G-->M
4G-->16
4G-->IZ
4H-->4G
4H-->IZ
4I-->16
4I-->IZ
4J-->4D
4J-->16
4J-->11
4J-->IZ
4K-->3L
4K-->3O
4K-->16
4L-->3S
4L-->16
4L-->56
4M-->16
4M-->56
4N-->40
4O-->3S
4O-->16
4O-->IZ
4P-->3S
4P-->4D
4P-->16
4Q-->3M
4Q-->16
4Q-->IZ
4S-->4T
4S-->4U
4U-->4T
4U-->2W
4W-->4Y
4W-->11
4X-->4W
4X-->4Y
4X-->4Z
4Y-->11
4Z-->4Y
4Z-->5D
51-->16
52-->51
52-->53
52-->54
53-->16
54-->16
54-->56
56-->57
56-->58
56-->59
56-->5B
56-->5A
58-->5B
58-->16
58-->IZ
59-->5B
59-->16
5A-->59
5A-->5B
5A-->16
5B-->6
5B-->16
5B-->IZ
5D-->5E
5E-->F
5E-->11
5E-->1C
5E-->1G
5E-->2W
5E-->4S
5F-->F
5F-->16
5F-->1G
5H-->67
5H-->16
5I-->16
5J-->16
5K-->16
5L-->62
5L-->64
5L-->GN
5M-->46
5M-->IZ
5N-->16
5N-->3B
5N-->46
5N-->IZ
5Q-->HL
5Q-->IZ
5S-->5M
5S-->5N
5S-->16
5S-->46
5S-->GN
5S-->HL
5S-->IZ
5U-->5M
5U-->5N
5U-->16
5U-->3B
5U-->46
5U-->GN
5U-->HL
5W-->5H
5W-->5I
5W-->5Q
5W-->HL
5Y-->5I
5Y-->5K
5Y-->16
5Y-->HL
5Y-->IZ
5Y-->JG
5Y-->JH
60-->5S
60-->16
60-->3B
60-->8T
60-->HL
60-->IZ
62-->67
62-->5Q
62-->5Y
62-->60
62-->3B
62-->8T
62-->HL
62-->IZ
64-->5H
64-->5I
64-->5J
64-->67
64-->5U
64-->5W
64-->5Y
64-->16
64-->3B
64-->HL
64-->IZ
65-->5Q
65-->5S
65-->5U
65-->5W
65-->5Y
65-->62
65-->64
66-->5I
66-->5K
66-->5L
66-->65
67-->IZ
69-->F
69-->HL
69-->IZ
6A-->F
6A-->4S
6B-->6L
6C-->6O
6F-->6A
6F-->F
6F-->HL
6H-->69
6H-->6A
6H-->HL
6J-->69
6J-->HL
6L-->69
6L-->6A
6L-->6F
6L-->6H
6L-->6J
6L-->F
6L-->HL
6M-->6O
6O-->F
6O-->GU
6O-->GY
6O-->HE
6O-->HN
6O-->HZ
6O-->IF
6P-->6B
6P-->6C
6P-->6M
6R-->6Y
6R-->7B
6T-->2D
6U-->6T
6U-->7I
6U-->16
6U-->2D
6U-->3B
6U-->4S
6V-->16
6V-->HL
6Y-->6S
6Y-->6V
6Y-->70
6Y-->M
6Y-->16
6Y-->3B
6Y-->HL
6Y-->IZ
70-->6S
70-->16
70-->HL
71-->6Y
71-->70
71-->75
71-->77
71-->79
71-->7B
73-->7D
73-->7F
73-->M
73-->16
73-->3B
73-->HL
75-->7E
75-->3B
75-->HL
75-->IZ
77-->7D
77-->73
77-->M
77-->16
77-->3B
77-->HL
79-->7G
79-->7I
79-->HL
79-->IZ
7B-->7E
7B-->7H
7B-->7I
7B-->75
7B-->77
7B-->79
7B-->16
7B-->3B
7B-->HL
7B-->IZ
7C-->6R
7C-->6S
7C-->6T
7C-->6U
7C-->71
7C-->7E
7C-->7H
7C-->7I
7D-->7F
7D-->16
7E-->7H
7E-->16
7F-->16
7G-->16
7H-->7F
7H-->16
7I-->7G
7I-->M
7I-->16
7I-->3B
7I-->4S
7I-->IZ
7K-->7P
7N-->HL
7P-->7S
7P-->7T
7P-->7U
7P-->7V
7P-->7N
7P-->HL
7Q-->7P
7U-->7S
7V-->7T
7W-->7K
7W-->7Q
7Y-->16
7Y-->4S
82-->3B
82-->HL
82-->IZ
84-->3B
84-->56
84-->HL
84-->IZ
86-->8V
86-->8W
86-->3B
86-->46
86-->GN
86-->HL
86-->IZ
88-->7Y
88-->7Z
88-->8V
88-->8W
88-->8A
88-->8C
88-->3B
88-->HL
88-->IZ
8A-->3B
8A-->HL
8C-->7Z
8C-->HL
8E-->8Q
8E-->8R
8E-->16
8E-->HL
8G-->8Q
8G-->8R
8G-->8V
8G-->82
8G-->84
8G-->86
8G-->88
8G-->8E
8G-->8J
8G-->8L
8G-->8N
8G-->8P
8G-->3B
8G-->46
8G-->HL
8G-->IZ
8H-->82
8H-->84
8H-->86
8H-->88
8H-->8A
8H-->8E
8H-->8G
8H-->8J
8H-->8L
8H-->8N
8H-->8P
8J-->8A
8J-->3B
8J-->46
8J-->56
8J-->GN
8J-->HL
8J-->IZ
8L-->8V
8L-->8W
8L-->3B
8L-->HL
8L-->IZ
8N-->8U
8N-->8V
8N-->8W
8N-->3B
8N-->46
8N-->56
8N-->GN
8N-->HL
8N-->IZ
8P-->8V
8P-->3B
8P-->HL
8P-->IZ
8Q-->8R
8Q-->16
8Q-->4S
8R-->16
8S-->8G
8S-->GN
8T-->8H
8T-->8S
8T-->8V
8U-->3B
8U-->46
8V-->7Y
8V-->8U
8V-->8W
8V-->3B
8V-->46
8V-->56
8V-->IZ
8W-->16
8W-->56
8W-->IZ
90-->93
90-->95
90-->16
90-->2O
90-->HL
90-->IZ
91-->90
93-->2O
93-->HL
95-->16
95-->2O
95-->HL
96-->91
9A-->9D
9A-->9F
9A-->3B
9A-->HL
9B-->9A
9B-->9D
9B-->9F
9D-->3B
9D-->46
9D-->GN
9D-->HL
9D-->IZ
9F-->16
9F-->3B
9F-->46
9F-->56
9F-->GN
9F-->HL
9F-->IZ
9G-->9A
9G-->GN
9H-->9B
9H-->9G
9L-->A2
9L-->A4
9L-->16
9L-->3B
9L-->46
9L-->HL
9L-->IZ
9N-->A3
9N-->HL
9P-->9L
9P-->9V
9P-->9Y
9P-->HL
9R-->16
9R-->HL
9T-->A6
9T-->HL
9V-->A3
9V-->A4
9V-->A6
9V-->9N
9V-->9R
9V-->9T
9V-->16
9V-->3B
9V-->HL
9V-->IZ
9W-->9L
9W-->9N
9W-->9P
9W-->9R
9W-->9T
9W-->9V
9W-->9Y
9W-->A0
9Y-->A1
9Y-->A4
9Y-->A8
9Y-->A9
9Y-->A0
9Y-->3B
9Y-->HL
9Y-->IZ
A0-->A9
A1-->16
A2-->16
A2-->46
A2-->HL
A2-->IZ
A3-->A1
A3-->16
A3-->46
A3-->HL
A3-->IZ
A4-->16
A4-->3B
A4-->46
A4-->56
A5-->9P
A5-->GN
A6-->16
A6-->46
A6-->HL
A6-->IZ
A7-->9W
A7-->A1
A7-->A2
A7-->A3
A7-->A4
A7-->A5
A7-->A6
A7-->A8
A7-->A9
A8-->46
A8-->GN
A8-->IZ
AD-->AM
AD-->HL
AF-->AN
AF-->AH
AF-->HL
AH-->AN
AH-->HL
AJ-->AN
AJ-->HL
AK-->AD
AK-->AF
AK-->AH
AK-->AJ
AO-->AD
AO-->AF
AO-->AJ
AO-->AN
AP-->AK
AP-->AN
AP-->AO
AT-->23
AT-->HL
AU-->AT
AV-->AT
AW-->AU
AW-->AV
AY-->16
AZ-->AY
AZ-->16
AZ-->1Q
AZ-->HL
AZ-->IZ
B2-->BU
B2-->66
B2-->HL
B4-->HL
B6-->AZ
B6-->HL
B8-->AZ
B8-->B6
B8-->1Q
B8-->HL
BA-->BT
BA-->1Q
BA-->3B
BA-->HL
BC-->AY
BC-->AZ
BC-->BS
BC-->BZ
BC-->C0
BC-->B8
BC-->BE
BC-->BI
BC-->16
BC-->1Q
BC-->HL
BE-->BS
BE-->1Q
BE-->HL
BE-->IZ
BG-->C0
BG-->HL
BI-->C0
BI-->BG
BI-->HL
BK-->BU
BK-->BZ
BK-->BA
BK-->BR
BK-->16
BK-->1Q
BK-->HL
BM-->BT
BM-->BV
BM-->1Q
BM-->3B
BM-->HL
BM-->IZ
BO-->BW
BO-->B4
BO-->BC
BO-->BK
BO-->BM
BO-->3B
BO-->HL
BP-->BC
BP-->BE
BP-->BK
BP-->BM
BP-->BO
BR-->BU
BR-->B2
BR-->16
BR-->HL
BS-->1Q
BS-->HL
BT-->16
BT-->1Q
BT-->IZ
BU-->16
BV-->16
BV-->1Q
BV-->56
BV-->IZ
BW-->AY
BW-->BS
BW-->BU
BW-->BZ
BW-->16
BW-->1Q
BW-->3B
BW-->66
BX-->BO
BY-->AY
BY-->BP
BY-->BU
BY-->BX
BY-->BZ
BZ-->16
BZ-->4S
C0-->16
C0-->1Q
C0-->HL
C0-->IZ
C2-->46
C5-->C2
C5-->D6
C5-->HL
C5-->IZ
C7-->D2
C7-->HL
C9-->HL
CB-->D3
CB-->D4
CB-->D6
CB-->3B
CB-->46
CB-->HL
CD-->D6
CD-->4X
CD-->GN
CD-->HL
CF-->D1
CF-->D6
CF-->C9
CF-->3B
CF-->46
CF-->GN
CF-->HL
CF-->IZ
CH-->D4
CH-->D6
CH-->C5
CH-->CJ
CH-->3B
CH-->46
CH-->HL
CH-->IZ
CJ-->HL
CL-->D2
CL-->D6
CL-->C7
CN-->D2
CN-->D6
CN-->HL
CP-->D6
CP-->D9
CP-->CB
CP-->CF
CP-->CH
CP-->CJ
CP-->CL
CP-->CN
CP-->CT
CP-->D0
CP-->3B
CP-->46
CP-->GN
CP-->HL
CP-->IZ
CR-->D2
CR-->D6
CR-->C5
CR-->C7
CR-->CD
CR-->CL
CR-->CN
CR-->HL
CT-->D6
CT-->3B
CT-->46
CT-->56
CT-->GN
CT-->HL
CT-->IZ
CU-->C5
CU-->C7
CU-->C9
CU-->CB
CU-->CF
CU-->CH
CU-->CN
CU-->CP
CU-->CR
CU-->CT
CU-->CW
CU-->CY
CU-->D0
CW-->CY
CW-->HL
CY-->D4
CY-->D6
CY-->D8
CY-->D9
CY-->HL
CY-->IZ
D0-->D6
D0-->D8
D0-->D9
D0-->CY
D0-->16
D0-->HL
D1-->46
D1-->GN
D1-->IZ
D2-->16
D3-->D4
D3-->16
D3-->46
D3-->HL
D3-->IZ
D4-->IZ
D5-->CP
D5-->CR
D5-->CW
D5-->GN
D6-->C2
D6-->D4
D6-->16
D6-->3B
D6-->46
D6-->4S
D6-->4X
D6-->56
D7-->CU
D7-->D2
D7-->D4
D7-->D5
D7-->D6
D7-->D8
D7-->D9
D8-->16
D9-->16
DC-->DE
DC-->DI
DC-->DK
DC-->DM
DE-->DG
DE-->DI
DE-->DK
DE-->DM
DE-->HL
DG-->DP
DG-->7C
DG-->HL
DI-->DP
DI-->2D
DI-->3B
DI-->7C
DI-->HL
DK-->16
DK-->2D
DK-->3B
DK-->7C
DK-->HL
DK-->IZ
DM-->16
DM-->3B
DM-->7C
DM-->HL
DM-->IZ
DN-->DC
DN-->DO
DO-->DE
DP-->7C
DP-->HL
DS-->DU
DS-->DW
DS-->DY
DS-->E0
DS-->E2
DS-->E4
DS-->E6
DS-->E8
DS-->EA
DU-->E0
DU-->16
DU-->26
DU-->HL
DU-->IZ
DW-->16
DW-->26
DW-->GN
DW-->HL
DY-->EC
DY-->HL
E0-->16
E0-->26
E0-->GN
E0-->HL
E0-->IZ
E2-->ED
E2-->EH
E2-->DU
E2-->DW
E2-->E4
E2-->E6
E2-->E8
E2-->26
E2-->3B
E2-->HL
E4-->EE
E4-->16
E4-->3B
E4-->HL
E4-->JH
E6-->16
E6-->3B
E6-->HL
E6-->IZ
E8-->EF
E8-->16
E8-->26
E8-->3B
E8-->GN
E8-->HL
EA-->EC
EA-->EH
EA-->DY
EA-->E4
EA-->16
EA-->HL
EB-->DS
EB-->EC
EB-->ED
EB-->EE
EB-->EF
EB-->EG
EB-->EH
EC-->ED
EC-->EE
EC-->16
EC-->26
EC-->HL
EC-->IZ
ED-->26
ED-->HL
ED-->IZ
EE-->16
EF-->26
EF-->IZ
EG-->E2
EG-->EA
EG-->GN
EH-->16
EH-->26
EH-->3B
EH-->4S
EH-->IZ
EJ-->HL
EM-->EJ
EM-->F1
EM-->EO
EM-->EQ
EM-->3B
EM-->46
EM-->HL
EM-->IZ
EO-->EJ
EO-->HL
EQ-->EJ
EQ-->HL
ER-->EM
ER-->EO
ER-->EQ
ER-->EV
ER-->EX
ET-->HL
EV-->EM
EV-->EX
EV-->3B
EV-->HL
EX-->F0
EX-->F1
EX-->ET
EX-->3B
EX-->46
EX-->GN
EX-->HL
EX-->IZ
EY-->ER
EY-->F2
EZ-->16
EZ-->46
F0-->HL
F1-->EZ
F1-->16
F1-->3B
F1-->46
F1-->4S
F1-->56
F2-->EV
F6-->F
F6-->HL
F7-->FH
F9-->23
F9-->HL
FB-->F6
FB-->F
FB-->HL
FD-->3B
FD-->HL
FD-->IZ
FF-->96
FF-->HL
FH-->F9
FH-->FB
FH-->FD
FH-->FF
FH-->FJ
FH-->FL
FH-->FN
FH-->HL
FJ-->3B
FJ-->HL
FJ-->IZ
FL-->3B
FL-->HL
FL-->IZ
FN-->3B
FN-->4X
FN-->HL
FO-->F7
FO-->FP
FP-->FH
FR-->16
FU-->16
FU-->3B
FU-->52
FU-->HL
FU-->IZ
FW-->FR
FX-->FZ
FX-->G3
FX-->G5
FX-->G9
FX-->GB
FZ-->FR
FZ-->M
FZ-->3B
FZ-->HL
G1-->FR
G1-->GE
G1-->FW
G1-->HL
G1-->IZ
G3-->FR
G3-->FU
G3-->M
G3-->16
G3-->3B
G3-->52
G3-->7C
G3-->HL
G3-->IZ
G5-->FR
G5-->GD
G5-->M
G5-->3B
G5-->HL
G5-->IZ
G7-->FR
G7-->GE
G7-->FW
G7-->HL
G7-->IZ
G9-->FR
G9-->GD
G9-->GE
G9-->GG
G9-->FZ
G9-->G1
G9-->G3
G9-->G5
G9-->G7
G9-->GB
G9-->M
G9-->16
G9-->3B
G9-->56
G9-->7C
G9-->HL
G9-->IZ
GB-->3B
GB-->56
GB-->HL
GB-->IZ
GC-->GF
GD-->16
GD-->56
GE-->16
GE-->IZ
GF-->G9
GG-->16
GG-->56
GN-->GJ
GN-->GK
GN-->GM
GN-->GO
GN-->GP
GP-->IZ
GS-->GY
GS-->HC
GS-->HE
GS-->HN
GS-->IF
GS-->16
GS-->IZ
GU-->IZ
GW-->IZ
GY-->IZ
H0-->IZ
H2-->GY
H2-->HP
H2-->HT
H2-->IF
H4-->IZ
H6-->GY
H6-->HA
H6-->IZ
H8-->IZ
HA-->IZ
HC-->HG
HC-->IF
HE-->IZ
HG-->IZ
HK-->GY
HK-->HR
HL-->GS
HL-->GU
HL-->GW
HL-->GY
HL-->H0
HL-->H2
HL-->H4
HL-->H6
HL-->H8
HL-->HA
HL-->HC
HL-->HE
HL-->HG
HL-->HI
HL-->HK
HL-->HN
HL-->HP
HL-->HR
HL-->HT
HL-->HV
HL-->HX
HL-->HZ
HL-->I1
HL-->I3
HL-->I5
HL-->I7
HL-->I9
HL-->IB
HL-->ID
HL-->IF
HN-->IZ
HP-->IZ
HR-->HG
HT-->IZ
HV-->HG
HV-->IF
HX-->GY
HX-->HG
HX-->IF
HX-->IZ
HZ-->IZ
I1-->IZ
I3-->GY
I3-->3B
I5-->GS
I5-->GY
I5-->HG
I5-->HZ
I5-->IF
I5-->16
I5-->IZ
I7-->IZ
I9-->I1
I9-->IF
I9-->IZ
IB-->IZ
ID-->IZ
IF-->IZ
IH-->IQ
IL-->IV
IO-->IV
IP-->IQ
IQ-->IV
IU-->IV
IV-->11
IZ-->IH
IZ-->II
IZ-->IJ
IZ-->IK
IZ-->IL
IZ-->IM
IZ-->IN
IZ-->IO
IZ-->IQ
IZ-->IP
IZ-->IR
IZ-->IS
IZ-->IT
IZ-->IV
IZ-->IW
IZ-->IX
IZ-->IY
IZ-->J0
IZ-->J1
IZ-->J2
IZ-->J3
IZ-->J4
IZ-->J5
IZ-->J6
IZ-->J7
IZ-->J8
IZ-->J9
IZ-->JA
IZ-->JB
IZ-->JC
IZ-->JD
IZ-->JI
IZ-->JJ
J3-->IV
J6-->IO
J6-->J7
J7-->IO
JA-->IL
```
