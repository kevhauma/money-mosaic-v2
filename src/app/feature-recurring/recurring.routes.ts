import type { Routes } from '@angular/router';

/**
 * No `provideEchartsCore` here, unlike `EXPLORE_ROUTES`/`INCOME_ROUTES`: neither section on this
 * page is a chart. The payments panel is a real `<table>` and the bills calendar is a CSS grid, so
 * the feature's lazy chunk stays free of echarts entirely — add the provider (as a component-less
 * grouping route, the shape the other features use) only if a chart ever lands here.
 */
export const RECURRING_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/recurring-overview/recurring-overview.component').then(
        (m) => m.RecurringOverviewComponent,
      ),
  },
];
