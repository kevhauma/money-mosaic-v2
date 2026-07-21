import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerBrandGithub } from '@ng-icons/tabler-icons';
import { GITHUB_REPO_URL } from '@/core/links';
import { THEME_STYLES, ThemeService, type ThemeStyle, type ThemeStyleId } from '@/core/theme';
import { DataManagementOverviewComponent } from '@/feature-data-management';
import { PageHeaderComponent, PaperComponent, TypographyComponent } from '@/shared/ui';

/**
 * Settings page — the theme picker, a low-key link back to the public landing page
 * (TICKET-PUB-01), the Data Management section (export/import/delete-all, embedded directly
 * rather than routed — TICKET-SET-06), and an About/GitHub link. One flat list of every
 * catalogue theme; picking one applies it immediately (ThemeService.select). Each option renders
 * a live mini preview by nesting the style's `data-theme` attribute — daisyUI tokens and the
 * `--mm-*` hooks resolve from the nearest `data-theme` ancestor, so the swatch shows the real
 * palette/radius/type without screenshots.
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

  protected readonly styles: readonly ThemeStyle[] = THEME_STYLES;

  protected readonly githubRepoUrl = GITHUB_REPO_URL;

  protected isSelected(id: ThemeStyleId): boolean {
    return this.themeService.style() === id;
  }

  protected onSelect(id: ThemeStyleId): void {
    this.themeService.select(id);
  }
}
