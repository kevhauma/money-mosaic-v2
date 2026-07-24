import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ACCOUNT_TYPE_OPTIONS } from '@/feature-accounts';
import { BadgeComponent, ButtonComponent, FlexComponent } from '@/shared/ui';
import type { PendingAccountDraft } from '../import-select-step/import-select-step.component';

/**
 * Inline name/IBAN/type editor for a queued file's not-yet-created account (TICKET-IMP-08) — split
 * out of `ImportSelectStepComponent`'s own template purely to keep that template's per-row
 * branching flat. Owns no state; the parent owns the `PendingAccountDraft` and reacts to changes.
 */
@Component({
  selector: 'app-account-draft-editor',
  imports: [ButtonComponent, BadgeComponent, FlexComponent],
  templateUrl: './account-draft-editor.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountDraftEditorComponent {
  readonly draft = input.required<PendingAccountDraft>();

  protected readonly accountTypeOptions = ACCOUNT_TYPE_OPTIONS;

  readonly nameChange = output<string>();
  readonly ibanChange = output<string>();
  readonly typeChange = output<PendingAccountDraft['type']>();
  readonly cancelled = output<void>();

  protected onNameInput(event: Event): void {
    this.nameChange.emit((event.target as HTMLInputElement).value);
  }

  protected onIbanInput(event: Event): void {
    this.ibanChange.emit((event.target as HTMLInputElement).value);
  }

  protected onTypeChange(event: Event): void {
    this.typeChange.emit((event.target as HTMLSelectElement).value as PendingAccountDraft['type']);
  }
}
