import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type { Account } from '@/core/data-access';
import { BadgeComponent, ButtonComponent, FlexComponent, TypographyComponent } from '@/shared/ui';
import { AccountDraftEditorComponent } from '../account-draft-editor/account-draft-editor.component';
import type {
  PendingAccountDraft,
  QueuedImportFile,
} from '../import-select-step/import-select-step.component';

/**
 * One queued file's row in step 1 (TICKET-IMP-08) — split out of `ImportSelectStepComponent`'s own
 * template purely to keep that template's per-row branching flat (fallow flagged the combined
 * template as critically complex). Owns no state; the parent decides `mode` and reacts to events.
 */
@Component({
  selector: 'app-queued-file-row',
  imports: [
    AccountDraftEditorComponent,
    BadgeComponent,
    ButtonComponent,
    FlexComponent,
    TypographyComponent,
  ],
  templateUrl: './queued-file-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QueuedFileRowComponent {
  readonly row = input.required<QueuedImportFile>();
  readonly accounts = input.required<Account[]>();
  readonly pendingDrafts = input.required<PendingAccountDraft[]>();
  readonly mode = input.required<'owner' | 'empty-nudge' | 'select'>();

  readonly accountChange = output<string>();
  readonly newAccountRequested = output<void>();
  readonly removed = output<void>();
  readonly draftNameChange = output<string>();
  readonly draftIbanChange = output<string>();
  readonly draftTypeChange = output<PendingAccountDraft['type']>();
  readonly draftCancelled = output<void>();

  protected draftFor(draftId: string | null): PendingAccountDraft | undefined {
    if (!draftId) return undefined;
    return this.pendingDrafts().find((draft) => draft.id === draftId);
  }

  protected ownerFileNameFor(draftId: string): string {
    return this.draftFor(draftId)?.ownerFile.name ?? '';
  }

  protected onSelectChange(event: Event): void {
    this.accountChange.emit((event.target as HTMLSelectElement).value);
  }
}
