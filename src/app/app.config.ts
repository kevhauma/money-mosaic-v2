import {
  ApplicationConfig,
  inject,
  Injector,
  isDevMode,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { appDb } from './core/data-access';
import { StorageStatusService } from './core/storage';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideAppInitializer(() => {
      // Captured before the async boundary — `inject()` only works synchronously here, but the
      // dev-seed step below runs after `await`, so it resolves its service off this injector.
      const injector = inject(Injector);
      // Every store now hydrates itself on first injection instead (`withHooks({ onInit })`,
      // TICKET-PERF-07) — whichever route (or the dev seed below) first injects one kicks off its
      // hydration there, so nothing needs to happen here beyond opening the database.
      return appDb.open().then(async () => {
        // Fire-and-forget (FR-DAT-4) — never awaited, so a denied/unsupported result can never
        // delay or block the rest of bootstrap.
        void injector.get(StorageStatusService).checkAndRequest();

        // Dev-only sample-data seed (TICKET-DEV-01). The dynamic import keeps the seed module and
        // its dataset in a separate chunk that a production build never references or loads, and
        // `isDevMode()` gates it out at runtime regardless.
        if (isDevMode()) {
          const { DevSeedService } = await import('./dev-seed/dev-seed.service');
          await injector.get(DevSeedService).seedIfEmpty();
        }
      });
    }),
  ],
};
