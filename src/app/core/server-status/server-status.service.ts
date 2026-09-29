import { computed, Injectable, signal } from '@angular/core';
import { isTransportFailure } from './transport-failure';

/**
 * Whether the app has heard from the server. `checking` is the honest starting value: a fresh tab
 * has asked nothing yet, and claiming "reachable" before the first answer would make the shell's
 * outage banner depend on nobody having looked.
 */
export type ServerReachability = 'checking' | 'reachable' | 'unreachable';

/**
 * One piece of app-wide state: can we talk to the server? (TICKET-SRV-06)
 *
 * Fed by `serverStatusInterceptor`, which sees every `/api` call — so *any* answer, including a 404
 * or a 500, counts as proof the server is up, and only a transport failure flips it to
 * `unreachable`. That asymmetry is the point: a 409 on a duplicate import is not an outage, and an
 * app that treats it as one tells the user to check their server when the server is fine.
 *
 * Deliberately not a poller. Nothing here pings the server on a timer — the state moves when a
 * request the app was making anyway succeeds or fails, so a switched-off server produces one failed
 * request per user action rather than a request every few seconds forever.
 */
@Injectable({ providedIn: 'root' })
export class ServerStatusService {
  private readonly state = signal<ServerReachability>('checking');

  /** Read by the shell's outage banner; `checking` until the first request settles. */
  readonly reachability = this.state.asReadonly();

  readonly isUnreachable = computed(() => this.state() === 'unreachable');

  /** The server answered — whatever it answered. */
  recordReachable(): void {
    this.state.set('reachable');
  }

  /**
   * Records how a failed request failed. A non-transport failure is an *answer*, so it counts as
   * the server being reachable — which is also what clears a stale outage once it comes back.
   */
  recordFailure(error: unknown): void {
    this.state.set(isTransportFailure(error) ? 'unreachable' : 'reachable');
  }
}
