import { ChangeDetectionStrategy, Component, inject, input, model } from '@angular/core';
import type { Account } from '@/core/data-access';
import { detectOwnIban, matchAccountByIban, CsvImportService, guessDelimiter } from '@/core/import';
import { FieldsetComponent, FlexComponent, PaperComponent, TypographyComponent } from '@/shared/ui';
import { MappingProfilesStore } from '../../mapping-profiles.store';
import { QueuedFileRowComponent } from '../queued-file-row/queued-file-row.component';

/** A not-yet-persisted account, created inline from step 1 (TICKET-IMP-08) — only becomes a real `Account` at commit time. */
export type PendingAccountDraft = {
  id: string;
  /** The queued file whose "+ New account" action created this draft — the one and only file that actually persists it (TICKET-IMP-08). */
  ownerFile: File;
  name: string;
  iban: string;
  /**
   * Matches `Account['type']`, including `'joint'` — a joint draft is created with no co-owners
   * registered (`coOwners`/`ownershipShare` both left `undefined`, same as any other account
   * created with none), editable afterward via the full account form on the Accounts screen.
   */
  type: Account['type'];
};

export type QueuedImportFile = {
  file: File;
  accountId: number | null;
  autoDetected: boolean;
  /** Set once this file is linked to (or owns) a `PendingAccountDraft`; mutually exclusive with a non-null `accountId` (TICKET-IMP-08). */
  pendingDraftId: string | null;
  /** The file's own IBAN/account number detected via `detectOwnIban`, kept even when it matched no existing account, so "+ New account" can pre-fill from it (TICKET-IMP-08). */
  detectedIban: string | null;
};

let nextDraftId = 0;
const createDraftId = (): string => `draft-${++nextDraftId}`;

const stripExtension = (filename: string): string => filename.replace(/\.[^./\\]+$/, '');

@Component({
  selector: 'app-import-select-step',
  imports: [
    FieldsetComponent,
    FlexComponent,
    PaperComponent,
    QueuedFileRowComponent,
    TypographyComponent,
  ],
  templateUrl: './import-select-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportSelectStepComponent {
  readonly accounts = input.required<Account[]>();
  readonly queue = model<QueuedImportFile[]>([]);
  readonly pendingDrafts = model<PendingAccountDraft[]>([]);

  private readonly csvImportService = inject(CsvImportService);
  private readonly mappingProfilesStore = inject(MappingProfilesStore);

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    await this.addFiles(input.files);
    input.value = '';
  }

  protected async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    await this.addFiles(event.dataTransfer?.files ?? null);
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  protected onAccountChange(file: File, value: string): void {
    if (value.startsWith('draft:')) {
      const draftId = value.slice('draft:'.length);
      this.queue.update((rows) =>
        rows.map((row) =>
          row.file === file
            ? { ...row, accountId: null, pendingDraftId: draftId, autoDetected: false }
            : row,
        ),
      );
      return;
    }
    const accountId = value ? Number(value) : null;
    this.queue.update((rows) =>
      rows.map((row) =>
        row.file === file ? { ...row, accountId, pendingDraftId: null, autoDetected: false } : row,
      ),
    );
  }

  protected removeFile(file: File): void {
    const removed = this.queue().find((row) => row.file === file);
    this.queue.update((rows) => rows.filter((row) => row.file !== file));
    if (removed?.pendingDraftId) this.reconcileDraftOwnership(removed.pendingDraftId, removed.file);
  }

  /** Turns "+ New account" into a draft owned by this file, pre-filled from its detected IBAN or filename (TICKET-IMP-08). */
  protected startNewAccountDraft(file: File): void {
    const row = this.queue().find((r) => r.file === file);
    if (!row) return;

    const draft: PendingAccountDraft = {
      id: createDraftId(),
      ownerFile: row.file,
      name: stripExtension(row.file.name),
      iban: row.detectedIban ?? '',
      type: 'checking',
    };
    this.pendingDrafts.update((drafts) => [...drafts, draft]);
    this.queue.update((rows) =>
      rows.map((r) => (r.file === file ? { ...r, accountId: null, pendingDraftId: draft.id } : r)),
    );
  }

  /** Abandons the draft outright — unlinks every file that had linked to it, not just the owner. */
  protected cancelDraft(draftId: string): void {
    this.pendingDrafts.update((drafts) => drafts.filter((d) => d.id !== draftId));
    this.queue.update((rows) =>
      rows.map((r) => (r.pendingDraftId === draftId ? { ...r, pendingDraftId: null } : r)),
    );
  }

  protected isDraftOwner(row: QueuedImportFile, draftId: string): boolean {
    return this.pendingDrafts().find((d) => d.id === draftId)?.ownerFile === row.file;
  }

  /** Dispatches each queued row to the right template branch, kept out of the template itself to stay flat (TICKET-IMP-08). */
  protected rowMode(row: QueuedImportFile): 'owner' | 'empty-nudge' | 'select' {
    if (row.pendingDraftId && this.isDraftOwner(row, row.pendingDraftId)) return 'owner';
    if (this.accounts().length === 0 && !row.pendingDraftId) return 'empty-nudge';
    return 'select';
  }

  protected updateDraftName(draftId: string, name: string): void {
    this.pendingDrafts.update((drafts) =>
      drafts.map((d) => (d.id === draftId ? { ...d, name } : d)),
    );
  }

  protected updateDraftIban(draftId: string, iban: string): void {
    this.pendingDrafts.update((drafts) =>
      drafts.map((d) => (d.id === draftId ? { ...d, iban } : d)),
    );
  }

  protected updateDraftType(draftId: string, type: PendingAccountDraft['type']): void {
    this.pendingDrafts.update((drafts) =>
      drafts.map((d) => (d.id === draftId ? { ...d, type } : d)),
    );
  }

  /**
   * After the owning file for `draftId` is gone (removed or cancelled), either promotes the next
   * still-linked file to owner, or drops the now-unreferenced draft entirely (TICKET-IMP-08).
   */
  private reconcileDraftOwnership(draftId: string, removedOwnerFile: File | null): void {
    const draft = this.pendingDrafts().find((d) => d.id === draftId);
    if (!draft || draft.ownerFile !== removedOwnerFile) return;

    const nextOwnerRow = this.queue().find((row) => row.pendingDraftId === draftId);
    if (nextOwnerRow) {
      this.pendingDrafts.update((drafts) =>
        drafts.map((d) => (d.id === draftId ? { ...d, ownerFile: nextOwnerRow.file } : d)),
      );
    } else {
      this.pendingDrafts.update((drafts) => drafts.filter((d) => d.id !== draftId));
    }
  }

  private async addFiles(fileList: FileList | null): Promise<void> {
    if (!fileList || fileList.length === 0) return;

    const existingKeys = new Set(this.queue().map((row) => `${row.file.name}:${row.file.size}`));
    const newFiles = Array.from(fileList).filter(
      (file) => !existingKeys.has(`${file.name}:${file.size}`),
    );
    if (newFiles.length === 0) return;

    const startIndex = this.queue().length;
    this.queue.update((rows) => [
      ...rows,
      ...newFiles.map((file) => ({
        file,
        accountId: null,
        autoDetected: false,
        pendingDraftId: null,
        detectedIban: null,
      })),
    ]);

    await Promise.all(
      newFiles.map(async (file, offset) => {
        const { accountId, detectedIban } = await this.detectAccountId(file);
        const index = startIndex + offset;
        this.queue.update((rows) =>
          rows.map((row, i) =>
            i === index && row.file === file
              ? {
                  ...row,
                  accountId: accountId ?? row.accountId,
                  autoDetected: accountId !== null,
                  detectedIban,
                }
              : row,
          ),
        );
      }),
    );
  }

  private async detectAccountId(
    file: File,
  ): Promise<{ accountId: number | null; detectedIban: string | null }> {
    try {
      const sampleBuffer = await file.slice(0, 8192).arrayBuffer();
      const sampleText = new TextDecoder('utf-8').decode(sampleBuffer);
      const delimiter = guessDelimiter(sampleText);

      const profile = await this.mappingProfilesStore.detectTemplateForFile((encoding) =>
        this.csvImportService.detectHeaders(file, delimiter, encoding),
      );
      if (!profile?.columns.ownIban) return { accountId: null, detectedIban: null };

      const headerRows = profile.headerRows || 1;
      const previewRows = await this.csvImportService.previewRawRows(
        file,
        delimiter,
        profile.encoding || 'utf-8',
        headerRows + 5,
      );
      const headerRow = previewRows[headerRows - 1] ?? [];
      const dataRows = previewRows.slice(headerRows);
      const detectedIban = detectOwnIban(headerRow, dataRows, profile);
      const accountId = matchAccountByIban(detectedIban, this.accounts())?.id ?? null;
      return { accountId, detectedIban };
    } catch {
      return { accountId: null, detectedIban: null };
    }
  }
}
