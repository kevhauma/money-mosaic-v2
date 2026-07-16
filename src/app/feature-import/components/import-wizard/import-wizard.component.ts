import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { from, of, startWith, switchMap, timer, map as rxMap, type Observable } from 'rxjs';
import { AccountsStore } from '@/core/state';
import { CsvImportService, type CommitImportResult, type ParsedRowResult } from '@/core/import';
import type { MappingProfile } from '@/core/data-access';
import { AlertComponent, ButtonComponent, TypographyComponent } from '@/shared/ui';
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
  | { status: 'header-mismatch'; missingColumns: string[] }
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
    TypographyComponent,
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

  // Batch mapping (TICKET-IMP-02): once a mapping is applied to "the rest of the batch",
  // `batchMapping` holds the shared column mapping and every later file's `mapResult` is derived
  // from it instead of going through the manual map form. `manualOverrideActive` opts a single
  // file back into the manual form — the hand-off point for a file whose headers don't match the
  // shared mapping (TICKET-IMP-03's header-mismatch check surfaces that exact case).
  protected readonly batchMapping = signal<Omit<MappingProfile, 'id'> | null>(null);
  protected readonly manualOverrideActive = signal(false);
  protected readonly applyToRemaining = signal(false);

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

  protected readonly showManualMapStep = computed(
    () => !this.batchMapping() || this.manualOverrideActive(),
  );
  protected readonly remainingFilesCount = computed(
    () => this.totalFiles() - this.currentFileIndex() - 1,
  );
  protected readonly canOfferApplyToRemaining = computed(
    () =>
      this.remainingFilesCount() > 0 &&
      !!this.mapResult() &&
      !this.parseError() &&
      !this.headerMismatchMessage(),
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
          rxMap((response): ParseState => {
            if ('error' in response) return { status: 'error', error: response.error };
            if ('headerMismatch' in response) {
              return { status: 'header-mismatch', missingColumns: response.missingColumns };
            }
            return { status: 'done', rows: response.rows, warnings: response.warnings };
          }),
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
  // Structural mismatch between the mapping and this file's headers (e.g. wrong bank preset
  // applied) — kept distinct from `parseError` (a hard parse failure) so the message can name the
  // file and the missing column(s), per TICKET-IMP-03.
  protected readonly headerMismatchMessage = computed(() => {
    const state = this.parseState();
    if (state.status !== 'header-mismatch') return null;
    const fileName = this.currentFile()?.name ?? 'this file';
    const columns = state.missingColumns.map((column) => `"${column}"`).join(', ');
    const noun = state.missingColumns.length === 1 ? 'column' : 'columns';
    return `Expected ${noun} ${columns} not found in ${fileName}.`;
  });
  protected readonly parseWarnings = computed(() => {
    const state = this.parseState();
    return state.status === 'done' ? state.warnings : [];
  });

  // Tracks which file index has already been auto-committed, so the effect below doesn't re-fire
  // and double-commit when an unrelated dependency (e.g. `committing`) changes while parseState is
  // still 'done' for the same file. A plain field, not a signal — writing it isn't meant to be
  // reactive, only to guard re-entrancy (mirrors `detectedFile` in ImportMapStepComponent).
  private autoCommittedFileIndex: number | null = null;

  constructor() {
    // Batch auto-advance (TICKET-IMP-02): once a shared mapping is applied, a file that parses
    // cleanly under it commits itself — no click needed. Only a header mismatch or a hard parse
    // error (or a manual override, which drops back to the reviewed manual-map flow) pauses this
    // and waits for the user; a clean parse with malformed rows still auto-commits (FR-IMP-8 already
    // lets valid rows proceed when some rows are bad).
    effect(() => {
      const state = this.parseState();
      const index = this.currentFileIndex();
      const batchActive =
        this.step() === 2 && !!this.batchMapping() && !this.manualOverrideActive();
      if (!batchActive || this.committing() || this.autoCommittedFileIndex === index) return;
      if (state.status === 'done' && state.rows.some((row) => row.valid)) {
        this.autoCommittedFileIndex = index;
        void this.runCommit();
      }
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

      if (this.applyToRemaining()) {
        // Column mapping only — strip the account/bank-detection metadata (`defaultAccountId`,
        // `headerSignature`) so applying it to later files doesn't upsert a saved profile for
        // whatever account those files happen to be linked to.
        this.batchMapping.set({
          name: profile.name,
          bankPreset: profile.bankPreset,
          delimiter: profile.delimiter,
          decimalSeparator: profile.decimalSeparator,
          dateFormat: profile.dateFormat,
          encoding: profile.encoding,
          headerRows: profile.headerRows,
          signConvention: profile.signConvention,
          columns: profile.columns,
        });
      }

      const nextIndex = this.currentFileIndex() + 1;
      if (nextIndex < this.queue().length) {
        this.currentFileIndex.set(nextIndex);
        this.manualOverrideActive.set(false);
        this.applyToRemaining.set(false);
        const batch = this.batchMapping();
        this.mapResult.set(batch ? { mappingProfile: batch } : null);
      } else {
        this.step.set(3);
      }
    } finally {
      this.committing.set(false);
    }
  }

  protected mapFileIndividually(): void {
    this.manualOverrideActive.set(true);
    this.mapResult.set(null);
  }

  protected onApplyToRemainingChange(event: Event): void {
    this.applyToRemaining.set((event.target as HTMLInputElement).checked);
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
    this.batchMapping.set(null);
    this.manualOverrideActive.set(false);
    this.applyToRemaining.set(false);
  }
}
