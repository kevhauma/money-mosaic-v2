import type { Routes } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { echarts } from '@/shared/echarts';

export const INCOME_ROUTES: Routes = [
  {
    // A grouping route with no component of its own: its children render straight into the shell's
    // outlet, and all three share one provider scope (TICKET-INC-18). Without it, `/income/settings`
    // and `/income/salary` would each need their own copy — or would silently do without.
    path: '',
    // Route-level, like the Dashboard's and Accounts' — keeps echarts in this feature's lazy chunk
    // instead of the main bundle (TICKET-PERF-01), and it's what `NgxEchartsDirective` resolves
    // `NGX_ECHARTS_CONFIG` from, so the chart can't render without it (TICKET-INC-02).
    providers: [provideEchartsCore({ echarts })],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./components/income-overview/income-overview.component').then(
            (m) => m.IncomeOverviewComponent,
          ),
      },
      // The page's two configuration surfaces, promoted out of a dropdown and a modal
      // (TICKET-INC-18) so each control has room for the explanation it needs — and so both are
      // linkable, reloadable and reachable with the back button.
      {
        path: 'settings',
        loadComponent: () =>
          import('./components/income-settings-page/income-settings-page.component').then(
            (m) => m.IncomeSettingsPageComponent,
          ),
      },
      {
        path: 'salary',
        loadComponent: () =>
          import('./components/salary-details-page/salary-details-page.component').then(
            (m) => m.SalaryDetailsPageComponent,
          ),
      },
    ],
  },
];
