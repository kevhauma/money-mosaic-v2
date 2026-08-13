import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { AlertComponent } from '@/shared/ui';
import type { ForecastNotice } from '../../forecast-notices';

/**
 * The forecast's one-line verdict (TICKET-FUT-05) — where the plan lands, or why it doesn't.
 * Presentational: `forecast-notices.ts` decides what it says and how loudly, this only renders it,
 * and renders nothing at all when there is nothing to say.
 */
@Component({
  selector: 'app-forecast-notice',
  imports: [AlertComponent],
  templateUrl: './forecast-notice.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForecastNoticeComponent {
  readonly notice = input.required<ForecastNotice>();
}
