import { startApp } from './app/app-bootstrap';

// One call: `startApp` owns both outcomes, including the "can't reach the server" screen that
// replaces a rejected bootstrap (TICKET-SRV-06).
// The `.catch` is the floor under the floor: `startApp` handles a rejected bootstrap, but if the
// *failure* path itself throws, nothing else would report it — a blank page and an empty console is
// precisely what this file exists to prevent.
startApp().catch((error: unknown) => console.error(error));
