import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ButtonComponent } from '../button/button.component';
import { LoadingSkeletonComponent } from '../loading-skeleton/loading-skeleton.component';

/**
 * What a page shows around content that depends on a store still loading — or one that failed
 * (TICKET-SRV-06).
 *
 * Three states, in the order they matter: a failure the user can act on, a load in progress, and
 * the content. Panels already handle an *empty* dataset (`mm-empty-state`); this is the state
 * before "empty" is even known, which against a local database lasted a frame and against a server
 * lasts as long as the server takes — or forever, if it is off. Without it every page's empty state
 * doubles as its error state, and "No transactions yet" becomes the app's way of saying the network
 * is down.
 *
 * Input-driven like every other `shared/ui` primitive: the page joins its stores with `hydrationOf`
 * and passes the answer in, so this stays usable for any pair of loading/error signals.
 */
@Component({
  selector: 'mm-hydration-boundary',
  imports: [ButtonComponent, LoadingSkeletonComponent],
  templateUrl: './hydration-boundary.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HydrationBoundaryComponent {
  readonly loading = input(false);

  /** The message to show instead of the content. `null` means nothing failed. */
  readonly error = input<string | null>(null);

  /** Skeleton rows while loading — a page sets it to roughly the shape of what is coming. */
  readonly rows = input(3);

  readonly retry = output<void>();
}
