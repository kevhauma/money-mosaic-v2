import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DataManagementRepository, type AppDataExport, type ImportMode } from '@/core/data-access';
import { StorageStatusService } from '@/core/storage';
import {
  AlertComponent,
  BadgeComponent,
  ButtonComponent,
  ConfirmDialogComponent,
  FieldsetComponent,
  FlexComponent,
  LabelComponent,
  MmModalComponent,
  PaperComponent,
  TypographyComponent,
} from '@/shared/ui';
import { downloadJson } from '@/shared/utils';
import type { QrTransferResult } from '@/core/qr-sync';
import { QrReceiveDialogComponent } from '../qr-receive-dialog/qr-receive-dialog.component';
import { QrSendDialogComponent } from '../qr-send-dialog/qr-send-dialog.component';

const todayIso = (): string => new Date().toISOString().slice(0, 10);

const OMITTED_FIELD_LABELS: Record<string, string> = {
  rawLine: 'original CSV rows',
  rawRow: 'original CSV rows',
};

/**
 * A QR transfer leaves the bulky source-CSV fields behind unless the sender opted in, and `bulkPut`
 * replaces a whole row — so a merge can *clear* those fields on transactions this browser already
 * has. Worth one sentence at the point of no return rather than a surprise afterwards.
 */
const describeOmissions = (omitted: Record<string, string[]>): string | null => {
  const labels = [
    ...new Set(
      Object.values(omitted)
        .flat()
        .map((field) => OMITTED_FIELD_LABELS[field] ?? field),
    ),
  ];
  if (!labels.length) return null;
  return `This transfer left the ${labels.join(' and ')} behind to keep the code count down. Merging will clear them on any transaction already stored here.`;
};

@Component({
  selector: 'app-data-management-overview',
  imports: [
    AlertComponent,
    BadgeComponent,
    ButtonComponent,
    ConfirmDialogComponent,
    FieldsetComponent,
    FlexComponent,
    LabelComponent,
    MmModalComponent,
    PaperComponent,
    QrReceiveDialogComponent,
    QrSendDialogComponent,
    TypographyComponent,
  ],
  templateUrl: './data-management-overview.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataManagementOverviewComponent {
  private readonly dataManagementRepository = inject(DataManagementRepository);
  protected readonly storageStatus = inject(StorageStatusService).status;

  protected readonly exporting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly importDialogOpen = signal(false);
  protected readonly importMode = signal<ImportMode>('merge');
  protected readonly importing = signal(false);
  protected readonly reloadPromptOpen = signal(false);

  protected readonly qrSendOpen = signal(false);
  protected readonly qrReceiveOpen = signal(false);
  /** Set when a QR transfer arrived without some fields, so the confirm dialog can say so. */
  protected readonly importNote = signal<string | null>(null);

  protected readonly deleteDialogOpen = signal(false);
  protected readonly deleting = signal(false);

  private pendingImport: AppDataExport | null = null;

  protected async exportData(): Promise<void> {
    this.errorMessage.set(null);
    this.exporting.set(true);
    try {
      const data = await this.dataManagementRepository.exportAll();
      downloadJson(data, `money-mosaic-backup-${todayIso()}.json`);
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Export failed.');
    } finally {
      this.exporting.set(false);
    }
  }

  protected async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    if (!file) return;

    this.errorMessage.set(null);
    try {
      const parsed = JSON.parse(await file.text()) as AppDataExport;
      if (typeof parsed.schemaVersion !== 'number' || typeof parsed.tables !== 'object') {
        throw new Error('This file is not a Money Mosaic backup.');
      }
      this.pendingImport = parsed;
      this.importNote.set(null);
      this.importMode.set('merge');
      this.importDialogOpen.set(true);
    } catch {
      this.errorMessage.set('Could not read this file — it is not a valid Money Mosaic backup.');
    }
  }

  /**
   * A QR transfer lands in exactly the same place a chosen file does — the Replace-vs-Merge
   * dialog — so there is one import path, one confirmation, and one schema-version guard.
   */
  protected onQrReceived(transfer: QrTransferResult): void {
    this.qrReceiveOpen.set(false);
    this.errorMessage.set(null);
    this.pendingImport = transfer.data;
    this.importNote.set(describeOmissions(transfer.omitted));
    this.importMode.set('merge');
    this.importDialogOpen.set(true);
  }

  protected async confirmImport(): Promise<void> {
    if (!this.pendingImport) return;
    this.errorMessage.set(null);
    this.importing.set(true);
    try {
      await this.dataManagementRepository.importAll(this.pendingImport, this.importMode());
      this.pendingImport = null;
      this.importDialogOpen.set(false);
      this.reloadPromptOpen.set(true);
    } catch (error) {
      // Deliberately keep pendingImport and the dialog open on failure so the user can retry
      // (e.g. after picking a different mode) without re-selecting the file.
      this.errorMessage.set(error instanceof Error ? error.message : 'Import failed.');
    } finally {
      this.importing.set(false);
    }
  }

  protected async deleteAllConfirmed(): Promise<void> {
    this.errorMessage.set(null);
    this.deleting.set(true);
    try {
      await this.dataManagementRepository.deleteAll();
      this.reloadPage();
    } catch (error) {
      this.errorMessage.set(error instanceof Error ? error.message : 'Delete failed.');
    } finally {
      this.deleting.set(false);
    }
  }

  protected reloadPage(): void {
    window.location.reload();
  }
}
