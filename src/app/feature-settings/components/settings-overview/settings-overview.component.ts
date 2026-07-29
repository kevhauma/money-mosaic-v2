import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent, TypographyComponent } from '@/shared/ui';
import { SettingsAboutSectionComponent } from '../settings-about-section/settings-about-section.component';
import { SettingsCurrencyLocaleSectionComponent } from '../settings-currency-locale-section/settings-currency-locale-section.component';
import { SettingsDataSectionComponent } from '../settings-data-section/settings-data-section.component';
import { SettingsThemeSectionComponent } from '../settings-theme-section/settings-theme-section.component';

/**
 * Settings page — composition only (TICKET-SET-07, CR4-5): a page header, the section components
 * in order, and a low-key link back to the public landing page (TICKET-PUB-01). Every setting's
 * controls, store wiring, and copy live in its own section component, so the next setting lands as
 * a new section rather than another block on this file.
 */
@Component({
  selector: 'app-settings-overview',
  imports: [
    RouterLink,
    PageHeaderComponent,
    SettingsAboutSectionComponent,
    SettingsCurrencyLocaleSectionComponent,
    SettingsDataSectionComponent,
    SettingsThemeSectionComponent,
    TypographyComponent,
  ],
  templateUrl: './settings-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsOverviewComponent {}
