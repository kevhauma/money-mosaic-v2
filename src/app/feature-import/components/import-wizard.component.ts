import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AccountsStore } from '@/feature-accounts';
import { CsvImportService, type CommitImportResult, type ParsedRowResult } from '@/core/import';
import type { MappingProfile } from '@/core/data-access';
import { MappingProfilesStore } from '../mapping-profiles.store';
import { ImportBatchesStore } from '../import-batches.store';
import { ImportSelectStepComponent } from './import-select-step.component';
import { ImportMapStepComponent, type ImportMappingResult } from './import-map-step.component';
import { ImportPreviewStepComponent } from './import-preview-step.component';
import { ImportSummaryStepComponent } from './import-summary-step.component';

type WizardStep = 1 | 2 | 3 | 4;
type ValidParsedRow = Extract<ParsedRowResult, { valid: true }>;

@Component({
  selector: 'app-import-wizard',
  imports: [
    ImportSelectStepComponent,
    ImportMapStepComponent,
    ImportPreviewStepComponent,
    ImportSummaryStepComponent,
  ],
  templateUrl: './import-wizard.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportWizardComponent {
  protected readonly accountsStore = inject(AccountsStore);
  private readonly mappingProfilesStore = inject(MappingProfilesStore);
  private readonly importBatchesStore = inject(ImportBatchesStore);
  private readonly csvImportService = inject(CsvImportService);

  protected readonly step = signal<WizardStep>(1);
  protected readonly selectedAccountId = signal<number | null>(null);
  protected readonly selectedFile = signal<File | null>(null);
  protected readonly mapResult = signal<ImportMappingResult | null>(null);
  protected readonly parsedRows = signal<ParsedRowResult[]>([]);
  protected readonly parseError = signal<string | null>(null);
  protected readonly commitResult = signal<CommitImportResult | null>(null);

  protected readonly parsing = signal(false);
  protected readonly committing = signal(false);

  protected readonly canAdvanceFromStep1 = computed(
    () => this.selectedAccountId() !== null && this.selectedFile() !== null,
  );

  protected async goNext(): Promise<void> {
    switch (this.step()) {
      case 1:
        if (!this.canAdvanceFromStep1()) return;
        this.step.set(2);
        return;
      case 2:
        if (!this.mapResult()) return;
        await this.runParse();
        return;
      case 3:
        await this.runCommit();
        return;
    }
  }

  protected goBack(): void {
    if (this.step() > 1) this.step.set((this.step() - 1) as WizardStep);
  }

  private async runParse(): Promise<void> {
    const file = this.selectedFile();
    const mapResult = this.mapResult();
    if (!file || !mapResult) return;

    this.parsing.set(true);
    try {
      const response = await this.csvImportService.parse(
        file,
        mapResult.mappingProfile as MappingProfile,
      );
      if ('error' in response) {
        this.parseError.set(response.error);
        return;
      }
      this.parsedRows.set(response.rows);
      this.parseError.set(null);
      this.step.set(3);
    } finally {
      this.parsing.set(false);
    }
  }

  private async runCommit(): Promise<void> {
    const accountId = this.selectedAccountId();
    const file = this.selectedFile();
    const mapResult = this.mapResult();
    if (accountId === null || !file || !mapResult) return;

    this.committing.set(true);
    try {
      const savedProfile = await this.mappingProfilesStore.addProfile(mapResult.mappingProfile);
      const validRows = this.parsedRows().filter((row): row is ValidParsedRow => row.valid);

      const result = await this.importBatchesStore.commitImport({
        accountId,
        fileName: file.name,
        mappingProfileId: savedProfile.id!,
        totalRowsRead: this.parsedRows().length,
        validRows,
      });

      this.commitResult.set(result);
      this.step.set(4);
    } finally {
      this.committing.set(false);
    }
  }

  protected async onUndo(): Promise<void> {
    const result = this.commitResult();
    if (!result) return;
    await this.importBatchesStore.undoImport(result.batch);
    this.resetWizard();
  }

  private resetWizard(): void {
    this.step.set(1);
    this.selectedAccountId.set(null);
    this.selectedFile.set(null);
    this.mapResult.set(null);
    this.parsedRows.set([]);
    this.parseError.set(null);
    this.commitResult.set(null);
  }
}
