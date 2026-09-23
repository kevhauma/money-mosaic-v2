// Drizzle schema for the Money Mosaic backend.
//
// TICKET-SRV-01 ships this empty on purpose: it stands up Express, SQLite and Drizzle with
// nothing but a health endpoint. The first tables arrive with TICKET-AUTH-01 (`users`,
// `sessions`), and TICKET-SRV-02 ports the rest of the Dexie data model into sibling modules
// re-exported from here.
export {};
