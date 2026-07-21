import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { THEME_STYLES, ThemeService, type ThemeStyle, type ThemeStyleId } from '@/core/theme';
import { PageHeaderComponent, PaperComponent, TypographyComponent } from '@/shared/ui';

/**
 * Settings page — for now it holds only the theme picker. One flat list of every catalogue theme;
 * picking one applies it immediately (ThemeService.select). Each option renders a live mini
 * preview by nesting the style's `data-theme` attribute — daisyUI tokens and the `--mm-*` hooks
 * resolve from the nearest `data-theme` ancestor, so the swatch shows the real palette/radius/type
 * without screenshots.
 */
@Component({
  selector: 'app-settings-overview',
  imports: [PageHeaderComponent, PaperComponent, TypographyComponent],
  templateUrl: './settings-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsOverviewComponent {
  protected readonly themeService = inject(ThemeService);

  protected readonly styles: readonly ThemeStyle[] = THEME_STYLES;

  protected isSelected(id: ThemeStyleId): boolean {
    return this.themeService.style() === id;
  }

  protected onSelect(id: ThemeStyleId): void {
    this.themeService.select(id);
  }
}
