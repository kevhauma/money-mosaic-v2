import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RangeStore } from '@/core/stats';
import { FlexComponent, PaperComponent, TypographyComponent } from '@/shared/ui';
import { buildTransactionDrilldownParams } from '@/shared/utils';
import { StatsStore } from '../../stats.store';

const EUR_FORMATTER = new Intl.NumberFormat('en-BE', { style: 'currency', currency: 'EUR' });
const RATIO_FORMATTER = new Intl.NumberFormat('en-BE', { maximumFractionDigits: 1 });

/** How close two per-day averages must be to call them "about the same" rather than compute a ratio. */
const RATIO_EQUALITY_THRESHOLD = 1.05;

/**
 * Weekday-vs-weekend spend comparison for the selected range (FR-STAT-10) — a two-bar rate
 * comparison alongside the spending-rate stat card, reusing `StatsStore.weekdayWeekendSplit`.
 * Renders nothing when the range is too short for a meaningful split (`weekdayWeekendSplit()` is
 * `null`) rather than showing a divide-by-zero rate.
 */
@Component({
  selector: 'app-weekday-weekend-split-panel',
  imports: [FlexComponent, PaperComponent, TypographyComponent],
  templateUrl: './weekday-weekend-split-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WeekdayWeekendSplitPanelComponent {
  private readonly statsStore = inject(StatsStore);
  private readonly rangeStore = inject(RangeStore);

  protected readonly split = computed(() => this.statsStore.weekdayWeekendSplit());

  protected readonly weekdayAvgValue = computed(() =>
    EUR_FORMATTER.format(this.split()?.weekday.avgPerDay ?? 0),
  );

  protected readonly weekendAvgValue = computed(() =>
    EUR_FORMATTER.format(this.split()?.weekend.avgPerDay ?? 0),
  );

  /** Bar widths relative to the larger of the two averages, so the bigger side always fills 100%. */
  protected readonly barPercents = computed(() => {
    const s = this.split();
    if (!s) return { weekday: 0, weekend: 0 };
    const max = Math.max(s.weekday.avgPerDay, s.weekend.avgPerDay);
    if (max === 0) return { weekday: 0, weekend: 0 };
    return {
      weekday: (s.weekday.avgPerDay / max) * 100,
      weekend: (s.weekend.avgPerDay / max) * 100,
    };
  });

  protected readonly ratioLabel = computed<string | null>(() => {
    const s = this.split();
    if (!s) return null;
    const { avgPerDay: weekdayAvg } = s.weekday;
    const { avgPerDay: weekendAvg } = s.weekend;

    if (weekdayAvg === 0 && weekendAvg === 0) return null;
    if (weekdayAvg === 0) return 'All spending happens on weekends';
    if (weekendAvg === 0) return 'All spending happens on weekdays';

    const higher = Math.max(weekdayAvg, weekendAvg);
    const lower = Math.min(weekdayAvg, weekendAvg);
    const ratio = higher / lower;
    if (ratio < RATIO_EQUALITY_THRESHOLD) return 'About the same per day on weekdays and weekends';

    const target = weekendAvg >= weekdayAvg ? 'weekends' : 'weekdays';
    return `${RATIO_FORMATTER.format(ratio)}× more per day on ${target}`;
  });

  protected readonly drilldownParams = computed(() =>
    buildTransactionDrilldownParams({ from: this.rangeStore.from(), to: this.rangeStore.to() }),
  );
}
