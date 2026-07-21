import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * The bootstrap root — deliberately just a `<router-outlet>`. The authenticated-app shell
 * (drawer/sidebar/topbar) lives in `AppShellComponent` (`core/layout/app-shell/`) as a lazy
 * layout route instead, so the landing page (TICKET-PUB-01, `feature-home`) can render as a
 * sibling top-level route without being wrapped in that shell.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
