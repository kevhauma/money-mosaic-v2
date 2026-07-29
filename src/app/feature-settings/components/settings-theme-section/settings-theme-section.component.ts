import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppSettingsStore } from '@/core/state';
import {
  ACCENT_COLORS,
  accentSwatchColor,
  DEFAULT_THEME_STYLE_IDS,
  defaultAccentSwatchColor,
  THEME_STYLES,
  ThemeService,
  type AccentColor,
  type AccentColorId,
  type ThemeStyle,
  type ThemeStyleId,
} from '@/core/theme';
import { PaperComponent, TypographyComponent } from '@/shared/ui';

/**
 * Settings' Theme section (TICKET-SET-07): one flat list of every catalogue theme, plus the
 * accent-color row for the two default themes (TICKET-SET-02), which renders *inside* the theme
 * grid right after the last default entry so it sits under those two cards. Picking a theme
 * applies it immediately (`ThemeService.select`). Each option renders a live mini preview by
 * nesting the style's `data-theme` attribute — daisyUI tokens and the `--mm-*` hooks resolve from
 * the nearest `data-theme` ancestor, so the swatch shows the real palette/radius/type without
 * screenshots.
 */
@Component({
  selector: 'app-settings-theme-section',
  imports: [PaperComponent, TypographyComponent],
  templateUrl: './settings-theme-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsThemeSectionComponent {
  protected readonly themeService = inject(ThemeService);
  private readonly appSettingsStore = inject(AppSettingsStore);

  protected readonly styles: readonly ThemeStyle[] = THEME_STYLES;
  protected readonly accentColors: readonly AccentColor[] = ACCENT_COLORS;

  /**
   * The accent row renders right after the last `DEFAULT_THEME_STYLE_IDS` entry in `styles` — tied
   * to the canonical id list rather than a hardcoded style id, so reordering `THEME_STYLES` can't
   * silently relocate it.
   */
  protected readonly lastDefaultThemeId = DEFAULT_THEME_STYLE_IDS.at(-1);

  protected isSelected(id: ThemeStyleId): boolean {
    return this.themeService.style() === id;
  }

  protected onSelect(id: ThemeStyleId): void {
    this.themeService.select(id);
  }

  protected isAccentSelected(id: AccentColorId | undefined): boolean {
    return this.appSettingsStore.primaryColor() === id;
  }

  protected onSelectAccent(id: AccentColorId | undefined): void {
    void this.appSettingsStore.setPrimaryColor(id);
  }

  protected accentSwatch(color: AccentColor): string {
    return accentSwatchColor(color, this.themeService.style());
  }

  protected defaultAccentSwatch(): string {
    return defaultAccentSwatchColor(this.themeService.style());
  }
}
