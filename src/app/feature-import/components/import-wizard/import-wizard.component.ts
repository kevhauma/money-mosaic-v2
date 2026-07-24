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
import { ICON_BY_ACCOUNT_TYPE } from '@/feature-accounts';
import {
  AlertComponent,
  ButtonComponent,
  FlexComponent,
  LabelComponent,
  PaperComponent,
  TypographyComponent,
} from '@/shared/ui';
import { MappingProfilesStore } from '../../mapping-profiles.store';
import { ImportBatchesStore } from '../../import-batches.store';
import {
  ImportSelectStepComponent,
  type PendingAccountDraft,
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

// Never a real Dexie id (autoIncrement starts at 1) — passed to the map step for a file whose
// account is still a pending draft, so step 2 renders without a persisted account yet (TICKET-IMP-08).
const PENDING_ACCOUNT_PLACEHOLDER_ID = -1;

const today = (): string => new Date().toISOString().slice(0, 10);

/**
 * A new account's opening balance seeds from the chronologically-first parsed row that carries a
 * running-balance value (TICKET-IMP-08) — `undefined` for any row means that file's mapping didn't
 * include a balance column, or that particular row's balance cell was blank/unparseable.
 */
type OpeningBalanceSeed = { amount: number; date: string };

const earliestBalanceSeed = (rows: ValidParsedRow[]): OpeningBalanceSeed | null => {
  let earliest: ValidParsedRow | null = null;
  for (const row of rows) {
    if (row.balance === undefined) continue;
    if (!earliest || row.transaction.bookingDate < earliest.transaction.bookingDate) {
      earliest = row;
    }
  }
  return earliest ? { amount: earliest.balance!, date: earliest.transaction.bookingDate } : null;
};

@Component({
  selector: 'app-import-wizard',
  imports: [
    ImportSelectStepComponent,
    ImportMapStepComponent,
    ImportPreviewStepComponent,
    ImportSummaryStepComponent,
    ButtonComponent,
    AlertComponent,
    FlexComponent,
    LabelComponent,
    PaperComponent,
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
  /** Not-yet-persisted accounts created inline from step 1 (TICKET-IMP-08); resolved into real accounts at commit time. */
  protected readonly pendingDrafts = signal<PendingAccountDraft[]>([]);
  protected readonly currentFileIndex = signal(0);
  protected readonly mapResult = signal<ImportMappingResult | null>(null);
  protected readonly commitResults = signal<CommitImportResult[]>([]);

  protected readonly committing = signal(false);
  /** Set when resolving/persisting a pending account draft fails mid-commit (TICKET-IMP-08) — that file (and anything linked to the same draft) does not proceed. */
  protected readonly accountCreationError = signal<string | null>(null);

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
  /**
   * The current file's account for step 2's map form — a real id, or the placeholder id while its
   * account is still a pending draft (TICKET-IMP-08; the real id only exists once `resolveAccountId`
   * creates it at commit time, so step 2 can't look up a saved mapping profile for it yet).
   */
  protected readonly currentAccountId = computed<number | null>(() => {
    const row = this.queue()[this.currentFileIndex()];
    if (!row) return null;
    if (row.accountId !== null) return row.accountId;
    return row.pendingDraftId ? PENDING_ACCOUNT_PLACEHOLDER_ID : null;
  });

  protected readonly canAdvanceFromStep1 = computed(() => {
    const queue = this.queue();
    if (queue.length === 0) return false;
    const drafts = this.pendingDrafts();
    return queue.every((row) => {
      if (row.accountId !== null) return true;
      if (!row.pendingDraftId) return false;
      const draft = drafts.find((d) => d.id === row.pendingDraftId);
      return !!draft && draft.name.trim().length > 0;
    });
  });

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

  /**
   * Persists a queued file's pending account draft the first time any file linked to it is
   * committed — the owner and every file linked to the same draft all resolve to that one real
   * `Account.id` from then on (TICKET-IMP-08). A no-op returning the existing id for a file that
   * already has a real account.
   */
  private async resolveAccountId(
    row: QueuedImportFile,
    openingBalanceSeed: OpeningBalanceSeed | null,
  ): Promise<number | null> {
    if (row.accountId !== null) return row.accountId;
    if (!row.pendingDraftId) return null;

    const draft = this.pendingDrafts().find((d) => d.id === row.pendingDraftId);
    if (!draft) return null;

    const created = await this.accountsStore.addAccount({
      name: draft.name,
      type: draft.type,
      iban: draft.iban || undefined,
      currency: 'EUR',
      openingBalance: openingBalanceSeed?.amount ?? 0,
      openingBalanceDate: openingBalanceSeed?.date ?? today(),
      color: '#7F77DD',
      icon: ICON_BY_ACCOUNT_TYPE[draft.type],
      archived: false,
    });

    this.queue.update((rows) =>
      rows.map((r) =>
        r.pendingDraftId === draft.id ? { ...r, accountId: created.id!, pendingDraftId: null } : r,
      ),
    );
    this.pendingDrafts.update((drafts) => drafts.filter((d) => d.id !== draft.id));

    return created.id!;
  }

  private async runCommit(): Promise<void> {
    const queuedRow = this.queue()[this.currentFileIndex()];
    const file = this.currentFile();
    const mapResult = this.mapResult();
    if (!queuedRow || !file || !mapResult) return;

    this.accountCreationError.set(null);
    const validRows = this.parsedRows().filter((row): row is ValidParsedRow => row.valid);

    let accountId: number | null;
    try {
      accountId = await this.resolveAccountId(queuedRow, earliestBalanceSeed(validRows));
    } catch {
      this.accountCreationError.set(
        `Couldn't create the new account for ${file.name} — nothing was imported for it.`,
      );
      return;
    }
    if (accountId === null) return;

    this.committing.set(true);
    try {
      // Only persist the mapping when the user asked to remember it (defaultAccountId is set), and
      // upsert so repeated imports for the same bank+account don't leave near-duplicate rows (CR-1.6).
      // A file whose account was still a pending draft up to this point mapped under the placeholder
      // id (TICKET-IMP-08) — rewrite it to the just-resolved real id before saving.
      const profile =
        mapResult.mappingProfile.defaultAccountId != null
          ? { ...mapResult.mappingProfile, defaultAccountId: accountId }
          : mapResult.mappingProfile;
      const savedProfile =
        profile.defaultAccountId != null
          ? await this.mappingProfilesStore.upsertForBankAndAccount(profile)
          : undefined;

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
    this.pendingDrafts.set([]);
    this.currentFileIndex.set(0);
    this.mapResult.set(null);
    this.commitResults.set([]);
    this.batchMapping.set(null);
    this.manualOverrideActive.set(false);
    this.applyToRemaining.set(false);
    this.accountCreationError.set(null);
  }
}
