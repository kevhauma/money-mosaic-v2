import { computed, inject, Injectable, signal } from '@angular/core';
import { SessionStore } from '@/core/auth';
import type { ThemeStyleId, UiPreferences } from '@/core/data-access/entities';
import { DEFAULT_UI_PREFERENCES } from '@/core/data-access/seed-data';
// Imported straight from its file rather than through the `@/core/data-access` barrel: this
// service is constructed by the app initializer, and that barrel re-exports every repository in
// the app. Nothing else on the eager path imports it, and one barrel import here would make the
// initial chunk depend on all eighteen of them staying side-effect-free. Recorded with the other
// by-file exceptions in CLAUDE.md's hard rules.
import { UiPreferencesRepository } from '@/core/data-access/ui-preferences.repository';
import { httpStatusOf, isTransportFailure } from '@/core/server-status';
import { StoreResetService } from '@/core/store-reset';

/**
 * The signed-in account's interface state — which theme it renders in, whether it has seen the
 * landing page, whether it has waved the backup reminder away (TICKET-SRV-10).
 *
 * These were the last three `localStorage` keys in the app, and moving them is what makes the
 * browser hold nothing but a session cookie. They are per-account now: the same person sees the
 * same theme on every browser, and a household's shared browser shows each person their own.
 *
 * **Not a `signalStore`, on purpose.** Every store in this app hydrates lazily on first injection
 * and renders a loading/error state for a page to show. This is read at **bootstrap**, before
 * anything renders — the theme has to be on `<html>` before the first paint, or every load
 * flashes the default palette — and there is no page that would render its error. So it is one
 * read, awaited by the app initializer once the session is known, holding one signal.
 *
 * **Nothing here ever rejects.** These are three cosmetic flags, and the worst case of any of them
 * failing to load or save is seeing something once more: the default theme, the landing page, a
 * reminder. That is never worth an exception escaping into a guard, the shell, or bootstrap — an
 * outage is already being reported by `ServerStatusService`. A failure that is *not* the server
 * answering (a renamed method, a bad mapper) is still logged, for the reason `with-hydration.ts`
 * gives: from here on, nothing else would.
 *
 * It registers with `StoreResetService` like a store does, so signing out drops the previous
 * account's theme and flags, and signing in as somebody else re-reads theirs.
 */
@Injectable({ providedIn: 'root' })
export class UiPreferencesService {
  private readonly repository = inject(UiPreferencesRepository);
  private readonly session = inject(SessionStore);

  private readonly preferences = signal<UiPreferences>(DEFAULT_UI_PREFERENCES);

  /**
   * Fields written in this session since the last reset, layered over whatever a read brings back.
   * A read started at sign-in can resolve *after* a write the user made a moment later (marking the
   * dashboard visited, say), and without this the older answer would quietly undo the newer choice
   * until the next reload.
   */
  private written: Partial<UiPreferences> = {};

  /**
   * Bumped by every reset, so a read that was in flight for the *previous* account cannot land on
   * this one — the same "is this still the current attempt" check `SessionStore.restore` makes.
   */
  private generation = 0;

  /** The stored theme, or `undefined` for "never picked" — `ThemeService` resolves the default. */
  readonly themeStyle = computed<ThemeStyleId | undefined>(() => this.preferences().themeStyle);
  readonly hasVisited = computed(() => this.preferences().hasVisited ?? false);
  readonly backupReminderDismissed = computed(
    () => this.preferences().backupReminderDismissed ?? false,
  );

  constructor() {
    inject(StoreResetService).register(
      'UiPreferencesService',
      () => this.reset(),
      () => this.restore(),
    );
  }

  /**
   * Loads the signed-in account's preferences. A visitor with no session has none, and is not
   * asked for them: the request would answer 401, and `authInterceptor` treats a 401 as an expired
   * session and routes to `/login` — taking the URL they were actually trying to reach with it.
   */
  restore(): Promise<void> {
    if (!this.session.isAuthenticated()) return Promise.resolve();

    const generation = this.generation;
    return this.repository.get().then(
      (stored) => {
        if (generation === this.generation) this.preferences.set({ ...stored, ...this.written });
      },
      (error: unknown) => reportIfUnexpected(error),
    );
  }

  setThemeStyle(themeStyle: ThemeStyleId): Promise<void> {
    return this.write({ themeStyle }, () => this.repository.setThemeStyle(themeStyle));
  }

  markVisited(): Promise<void> {
    return this.write({ hasVisited: true }, () => this.repository.setHasVisited(true));
  }

  dismissBackupReminder(): Promise<void> {
    return this.write({ backupReminderDismissed: true }, () =>
      this.repository.setBackupReminderDismissed(true),
    );
  }

  /**
   * Persists first and adopts second — the order every setter in the app's stores uses, and the
   * one the accent picker beside the theme picker already follows. A write that did not land is
   * not shown as though it had.
   */
  private write(changes: Partial<UiPreferences>, persist: () => Promise<unknown>): Promise<void> {
    const generation = this.generation;
    return persist().then(
      () => {
        if (generation !== this.generation) return;
        this.written = { ...this.written, ...changes };
        this.preferences.update((current) => ({ ...current, ...changes }));
      },
      (error: unknown) => reportIfUnexpected(error),
    );
  }

  private reset(): void {
    this.generation += 1;
    this.written = {};
    this.preferences.set(DEFAULT_UI_PREFERENCES);
  }
}

/** The server answering (any status) or not answering at all is expected; anything else is a bug. */
const reportIfUnexpected = (error: unknown): void => {
  if (httpStatusOf(error) === undefined && !isTransportFailure(error)) console.error(error);
};
