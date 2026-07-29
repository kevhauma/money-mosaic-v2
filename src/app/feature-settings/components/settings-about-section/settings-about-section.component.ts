import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerBrandGithub } from '@ng-icons/tabler-icons';
import { GITHUB_REPO_URL } from '@/core/links';
import { PaperComponent, TypographyComponent } from '@/shared/ui';

/** Settings' About section (TICKET-SET-07) — the source-repository link (TICKET-PUB-06). */
@Component({
  selector: 'app-settings-about-section',
  imports: [NgIcon, PaperComponent, TypographyComponent],
  templateUrl: './settings-about-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerBrandGithub })],
})
export class SettingsAboutSectionComponent {
  protected readonly githubRepoUrl = GITHUB_REPO_URL;
}
