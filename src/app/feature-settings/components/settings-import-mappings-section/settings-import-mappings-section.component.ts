import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { MappingProfile } from '@/core/data-access';
import { AccountsStore } from '@/core/state';
import { MappingProfilesStore } from '@/feature-import';
import {
  ButtonComponent,
  ConfirmDialogComponent,
  EmptyStateComponent,
  FlexComponent,
  HydrationBoundaryComponent,
  PaperComponent,
  TableComponent,
  TypographyComponent,
} from '@/shared/ui';
import { createConfirmState, hydrationOf } from '@/shared/utils';
import { MappingProfileFormComponent } from '../mapping-profile-form/mapping-profile-form.component';

/**
 * Settings' Import mappings section (TICKET-SET-11): every saved mapping — the seeded bank
 * templates and the ones the wizard remembered per account — with edit, duplicate and delete.
 * Every write goes through `MappingProfilesStore`.
 */
@Component({
  selector: 'app-settings-import-mappings-section',
  imports: [
    ButtonComponent,
    ConfirmDialogComponent,
    EmptyStateComponent,
    FlexComponent,
    HydrationBoundaryComponent,
    MappingProfileFormComponent,
    PaperComponent,
    TableComponent,
    TypographyComponent,
  ],
  templateUrl: './settings-import-mappings-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsImportMappingsSectionComponent {
  private readonly store = inject(MappingProfilesStore);
  private readonly accountsStore = inject(AccountsStore);

  /** Both stores, so a failed read is never shown as "no mappings" or as "Any" account. */
  protected readonly hydration = hydrationOf(this.store, this.accountsStore);

  protected readonly rows = computed(() =>
    this.store.profiles().map((profile) => ({
      profile,
      preset: profile.bankPreset ?? '—',
      // A remembered mapping still belongs to its account after that account is gone
      // (`findRemembered` keys on the id), so it is not "Any".
      account:
        profile.defaultAccountId == null
          ? 'Any'
          : (this.accountsStore.accountsById().get(profile.defaultAccountId)?.name ??
            'Unknown account'),
      autoDetects: profile.headerSignature?.length ? 'Yes' : 'No',
    })),
  );

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<MappingProfile | null>(null);

  protected readonly deleteConfirm = createConfirmState<MappingProfile>();
  protected readonly deleteMessage = computed(() => {
    const pending = this.deleteConfirm.pending();
    return pending
      ? `“${pending.name}” will be removed. The next import of that file type picks a mapping again, by detection or in the wizard.`
      : '';
  });

  protected edit(profile: MappingProfile): void {
    this.editing.set(profile);
    this.formOpen.set(true);
  }

  protected async duplicate(profile: MappingProfile): Promise<void> {
    this.edit(await this.store.duplicateProfile(profile));
  }

  protected save(changes: Partial<MappingProfile>): void {
    const id = this.editing()?.id;
    if (id != null) void this.store.updateProfile(id, changes);
  }

  protected deleteConfirmed(): void {
    const target = this.deleteConfirm.confirm();
    if (target?.id != null) void this.store.removeProfile(target.id);
  }
}
