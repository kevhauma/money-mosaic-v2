import { computed, inject, Injectable, signal } from '@angular/core';
// Deep import, not the `@/core/ml` barrel: this service is injected by the always-eager app shell,
// and the barrel pulls `rule-proposal-mining` and through it `@/core/categorisation` into that
// chunk for the sake of one pure function.
import { taxonomySignature } from '@/core/ml/model-config';
import {
  CategoryModelRepository,
  DataManagementRepository,
  type AppDataExport,
  type Category,
  type CategoryModelArtifact,
  type ImportMode,
  type LocalMigrationReport,
  type LocalMigrationState,
} from '@/core/data-access';
import { StoreResetService } from '@/core/store-reset';
import { LocalDatabaseGateway } from './local-database.gateway';
import type { LocalDatabaseSummary } from './local-database';
import {
  clearLocalMigrationChoice,
  readLocalMigrationChoice,
  writeLocalMigrationChoice,
} from './migration-choice';

/**
 * The one-time move of a browser database into the signed-in account (TICKET-SRV-07).
 *
 * A plain service rather than a store: it hydrates nothing, owns no entity, and its state is one
 * conversation's worth of steps. Everything durable about it lives either in `localStorage` (the
 * user's answer, per browser per account — `migration-choice.ts`) or on the server (the rows
 * themselves).
 *
 * **What it is careful about**, in the order it matters:
 * - It never prompts for a database that is absent or holds nothing.
 * - It never guesses when the account already has data: the offer becomes merge-or-replace with no
 *   default, and replace has to be confirmed by name.
 * - The move itself is one server transaction, so a failure part-way leaves the account exactly as
 *   it was and `retry()` is simply the same call again. Nothing here is "resumable" in the sense of
 *   continuing from halfway, because halfway is a state the server never leaves behind.
 * - The browser database is **never** touched until the user says so, and only after a success.
 */

/** Where in the conversation we are. `idle` is also "there is nothing to offer". */
export type LocalMigrationStatus = 'idle' | 'offered' | 'running' | 'done' | 'failed';

/**
 * The trained model is uploaded as a second request, after the tables. It cannot ride the same
 * transaction — it is bytes, on a different endpoint — so its outcome is reported separately: the
 * weights are derived from the transactions that *did* land, so the recovery is one retraining
 * rather than any lost data.
 */
export type ModelTransferOutcome = 'none' | 'moved' | 'failed';

const MIGRATION_FAILED =
  'Could not move this browser’s data into your account. Nothing was changed.';

/**
 * The trained model's taxonomy signature, rebuilt over the ids the server just assigned.
 *
 * It is the exact string `CategoryModelStore` compares against the account's live taxonomy, so it
 * has to be produced by the same function over the same set — the **active** (non-archived)
 * categories, which is what `CategoriesStore.activeCategories` means.
 */
const migratedTaxonomySignature = (
  data: AppDataExport,
  categoryIds: Record<number, number>,
): string => {
  const rows = (data.tables['categories'] ?? []) as Category[];

  return taxonomySignature(
    rows
      .filter((category) => category.archived !== true && category.id !== undefined)
      .flatMap((category) => {
        const id = categoryIds[category.id!];
        return id === undefined ? [] : [{ id, name: category.name }];
      }),
  );
};

@Injectable({ providedIn: 'root' })
export class LocalMigrationService {
  private readonly gateway = inject(LocalDatabaseGateway);
  private readonly dataManagement = inject(DataManagementRepository);
  private readonly categoryModel = inject(CategoryModelRepository);
  private readonly storeReset = inject(StoreResetService);

  constructor() {
    // Registered for the sign-out wipe like a store, because it holds exactly what a store holds:
    // whose offer this is, whether they deferred it, what their browser database contains and what
    // their last migration reported. It is `providedIn: 'root'` and never torn down, so without
    // this, user A declining the offer would silence it for user B on the same browser — and B's
    // Data page would show A's completed report. The registry's source-level gate only reads
    // `*.store.ts`, so a plain service has to remember for itself.
    //
    // `hydrate` is a no-op: the next sign-in calls `offerIfNeeded`, which does the reading.
    this.storeReset.register(
      'LocalMigrationService',
      () => this.resetForNextUser(),
      () => Promise.resolve(),
    );
  }

  /** Everything that belongs to the signed-in user, back to how it starts. */
  private resetForNextUser(): void {
    this.userId = null;
    this.deferred = false;
    this.offeredFor = null;
    this.statusSignal.set('idle');
    this.summarySignal.set(null);
    this.accountSignal.set(null);
    this.reportSignal.set(null);
    this.modelSignal.set('none');
    this.errorSignal.set(null);
    this.localCopySignal.set(true);
    this.alreadyMovedSignal.set(false);
    this.availableSignal.set(false);
  }

  private readonly statusSignal = signal<LocalMigrationStatus>('idle');
  private readonly summarySignal = signal<LocalDatabaseSummary | null>(null);
  private readonly accountSignal = signal<LocalMigrationState | null>(null);
  private readonly reportSignal = signal<LocalMigrationReport | null>(null);
  private readonly modelSignal = signal<ModelTransferOutcome>('none');
  private readonly errorSignal = signal<string | null>(null);
  private readonly localCopySignal = signal(true);
  private readonly alreadyMovedSignal = signal(false);
  private readonly availableSignal = signal(false);

  /** Who the offer is for. Null until a session has been seen, which is also "do not prompt". */
  private userId: number | null = null;
  /** "Remind me later", which lasts exactly as long as this tab's session (see `migration-choice.ts`). */
  private deferred = false;
  /**
   * The user `offerIfNeeded` has already been asked about, so the shell's effect can fire again —
   * which it does whenever the session user object is replaced, as a rename or a password change
   * does — without re-opening a dialog that was answered a moment ago.
   */
  private offeredFor: number | null = null;

  readonly status = this.statusSignal.asReadonly();
  readonly summary = this.summarySignal.asReadonly();
  /** What the account already holds — `null` until the offer has been prepared. */
  readonly account = this.accountSignal.asReadonly();
  readonly report = this.reportSignal.asReadonly();
  readonly modelOutcome = this.modelSignal.asReadonly();
  readonly error = this.errorSignal.asReadonly();
  /** Whether the browser database is still on disk after a successful move. */
  readonly localCopyPresent = this.localCopySignal.asReadonly();

  /**
   * Whether this browser's database has already been moved into *this* account.
   *
   * Read by the dialog so a second visit says so rather than offering the same move again: the
   * browser copy is only deleted if the user asks, so the entry point outlives the migration, and
   * accepting twice would merge a complete second copy of everything beside the first.
   */
  readonly alreadyMoved = this.alreadyMovedSignal.asReadonly();

  /** Whether the dialog should be on screen at all. */
  readonly open = computed(() => this.statusSignal() !== 'idle');

  /**
   * Whether this browser still has a database that could be moved — what the Data section's card
   * keys off, so the entry point only exists for someone it applies to.
   */
  readonly available = this.availableSignal.asReadonly();

  /**
   * Called once per sign-in, from the app shell. Silent unless there is genuinely something to
   * offer: no database, an empty one, or an answer already given, and nothing is shown.
   */
  async offerIfNeeded(userId: number): Promise<void> {
    if (this.offeredFor === userId) return;
    this.offeredFor = userId;
    this.userId = userId;
    const summary = await this.gateway.summary().catch(() => null);
    this.summarySignal.set(summary);
    this.availableSignal.set(summary !== null);
    this.alreadyMovedSignal.set(readLocalMigrationChoice(userId) === 'done');

    if (summary === null) return;
    if (this.deferred || readLocalMigrationChoice(userId) !== null) return;

    await this.present();
  }

  /**
   * Re-opens the offer from the Data section — the "it can be run again after it was declined" half
   * of the ticket.
   *
   * Forgets a stored `never`, since asking for it now is a clearer signal than the answer given
   * months ago. Deliberately **keeps** a stored `done`: the browser copy is not deleted unless the
   * user asks, so this entry point stays visible after a successful move, and clearing `done` there
   * would turn one more click into a second complete copy of every account, transaction and rule —
   * merged in beside the first, with nothing server-side to refuse it. The dialog reads the same
   * flag and says so instead.
   */
  async offerAgain(): Promise<void> {
    if (this.userId !== null && readLocalMigrationChoice(this.userId) === 'never')
      clearLocalMigrationChoice(this.userId);
    this.deferred = false;
    this.alreadyMovedSignal.set(
      this.userId !== null && readLocalMigrationChoice(this.userId) === 'done',
    );

    const summary = await this.gateway.summary().catch(() => null);
    this.summarySignal.set(summary);
    this.availableSignal.set(summary !== null);
    if (summary === null) return;

    await this.present();
  }

  /** Puts the offer on screen, with what the account already holds beside it. */
  private async present(): Promise<void> {
    this.reportSignal.set(null);
    this.errorSignal.set(null);
    this.modelSignal.set('none');
    this.localCopySignal.set(true);
    this.accountSignal.set(await this.dataManagement.localMigrationState().catch(() => null));
    this.statusSignal.set('offered');
  }

  /** "Remind me later" — gone for this session, back on the next sign-in. */
  remindLater(): void {
    this.deferred = true;
    this.statusSignal.set('idle');
  }

  /** "Never ask again on this browser" — remembered per account, and survives a reload. */
  neverAskAgain(): void {
    if (this.userId !== null) writeLocalMigrationChoice(this.userId, 'never');
    this.statusSignal.set('idle');
  }

  /** Closes the dialog without answering anything — after a completed move, or from the X. */
  dismiss(): void {
    this.statusSignal.set('idle');
  }

  /**
   * Moves it. The tables land in one server transaction; the trained model follows as a second
   * request whose failure is reported but does not undo anything.
   */
  async migrate(mode: ImportMode): Promise<void> {
    this.statusSignal.set('running');
    this.errorSignal.set(null);

    try {
      const { data, model } = await this.gateway.read();
      const report = await this.dataManagement.migrateLocalDatabase(data, mode);

      // Recorded the moment the server confirms, and before anything else that could throw: from
      // here on the rows exist, so the one outcome this must never reach is the `failed` branch —
      // whose copy says "nothing was changed" and whose button offers to run it again, which would
      // import a second complete copy of the database.
      if (this.userId !== null) writeLocalMigrationChoice(this.userId, 'done');
      this.reportSignal.set(report);
      this.modelSignal.set(await this.moveModel(model, data, report.categoryIds));
      this.statusSignal.set('done');
    } catch (error) {
      this.errorSignal.set(error instanceof Error ? error.message : MIGRATION_FAILED);
      this.statusSignal.set('failed');
      return;
    }

    // Outside the `try`, for the same reason: the data has landed, and a re-read failing is a
    // stale screen, not a failed migration. The stores were hydrated from an account that was
    // empty a moment ago.
    await this.storeReset.rehydrateAll();
  }

  /**
   * Uploads the trained model with its class index rewritten to the ids the server just assigned.
   *
   * **Two fields carry category ids, and both have to be rewritten.**
   *
   * `categoryIdByIndex` *is* the model's output layer: position `i` of that array is the category
   * the `i`th output neuron predicts. Leaving the local ids in place would give every prediction to
   * whichever category now happens to hold that number — a model that looks trained and is wrong.
   * A class whose category did not survive the move is dropped to `-1`, which matches no category
   * and so is simply never suggested.
   *
   * `taxonomySignature` is `id:name` pairs over the active categories at training time, and it is
   * what flips a model from `ready` to `stale` (ML-07). Every one of those ids has just changed, so
   * an untouched signature would mark every migrated model stale on arrival — a retraining prompt
   * for a model that is perfectly good. Recomputed here from the categories that **were** migrated,
   * not from the account's taxonomy afterwards: if the account already had categories of its own,
   * the model genuinely does not describe the taxonomy any more, and it should say so.
   *
   * The weights themselves are handed over untouched, which is the whole of "the same predictions
   * after the move as before" once the two id-bearing fields above are right.
   */
  private async moveModel(
    model: CategoryModelArtifact | undefined,
    data: AppDataExport,
    categoryIds: Record<number, number>,
  ): Promise<ModelTransferOutcome> {
    if (model === undefined) return 'none';

    try {
      await this.categoryModel.save({
        ...model,
        categoryIdByIndex: model.categoryIdByIndex.map((id) => categoryIds[id] ?? -1),
        taxonomySignature: migratedTaxonomySignature(data, categoryIds),
      });
      return 'moved';
    } catch {
      // Deliberately swallowed: the weights are derived from transactions that have already landed,
      // so the cost is one retraining from the Learning page, and failing the whole move over it
      // would throw away the part that worked.
      return 'failed';
    }
  }

  /**
   * Deletes the browser database, once the user has said so and the move has succeeded. Declining
   * simply leaves it — it is a free backup, and the dialog says as much.
   */
  async deleteLocalCopy(): Promise<void> {
    await this.gateway.remove();
    this.localCopySignal.set(false);
    this.availableSignal.set(false);
    this.summarySignal.set(null);
  }
}
