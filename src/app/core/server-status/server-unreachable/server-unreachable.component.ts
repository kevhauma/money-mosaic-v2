import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

/**
 * The screen that replaces the app when bootstrap could not reach the server (TICKET-SRV-06).
 *
 * Deliberately dependency-free: no store, no router, no `@/shared/ui`. The thing that failed is the
 * reason every store is empty, so anything this screen injected would be another way for it to fail
 * — and it is bootstrapped as its own tiny application (see `app-bootstrap.ts`), before the real one
 * exists. The daisyUI classes are written out by hand for the same reason the shell imports two
 * primitives directly instead of the barrel: reaching `@/shared/ui` from the bootstrap path would
 * land all twenty-nine of its components in the eager bundle to render one button.
 *
 * It explains the two things that are actually wrong when this appears — the server is not running,
 * or the address it is being asked for has changed — and shows that address, because a wrong API
 * base URL looks exactly like a stopped server from in here.
 */
// Reason: rendered by `ApplicationRef.bootstrap(ServerUnreachableComponent, host)` in
// `app-bootstrap.ts`, not from any template — there is no template to render it from, since the
// application that would own one is the thing that failed to start. `app-bootstrap.spec.ts` proves
// it reaches the DOM.
@Component({
  selector: 'app-server-unreachable',
  imports: [],
  templateUrl: './server-unreachable.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
// fallow-ignore-next-line unrendered-component
export class ServerUnreachableComponent {
  /** How many times bootstrap has been tried, including the first. `> 1` means Retry did not help. */
  readonly attempt = input(1);

  /** Asks the host to bootstrap the app again. The host owns the retry; this screen only offers it. */
  readonly retry = output<void>();

  /**
   * Set on click and never cleared: a successful retry destroys this component, and a failed one
   * replaces it with a fresh instance carrying the next `attempt`. So the pending state lives
   * exactly as long as the attempt does, without anything having to reach back in here.
   */
  protected readonly retrying = signal(false);

  protected readonly failedBefore = computed(() => this.attempt() > 1);

  /**
   * The address the app is asking for, absolute, because that is the part a reader can check
   * against the server they think they are running. Resolved off `document.baseURI` rather than
   * hardcoded so a deployment under a sub-path shows its own URL.
   */
  protected readonly apiUrl = new URL('/api', document.baseURI).href;

  protected onRetry(): void {
    this.retrying.set(true);
    this.retry.emit();
  }
}
