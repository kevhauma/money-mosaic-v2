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

const todayIso = (): string => new Date().toISOString().slice(0, 10);

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
      this.importMode.set('merge');
      this.importDialogOpen.set(true);
    } catch {
      this.errorMessage.set('Could not read this file — it is not a valid Money Mosaic backup.');
    }
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
