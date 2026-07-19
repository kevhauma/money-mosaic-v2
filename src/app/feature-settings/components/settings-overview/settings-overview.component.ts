import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import {
  ThemeService,
  themeStylesForMode,
  type ThemeMode,
  type ThemeStyle,
  type ThemeStyleId,
} from '@/core/theme';
import { PageHeaderComponent, PaperComponent, TypographyComponent } from '@/shared/ui';

/**
 * Settings page — for now it holds only the theme-style picker. Styles are split by the mode they
 * were designed for: picking one sets it as that mode's look AND switches the app to that mode so
 * the choice is immediately visible (ThemeService.selectStyle); the navbar sun/moon toggle keeps
 * flipping between the two per-mode picks. Each option renders a live mini preview by nesting the
 * style's `data-theme` attribute — daisyUI tokens and the `--mm-*` hooks resolve from the nearest
 * `data-theme` ancestor, so the swatch shows the real palette/radius/type without screenshots.
 */
@Component({
  selector: 'app-settings-overview',
  imports: [NgTemplateOutlet, PageHeaderComponent, PaperComponent, TypographyComponent],
  templateUrl: './settings-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsOverviewComponent {
  protected readonly themeService = inject(ThemeService);

  protected readonly lightStyles: ThemeStyle[] = themeStylesForMode('light');
  protected readonly darkStyles: ThemeStyle[] = themeStylesForMode('dark');

  protected isSelected(mode: ThemeMode, id: ThemeStyleId): boolean {
    const pick = mode === 'dark' ? this.themeService.darkStyle() : this.themeService.lightStyle();
    return pick === id;
  }

  protected onSelect(mode: ThemeMode, id: ThemeStyleId): void {
    this.themeService.selectStyle(mode, id);
  }
}
