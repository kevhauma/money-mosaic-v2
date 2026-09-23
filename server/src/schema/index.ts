// Drizzle schema for the Money Mosaic backend.
//
// TICKET-AUTH-01 adds the first two tables — `users` and `sessions`. TICKET-SRV-02 ports the rest
// of the Dexie data model into sibling modules re-exported from here, every table owned by a
// `users.id`.
export * from './sessions.js';
export * from './users.js';
