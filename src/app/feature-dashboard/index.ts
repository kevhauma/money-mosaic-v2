export * from './dashboard.routes';
export * from './components';
// Account detail renders these panels over a scoped store of its own (TICKET-ACC-14).
export { provideStatsScope, StatsStore } from './stats.store';
