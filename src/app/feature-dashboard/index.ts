export * from './dashboard.routes';
export * from './components';
// Account detail renders these panels over a scoped store of its own (TICKET-ACC-14).
// …and gates them on every store that instance reads (TICKET-SRV-13).
export { provideStatsScope, StatsStore, statsInputsHydration } from './stats.store';
