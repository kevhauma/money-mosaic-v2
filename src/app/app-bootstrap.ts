import { bootstrapApplication, createApplication } from '@angular/platform-browser';
import { getPlatform, type ApplicationRef } from '@angular/core';
import { isTransportFailure, ServerUnreachableComponent } from './core/server-status';
import { appConfig } from './app.config';
import { App } from './app';

/**
 * Starting the app, and what to show when it cannot start (TICKET-SRV-06).
 *
 * `provideAppInitializer` resolves the session before anything renders, and since TICKET-SRV-05
 * that means bootstrap itself depends on a server that can be switched off. Without this, the
 * failure was `bootstrapApplication`'s promise rejecting into a `console.error` — a blank page, and
 * an explanation only somebody with devtools open would ever read.
 *
 * Lives beside `app.config.ts` rather than in `main.ts` so it can be reasoned about (and read)
 * without the entry point becoming a program; `main.ts` stays one call.
 */

/**
 * The element the failure screen renders into: its own, never `<app-root>`. Created with the
 * component's own tag name so the DOM says what it is — `bootstrap(Component, element)` renders
 * *into* whatever element it is given and never renames it.
 */
const FAILURE_HOST_TAG = 'app-server-unreachable';

/**
 * Boots the app, or the "can't reach the server" screen if the server did not answer.
 *
 * `attempt` counts bootstraps, so the screen can say "still no answer" rather than looking like the
 * Retry button did nothing. Any *other* bootstrap failure is re-reported the way it always was: a
 * template error is not an outage, and dressing it up as one would send somebody to check a server
 * that is running perfectly.
 *
 * Answers whether the real app started, which is what lets a retry keep its screen up until it
 * knows.
 */
export const startApp = async (attempt = 1): Promise<boolean> => {
  try {
    await bootstrapApplication(App, appConfig);
    return true;
  } catch (error) {
    // A rejected initializer does **not** tear the application down: Angular registers
    // `envInjector.destroy()` as a platform-destroy listener and re-throws the initializer's
    // rejection without firing it. So the environment injector, its root singletons and its
    // environment initializers all survive a failed boot — including the global error listeners,
    // which is why a third failed attempt would otherwise report every later error three times.
    // Destroying the platform runs that listener; the next `bootstrapApplication` makes a new one.
    getPlatform()?.destroy();

    if (!isTransportFailure(error)) {
      console.error(error);
      return false;
    }
    await showServerUnreachable(attempt);
    return false;
  }
};

/**
 * Renders the failure screen as its own tiny application.
 *
 * Its own, because the real one does not exist: the thing that failed is what every store, guard
 * and route depends on. And in its own host element rather than `<app-root>`, so tearing it down
 * for a retry cannot leave the real app's mount point in a state Angular created and then removed.
 */
const showServerUnreachable = async (attempt: number): Promise<void> => {
  const host = document.createElement(FAILURE_HOST_TAG);
  document.body.appendChild(host);

  const appRef = await createApplication();
  const screen = appRef.bootstrap(ServerUnreachableComponent, host);
  screen.setInput('attempt', attempt);

  screen.instance.retry.subscribe(() => {
    // Out of the click's own turn before doing anything to the application handling it — the
    // subscriber runs inside the component's event handler, and tearing its own host down from
    // there is the kind of thing that works until it doesn't.
    setTimeout(() => {
      void retryFrom(appRef, host, attempt);
    });
  });
};

/**
 * Retries, keeping the failure screen on screen for as long as the attempt takes.
 *
 * Deliberately not "destroy, then retry": against a server that accepts the connection and never
 * answers — which is the outage this whole screen exists for — that would leave a blank white page
 * for the length of the timeout, with no spinner and nothing to read. The screen's own "Retrying…"
 * state is written to last exactly as long as the attempt, and this is the half that makes that true.
 *
 * A failed attempt has already put up a *new* screen by the time this resolves, so the old one is
 * torn down either way; only the order changes.
 */
const retryFrom = async (
  appRef: ApplicationRef,
  host: HTMLElement,
  attempt: number,
): Promise<void> => {
  await startApp(attempt + 1);
  appRef.destroy();
  host.remove();
};
