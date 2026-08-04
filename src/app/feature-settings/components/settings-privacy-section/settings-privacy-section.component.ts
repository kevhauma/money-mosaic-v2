import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AppSettingsStore } from '@/core/state';
import { LabelComponent, PaperComponent, TypographyComponent } from '@/shared/ui';
import { linkControlToSetting } from '@/shared/utils';

/**
 * Settings' Privacy section (TICKET-PRIV-01): the persisted default for privacy mode, which blurs
 * every figure on the Dashboard. The same setting has a one-click toggle in the Dashboard's own page
 * header — both write `AppSettingsStore.setPrivacyMode`, so they can't disagree.
 */
@Component({
  selector: 'app-settings-privacy-section',
  imports: [ReactiveFormsModule, LabelComponent, PaperComponent, TypographyComponent],
  templateUrl: './settings-privacy-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPrivacySectionComponent {
  private readonly appSettingsStore = inject(AppSettingsStore);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly privacyModeControl = this.formBuilder.nonNullable.control(
    this.appSettingsStore.privacyModeEnabled(),
  );

  constructor() {
    linkControlToSetting(
      this.privacyModeControl,
      () => this.appSettingsStore.privacyModeEnabled(),
      (privacyMode) => void this.appSettingsStore.setPrivacyMode(privacyMode),
    );
  }
}
