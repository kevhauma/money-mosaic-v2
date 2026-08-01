import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ACCENT_COLORS, ThemeService, type AccentColor, type AccentColorId } from '@/core/theme';
import { resolveGrossSeriesColor } from '@/shared/echarts';
import { FieldsetComponent, LabelComponent } from '@/shared/ui';
import { IncomeStore } from '../../income.store';

/**
 * Picks the colour this page's gross-pay series are drawn in (TICKET-SET-08) — the take-home band's
 * withheld area (FR-INC-11) and the gross line on the gross-vs-net growth charts (FR-INC-13).
 *
 * Lives in the Income settings popup beside the other page-level choices rather than in Settings'
 * Theme section: it changes what one page's charts mean, the way the category filter and the
 * career-start date do, and is only discoverable while looking at the charts it colours.
 *
 * Offers `ACCENT_COLORS`' fixed presets rather than a freeform hex — one preset vocabulary across
 * the app, and a freeform input would let the user pick something invisible against the plot
 * (TICKET-SET-02's reasoning). "Default" clears the setting back to the theme's own chart palette.
 */
@Component({
  selector: 'app-income-gross-color',
  imports: [FieldsetComponent, LabelComponent],
  templateUrl: './income-gross-color.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeGrossColorComponent {
  private readonly incomeStore = inject(IncomeStore);
  private readonly themeService = inject(ThemeService);

  protected readonly colors: readonly AccentColor[] = ACCENT_COLORS;

  protected isSelected(id: AccentColorId | undefined): boolean {
    return this.incomeStore.grossColor() === id;
  }

  protected onSelect(id: AccentColorId | undefined): void {
    void this.incomeStore.setGrossColor(id);
  }

  /**
   * The swatch shows the *canvas* hex the charts will actually draw with — read through the same
   * resolver they use, not `ACCENT_COLORS`' OKLCH values, so the preview can't drift from the
   * plotted series. The `style()` read is what re-runs this on a theme switch: the resolver keys off
   * the `data-theme` attribute, which isn't itself a signal.
   */
  protected swatch(id: AccentColorId | undefined): string {
    void this.themeService.style();
    return resolveGrossSeriesColor(id);
  }
}
