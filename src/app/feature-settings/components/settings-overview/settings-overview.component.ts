import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerBrandGithub } from '@ng-icons/tabler-icons';
import { GITHUB_REPO_URL } from '@/core/links';
import { AppSettingsStore } from '@/core/state';
import {
  ACCENT_COLORS,
  DEFAULT_THEME_ACCENT,
  DEFAULT_THEME_STYLE_IDS,
  THEME_STYLES,
  ThemeService,
  type AccentColor,
  type AccentColorId,
  type ThemeStyle,
  type ThemeStyleId,
} from '@/core/theme';
import { DataManagementOverviewComponent } from '@/feature-data-management';
import { PageHeaderComponent, PaperComponent, TypographyComponent } from '@/shared/ui';

/**
 * Settings page — the theme picker, an accent-color row for the two default themes
 * (TICKET-SET-02), a low-key link back to the public landing page (TICKET-PUB-01), the Data
 * Management section (export/import/delete-all, embedded directly rather than routed —
 * TICKET-SET-06), and an About/GitHub link. One flat list of every catalogue theme; picking one
 * applies it immediately (ThemeService.select). Each option renders a live mini preview by
 * nesting the style's `data-theme` attribute — daisyUI tokens and the `--mm-*` hooks resolve from
 * the nearest `data-theme` ancestor, so the swatch shows the real palette/radius/type without
 * screenshots.
 */
@Component({
  selector: 'app-settings-overview',
  imports: [
    PageHeaderComponent,
    PaperComponent,
    TypographyComponent,
    RouterLink,
    NgIcon,
    DataManagementOverviewComponent,
  ],
  templateUrl: './settings-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerBrandGithub })],
})
export class SettingsOverviewComponent {
  protected readonly themeService = inject(ThemeService);
  protected readonly appSettingsStore = inject(AppSettingsStore);

  protected readonly styles: readonly ThemeStyle[] = THEME_STYLES;
  protected readonly accentColors: readonly AccentColor[] = ACCENT_COLORS;

  protected readonly githubRepoUrl = GITHUB_REPO_URL;

  /**
   * The accent-color popover renders right after the last `DEFAULT_THEME_STYLE_IDS` entry in
   * `styles` (so it visually sits under the two default-theme cards) — tied to the canonical id
   * list rather than a hardcoded style id, so reordering `THEME_STYLES` can't silently relocate it.
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

  /** The pair actually applied for `color` right now — Dark's own tuned pair, not a light preview, while Default Dark is active. */
  protected accentSwatch(color: AccentColor): string {
    return this.themeService.style() === 'deformable-dark'
      ? color.dark.primary
      : color.light.primary;
  }

  /** The "Default" option's own fill — the theme's actual baked-in accent, not a placeholder. */
  protected defaultAccentSwatch(): string {
    return this.themeService.style() === 'deformable-dark'
      ? DEFAULT_THEME_ACCENT.dark
      : DEFAULT_THEME_ACCENT.light;
  }
}
