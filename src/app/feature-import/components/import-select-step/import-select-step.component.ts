import { ChangeDetectionStrategy, Component, inject, input, model } from '@angular/core';
import type { Account } from '@/core/data-access';
import { detectOwnIban, matchAccountByIban, CsvImportService, guessDelimiter } from '@/core/import';
import { BadgeComponent, ButtonComponent, PaperComponent, TypographyComponent } from '@/shared/ui';
import { MappingProfilesStore } from '../../mapping-profiles.store';

export type QueuedImportFile = {
  file: File;
  accountId: number | null;
  autoDetected: boolean;
};

@Component({
  selector: 'app-import-select-step',
  imports: [BadgeComponent, ButtonComponent, PaperComponent, TypographyComponent],
  templateUrl: './import-select-step.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportSelectStepComponent {
  readonly accounts = input.required<Account[]>();
  readonly queue = model<QueuedImportFile[]>([]);

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

  protected onAccountChange(index: number, event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    const accountId = value ? Number(value) : null;
    this.queue.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, accountId, autoDetected: false } : row)),
    );
  }

  protected removeFile(index: number): void {
    this.queue.update((rows) => rows.filter((_, i) => i !== index));
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
      ...newFiles.map((file) => ({ file, accountId: null, autoDetected: false })),
    ]);

    await Promise.all(
      newFiles.map(async (file, offset) => {
        const accountId = await this.detectAccountId(file);
        if (accountId === null) return;
        const index = startIndex + offset;
        this.queue.update((rows) =>
          rows.map((row, i) =>
            i === index && row.file === file ? { ...row, accountId, autoDetected: true } : row,
          ),
        );
      }),
    );
  }

  private async detectAccountId(file: File): Promise<number | null> {
    try {
      const sampleBuffer = await file.slice(0, 8192).arrayBuffer();
      const sampleText = new TextDecoder('utf-8').decode(sampleBuffer);
      const delimiter = guessDelimiter(sampleText);

      const profile = await this.mappingProfilesStore.detectTemplateForFile((encoding) =>
        this.csvImportService.detectHeaders(file, delimiter, encoding),
      );
      if (!profile?.columns.ownIban) return null;

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
      return matchAccountByIban(detectedIban, this.accounts())?.id ?? null;
    } catch {
      return null;
    }
  }
}
