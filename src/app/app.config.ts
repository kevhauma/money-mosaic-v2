import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, TitleStrategy, withComponentInputBinding } from '@angular/router';

import { authInterceptor, SessionStore } from './core/auth';
// Imported straight from its file, not through the `@/core/layout` barrel: that barrel also
// re-exports `AppShellComponent`, and `@Component` has side effects esbuild can't tree-shake — so
// a barrel import here would drag the whole shell (and its icons, buttons and stores) into the
// eager bundle, which the shell's own lazy `loadComponent` exists to avoid.
import { AppTitleStrategy } from './core/layout/app-title.strategy';
import { serverStatusInterceptor } from './core/server-status';
import { ThemeService } from './core/theme';
import { UiPreferencesService } from './core/ui-preferences';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // The app's first HTTP client (TICKET-AUTH-02). `withFetch()` because the backend speaks
    // cookies and streams, and `authInterceptor` is what attaches the session to every `/api`
    // call and turns an expired one into a trip back to `/login`. `serverStatusInterceptor` sits
    // *below* it (TICKET-SRV-06): it retries a read once when nothing answered and keeps
    // `ServerStatusService` fed, both of which want the final outcome of a request, not the
    // outcome of its first attempt.
    provideHttpClient(withFetch(), withInterceptors([authInterceptor, serverStatusInterceptor])),
    // Appends the brand to each route's own `title` (TICKET-TXN-12). Without a strategy the router
    // would set `document.title` to the bare page name, dropping "Money Mosaic" from every tab.
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    // Resolving the session is almost the whole of bootstrap (TICKET-SRV-06). No database is
    // opened, no storage permission is asked for, and no entity data is loaded: every store hydrates
    // itself on first injection (`withHooks({ onInit })`, TICKET-PERF-07), so data arrives per
    // store, per route.
    //
    // The one read that cannot wait for a route is the account's interface state (TICKET-SRV-10):
    // its theme has to be on `<html>` before the first paint, and the landing-page guard reads its
    // `hasVisited` synchronously. It is chained *after* the session — it needs to know whether
    // there is an account to ask, and Angular runs separate initializers concurrently — and
    // `ThemeService` is constructed here so the attribute is applied from bootstrap even on the
    // signed-out screens that never load the shell.
    //
    // The returned promise is deliberately allowed to reject. `restore()` rejects for exactly one
    // reason — the server did not answer — and `app-bootstrap.ts` turns that rejection into the
    // "can't reach the server" screen. A signed-out visitor is not a failure: that resolves, and
    // `authGuard` sends them to `/login`. The preferences read never rejects; a theme is not worth
    // failing a boot over.
    provideAppInitializer(() => {
      const session = inject(SessionStore);
      const preferences = inject(UiPreferencesService);
      inject(ThemeService);
      return session.restore().then(() => preferences.restore());
    }),
  ],
};
