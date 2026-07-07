import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { from, of, startWith, switchMap, timer, map as rxMap, type Observable } from 'rxjs';
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

type ParseInput = { file: File; mappingProfile: Omit<MappingProfile, 'id'> };
type ParseState =
  | { status: 'idle' }
  | { status: 'parsing' }
  | { status: 'error'; error: string }
  | { status: 'done'; rows: ParsedRowResult[]; warnings: string[] };

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
  protected readonly commitResults = signal<CommitImportResult[]>([]);

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

  // Live preview: whenever the mapping is valid, re-parse the current file after a short debounce;
  // while it's invalid (or step 2 isn't active), the pipeline goes idle and step 2 shows a neutral
  // placeholder instead of stale rows. `switchMap` supersedes any in-flight debounce/parse the moment
  // `parseInput` changes again, so a late-resolving worker result from a superseded input is dropped —
  // the worker itself isn't cancellable, but its late message is simply never subscribed to anymore.
  private readonly parseInput = computed<ParseInput | null>(() => {
    const file = this.currentFile();
    const mapResult = this.mapResult();
    if (this.step() !== 2 || !file || !mapResult) return null;
    return { file, mappingProfile: mapResult.mappingProfile };
  });

  private readonly parseState = toSignal(
    toObservable(this.parseInput).pipe(
      switchMap((input): Observable<ParseState> => {
        if (!input) return of<ParseState>({ status: 'idle' });
        return timer(PARSE_DEBOUNCE_MS).pipe(
          switchMap(() => from(this.csvImportService.parse(input.file, input.mappingProfile))),
          rxMap((response): ParseState =>
            'error' in response
              ? { status: 'error', error: response.error }
              : { status: 'done', rows: response.rows, warnings: response.warnings },
          ),
          // The debounce window itself counts as "parsing" so the confirm action stays disabled
          // (a fast click can't commit stale/empty rows) between the mapping turning valid and the
          // worker parse resolving.
          startWith<ParseState>({ status: 'parsing' }),
        );
      }),
    ),
    { initialValue: { status: 'idle' } },
  );

  protected readonly parsing = computed(() => this.parseState().status === 'parsing');
  protected readonly parsedRows = computed<ParsedRowResult[]>(() => {
    const state = this.parseState();
    return state.status === 'done' ? state.rows : [];
  });
  protected readonly parseError = computed(() => {
    const state = this.parseState();
    return state.status === 'error' ? state.error : null;
  });
  protected readonly parseWarnings = computed(() => {
    const state = this.parseState();
    return state.status === 'done' ? state.warnings : [];
  });

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
    this.commitResults.set([]);
  }
}
