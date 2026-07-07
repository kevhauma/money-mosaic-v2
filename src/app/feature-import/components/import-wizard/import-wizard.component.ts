import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { AccountsStore } from '@/feature-accounts';
import { CsvImportService, type CommitImportResult, type ParsedRowResult } from '@/core/import';
import type { MappingProfile } from '@/core/data-access';
import { AlertComponent, ButtonComponent } from '@/shared/ui';
import { MappingProfilesStore } from '../../mapping-profiles.store';
import { ImportBatchesStore } from '../../import-batches.store';
import {
  ImportSelectStepComponent,
  type QueuedImportFile,
} from '../import-select-step/import-select-step.component';
import {
  ImportMapStepComponent,
  type ImportMappingResult,
} from '../import-map-step/import-map-step.component';
import { ImportPreviewStepComponent } from '../import-preview-step/import-preview-step.component';
import { ImportSummaryStepComponent } from '../import-summary-step/import-summary-step.component';

// Select → Map+Preview → Summary. Map and preview live on one screen (step 2); there is no
// separate preview-only step anymore.
type WizardStep = 1 | 2 | 3;
type ValidParsedRow = Extract<ParsedRowResult, { valid: true }>;

// Debounce the reactive re-parse so editing the mapping form doesn't spawn a worker parse per
// keystroke (NFR-PERF-2 — parsing runs in a Web Worker, but rapid re-parses are still wasteful).
const PARSE_DEBOUNCE_MS = 300;

@Component({
  selector: 'app-import-wizard',
  imports: [
    ImportSelectStepComponent,
    ImportMapStepComponent,
    ImportPreviewStepComponent,
    ImportSummaryStepComponent,
    ButtonComponent,
    AlertComponent,
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
  protected readonly queue = signal<QueuedImportFile[]>([]);
  protected readonly currentFileIndex = signal(0);
  protected readonly mapResult = signal<ImportMappingResult | null>(null);
  protected readonly parsedRows = signal<ParsedRowResult[]>([]);
  protected readonly parseError = signal<string | null>(null);
  protected readonly parseWarnings = signal<string[]>([]);
  protected readonly commitResults = signal<CommitImportResult[]>([]);

  protected readonly parsing = signal(false);
  protected readonly committing = signal(false);

  protected readonly totalFiles = computed(() => this.queue().length);
  protected readonly currentFile = computed<File | null>(
    () => this.queue()[this.currentFileIndex()]?.file ?? null,
  );
  protected readonly currentAccountId = computed(
    () => this.queue()[this.currentFileIndex()]?.accountId ?? null,
  );

  protected readonly canAdvanceFromStep1 = computed(
    () => this.queue().length > 0 && this.queue().every((row) => row.accountId !== null),
  );

  // Guards against a stale worker parse overwriting fresher state: every parse (and every
  // mapping-invalid reset) bumps the token, and a resolved parse only writes if its token still wins.
  private parseToken = 0;
  private reparseTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    // Live preview: whenever the mapping is valid (mapResult non-null) re-parse the current file
    // after a short debounce; while it's invalid, drop any pending/in-flight parse and clear the
    // preview so step 2 shows a neutral placeholder instead of stale rows.
    effect(() => {
      const file = this.currentFile();
      const mapResult = this.mapResult();

      if (this.reparseTimer !== null) {
        clearTimeout(this.reparseTimer);
        this.reparseTimer = null;
      }

      if (this.step() !== 2 || !file || !mapResult) {
        this.parseToken++;
        this.parsing.set(false);
        this.parsedRows.set([]);
        this.parseError.set(null);
        this.parseWarnings.set([]);
        return;
      }

      // Treat the debounce window as "parsing" too, so the confirm action stays disabled (and shows
      // "Parsing…") until fresh rows land — otherwise a fast click could commit stale/empty rows
      // between the mapping becoming valid and the worker parse resolving.
      this.parsing.set(true);
      const mappingProfile = mapResult.mappingProfile;
      this.reparseTimer = setTimeout(() => {
        this.reparseTimer = null;
        void this.runParse(file, mappingProfile);
      }, PARSE_DEBOUNCE_MS);
    });
  }

  protected async goNext(): Promise<void> {
    switch (this.step()) {
      case 1:
        if (!this.canAdvanceFromStep1()) return;
        this.currentFileIndex.set(0);
        this.step.set(2);
        return;
      case 2:
        await this.runCommit();
        return;
    }
  }

  protected goBack(): void {
    if (this.step() > 1) this.step.set((this.step() - 1) as WizardStep);
  }

  private async runParse(file: File, mappingProfile: Omit<MappingProfile, 'id'>): Promise<void> {
    const token = ++this.parseToken;
    this.parsing.set(true);
    try {
      const response = await this.csvImportService.parse(file, mappingProfile);
      if (token !== this.parseToken) return;
      if ('error' in response) {
        this.parseError.set(response.error);
        this.parsedRows.set([]);
        this.parseWarnings.set([]);
        return;
      }
      this.parsedRows.set(response.rows);
      this.parseError.set(null);
      this.parseWarnings.set(response.warnings);
    } finally {
      if (token === this.parseToken) this.parsing.set(false);
    }
  }

  private async runCommit(): Promise<void> {
    const accountId = this.currentAccountId();
    const file = this.currentFile();
    const mapResult = this.mapResult();
    if (accountId === null || !file || !mapResult) return;

    this.committing.set(true);
    try {
      // Only persist the mapping when the user asked to remember it (defaultAccountId is set), and
      // upsert so repeated imports for the same bank+account don't leave near-duplicate rows (CR-1.6).
      const profile = mapResult.mappingProfile;
      const savedProfile =
        profile.defaultAccountId != null
          ? await this.mappingProfilesStore.upsertForBankAndAccount(profile)
          : undefined;
      const validRows = this.parsedRows().filter((row): row is ValidParsedRow => row.valid);

      const result = await this.importBatchesStore.commitImport({
        accountId,
        fileName: file.name,
        mappingProfileId: savedProfile?.id,
        totalRowsRead: this.parsedRows().length,
        validRows,
      });

      this.commitResults.update((results) => [...results, result]);

      const nextIndex = this.currentFileIndex() + 1;
      if (nextIndex < this.queue().length) {
        this.currentFileIndex.set(nextIndex);
        this.mapResult.set(null);
        this.parsedRows.set([]);
        this.parseError.set(null);
        this.parseWarnings.set([]);
        this.step.set(2);
      } else {
        this.step.set(3);
      }
    } finally {
      this.committing.set(false);
    }
  }

  protected async onUndo(result: CommitImportResult): Promise<void> {
    await this.importBatchesStore.undoImport(result.batch);
    this.commitResults.update((results) => results.filter((r) => r !== result));
  }

  protected startNewImport(): void {
    this.step.set(1);
    this.queue.set([]);
    this.currentFileIndex.set(0);
    this.mapResult.set(null);
    this.parsedRows.set([]);
    this.parseError.set(null);
    this.parseWarnings.set([]);
    this.commitResults.set([]);
  }
}
