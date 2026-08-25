import type { Routes } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { echarts } from '@/shared/echarts';

export const LOANS_ROUTES: Routes = [
  {
    path: '',
    title: 'Loans',
    loadComponent: () =>
      import('./components/loans-overview/loans-overview.component').then(
        (m) => m.LoansOverviewComponent,
      ),
  },
  {
    path: ':id',
    // The generic noun rather than the loan's name, for the same reason as `accounts/:id`
    // (TICKET-TXN-12): the name is in `LoansStore`, which a cold load of this URL may not have
    // hydrated by the time a title resolver would run.
    title: 'Loan',
    // Only the detail route needs echarts (TICKET-LOAN-07's balance chart) — kept off the overview
    // route's own providers so its chunk stays free of echarts, same reasoning as the accounts
    // detail route sharing `ACCOUNTS_ROUTES`' grouping-route provider, just scoped one level tighter
    // here since the overview genuinely never renders a chart.
    providers: [provideEchartsCore({ echarts })],
    loadComponent: () =>
      import('./components/loan-detail/loan-detail.component').then((m) => m.LoanDetailComponent),
  },
];
