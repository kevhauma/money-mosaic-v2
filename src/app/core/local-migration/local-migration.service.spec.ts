import { TestBed } from '@angular/core/testing';
import {
  CategoryModelRepository,
  DataManagementRepository,
  type AppDataExport,
  type CategoryModelArtifact,
  type LocalMigrationReport,
  type LocalMigrationState,
} from '@/core/data-access';
import { StoreResetService } from '@/core/store-reset';
import type { LocalDatabaseSnapshot, LocalDatabaseSummary } from './local-database';
import { LocalDatabaseGateway } from './local-database.gateway';
import { LocalMigrationService } from './local-migration.service';

/**
 * The conversation around the one-time move (TICKET-SRV-07): when it is offered, what the three
 * answers do, and what a completed or failed move leaves behind.
 *
 * Dexie is replaced by a fake `LocalDatabaseGateway` — which is the reason that class exists — so
 * nothing here depends on a browser database; `local-database.spec.ts` covers the real one.
 */

const SUMMARY: LocalDatabaseSummary = {
  accounts: 2,
  transactions: 400,
  categories: 12,
  earliestBookingDate: '2018-01-01',
  latestBookingDate: '2026-01-01',
  hasTrainedModel: false,
};

const DOCUMENT: AppDataExport = {
  schemaVersion: 16,
  exportedAt: '2026-09-29T00:00:00.000Z',
  tables: {
    accounts: [{ id: 1 }],
    categories: [
      { id: 1, name: 'Groceries', archived: false },
      { id: 2, name: 'Salary', archived: false },
      { id: 3, name: 'Retired', archived: true },
    ],
  },
};

const REPORT: LocalMigrationReport = {
  migrated: { accounts: 2, transactions: 400 },
  reused: { categories: 11 },
  displaced: {},
  skipped: {},
  clearedReferences: 0,
  categoryIds: { 1: 90, 2: 91 },
};

const EMPTY_ACCOUNT: LocalMigrationState = { counts: {}, hasExistingData: false };

const model = (): CategoryModelArtifact => ({
  id: 1,
  modelTopology: new Uint8Array([1]).buffer,
  weightSpecs: new Uint8Array([2]).buffer,
  weightData: new Uint8Array([3]).buffer,
  categoryIdByIndex: [1, 2, 7],
  featureConfig: { dim: 8, charNgramMin: 3, charNgramMax: 5 },
  taxonomySignature: 'sig',
  metrics: { accuracy: 0.9, trainedSampleCount: 10 },
  trainedAt: '2026-01-01T00:00:00.000Z',
  schemaVersion: 1,
});

type Fakes = {
  summary: LocalDatabaseSummary | null;
  snapshot: LocalDatabaseSnapshot;
  state: LocalMigrationState;
  migrate: (data: AppDataExport, mode: string) => Promise<LocalMigrationReport>;
  saveModel: (artifact: CategoryModelArtifact) => Promise<1>;
  removed: boolean;
  saved: CategoryModelArtifact | null;
  migrateCalls: { mode: string }[];
  /** The sign-out reset the service hands the registry, captured so a spec can fire it. */
  resetForWipe: (() => void) | null;
};

const setup = (
  overrides: Partial<Fakes> = {},
): { service: LocalMigrationService; fakes: Fakes } => {
  const fakes: Fakes = {
    summary: SUMMARY,
    snapshot: { data: DOCUMENT, model: undefined },
    state: EMPTY_ACCOUNT,
    migrate: () => Promise.resolve(REPORT),
    saveModel: () => Promise.resolve(1),
    removed: false,
    saved: null,
    migrateCalls: [],
    resetForWipe: null,
    ...overrides,
  };

  TestBed.configureTestingModule({
    providers: [
      {
        provide: LocalDatabaseGateway,
        useValue: {
          summary: () => Promise.resolve(fakes.summary),
          read: () => Promise.resolve(fakes.snapshot),
          remove: () => {
            fakes.removed = true;
            return Promise.resolve();
          },
        },
      },
      {
        provide: DataManagementRepository,
        useValue: {
          localMigrationState: () => Promise.resolve(fakes.state),
          migrateLocalDatabase: (data: AppDataExport, mode: string) => {
            fakes.migrateCalls.push({ mode });
            return fakes.migrate(data, mode);
          },
        },
      },
      {
        provide: CategoryModelRepository,
        useValue: {
          save: (artifact: CategoryModelArtifact) => {
            fakes.saved = artifact;
            return fakes.saveModel(artifact);
          },
        },
      },
      {
        provide: StoreResetService,
        useValue: {
          rehydrateAll: () => Promise.resolve(),
          // Captured so a spec can fire the sign-out wipe the way the real registry would.
          register: (_name: string, reset: () => void) => {
            fakes.resetForWipe = reset;
          },
        },
      },
    ],
  });

  return { service: TestBed.inject(LocalMigrationService), fakes };
};

describe('LocalMigrationService: when it offers', () => {
  beforeEach(() => localStorage.clear());

  it('offers nothing when this browser has no database worth moving', async () => {
    const { service } = setup({ summary: null });

    await service.offerIfNeeded(1);

    expect(service.status()).toBe('idle');
    expect(service.available()).toBe(false);
  });

  it('offers once there is a database, with the counts read from it', async () => {
    const { service } = setup();

    await service.offerIfNeeded(1);

    expect(service.status()).toBe('offered');
    expect(service.summary()?.transactions).toBe(400);
    expect(service.account()).toEqual(EMPTY_ACCOUNT);
  });

  it('does not offer twice for the same account, however often the shell asks', async () => {
    const { service } = setup();

    await service.offerIfNeeded(1);
    service.remindLater();
    await service.offerIfNeeded(1);

    expect(service.status()).toBe('idle');
  });
});

describe('LocalMigrationService: the three answers', () => {
  beforeEach(() => localStorage.clear());

  it('"remind me later" closes it without remembering anything', async () => {
    const { service } = setup();
    await service.offerIfNeeded(1);

    service.remindLater();

    expect(service.status()).toBe('idle');
    expect(localStorage.getItem('mm-local-migration:1')).toBeNull();
  });

  it('"never ask again" is written down, and survives into the next session', async () => {
    const { service } = setup();
    await service.offerIfNeeded(1);

    service.neverAskAgain();
    expect(localStorage.getItem('mm-local-migration:1')).toBe('never');

    // A second session — a fresh service, the same browser, the same account.
    TestBed.resetTestingModule();
    const next = setup().service;
    await next.offerIfNeeded(1);

    expect(next.status()).toBe('idle');
    // Still reachable from the Data section, which is the whole point of the card there.
    expect(next.available()).toBe(true);
  });

  it('"move it now" uploads the database and reports what landed', async () => {
    const { service, fakes } = setup();
    await service.offerIfNeeded(1);

    await service.migrate('merge');

    expect(fakes.migrateCalls).toEqual([{ mode: 'merge' }]);
    expect(service.status()).toBe('done');
    expect(service.report()).toEqual(REPORT);
    expect(localStorage.getItem('mm-local-migration:1')).toBe('done');
  });
});

describe('LocalMigrationService: the trained model', () => {
  beforeEach(() => localStorage.clear());

  /**
   * The model's `categoryIdByIndex` *is* its output layer — position `i` is the category the `i`th
   * neuron predicts. Uploading it with the local ids would hand every prediction to whichever
   * category now holds that number, which is the one way this migration could leave something that
   * looks right and is wrong.
   */
  it('rewrites the model class index to the ids the server assigned', async () => {
    const { service, fakes } = setup({ snapshot: { data: DOCUMENT, model: model() } });
    await service.offerIfNeeded(1);

    await service.migrate('merge');

    expect(fakes.saved?.categoryIdByIndex).toEqual([90, 91, -1]);
    // The weights themselves are handed over untouched, as is everything else that decides a
    // prediction — identical bytes plus an identical feature config is what "the same predictions
    // after the move as before" reduces to, once the class index above is right.
    expect(new Uint8Array(fakes.saved!.weightData)).toEqual(new Uint8Array([3]));
    expect(new Uint8Array(fakes.saved!.modelTopology)).toEqual(new Uint8Array([1]));
    expect(new Uint8Array(fakes.saved!.weightSpecs)).toEqual(new Uint8Array([2]));
    expect(fakes.saved?.featureConfig).toEqual(model().featureConfig);
    expect(fakes.saved?.schemaVersion).toBe(model().schemaVersion);
    expect(service.modelOutcome()).toBe('moved');
  });

  /**
   * `taxonomySignature` is `id:name` pairs, and every one of those ids has just changed — so an
   * untouched signature marks a perfectly good model `stale` the moment it arrives (ML-07), which
   * is a retraining prompt for nothing. The archived category is excluded, because the signature is
   * over *active* categories and that is what it will be compared against.
   */
  it('rebuilds the taxonomy signature over the ids the server assigned', async () => {
    const { service, fakes } = setup({ snapshot: { data: DOCUMENT, model: model() } });
    await service.offerIfNeeded(1);

    await service.migrate('merge');

    expect(fakes.saved?.taxonomySignature).toBe('90:Groceries|91:Salary');
  });

  it('reports a failed model upload without undoing the move', async () => {
    const { service } = setup({
      snapshot: { data: DOCUMENT, model: model() },
      saveModel: () => Promise.reject(new Error('too big')),
    });
    await service.offerIfNeeded(1);

    await service.migrate('merge');

    expect(service.status()).toBe('done');
    expect(service.modelOutcome()).toBe('failed');
  });
});

describe('LocalMigrationService: failure and the browser copy', () => {
  beforeEach(() => localStorage.clear());

  it('keeps the server’s own wording and records no answer when the move fails', async () => {
    const { service } = setup({
      migrate: () => Promise.reject(new Error('Nothing was imported.')),
    });
    await service.offerIfNeeded(1);

    await service.migrate('replace');

    expect(service.status()).toBe('failed');
    expect(service.error()).toBe('Nothing was imported.');
    // Nothing remembered, so the offer comes back rather than being marked done.
    expect(localStorage.getItem('mm-local-migration:1')).toBeNull();
  });

  it('can be run again from the Data section after being declined', async () => {
    const { service } = setup();
    await service.offerIfNeeded(1);
    service.neverAskAgain();

    await service.offerAgain();

    expect(service.status()).toBe('offered');
    expect(localStorage.getItem('mm-local-migration:1')).toBeNull();
  });

  it('leaves the browser database alone unless asked to delete it', async () => {
    const { service, fakes } = setup();
    await service.offerIfNeeded(1);
    await service.migrate('merge');

    expect(fakes.removed).toBe(false);
    expect(service.localCopyPresent()).toBe(true);
  });

  it('deletes it on request, and stops offering afterwards', async () => {
    const { service, fakes } = setup();
    await service.offerIfNeeded(1);
    await service.migrate('merge');

    await service.deleteLocalCopy();

    expect(fakes.removed).toBe(true);
    expect(service.localCopyPresent()).toBe(false);
    expect(service.available()).toBe(false);
  });
});

describe('LocalMigrationService: not moving the same browser in twice', () => {
  beforeEach(() => localStorage.clear());

  it('remembers a completed move when the offer is re-opened from the Data section', async () => {
    const { service } = setup();
    await service.offerIfNeeded(7);
    await service.migrate('merge');

    // The browser copy is only deleted if the user asks, so the Data card outlives the migration.
    // Re-opening must not forget that this database already went into this account: accepting again
    // merges a complete second copy of every account, transaction and rule, and nothing on the
    // server refuses it.
    await service.offerAgain();

    expect(service.alreadyMoved()).toBe(true);
  });

  it('still forgets a "never", which is what re-opening the offer is for', async () => {
    const { service } = setup();
    await service.offerIfNeeded(7);
    service.neverAskAgain();

    await service.offerAgain();

    expect(service.alreadyMoved()).toBe(false);
    expect(service.status()).toBe('offered');
  });

  it('records the move before anything that could fail after it', async () => {
    // The model upload runs after the tables have landed. If a failure there reached the `failed`
    // branch — whose copy says nothing was changed and whose button offers to retry — the retry
    // would import the whole database a second time.
    const { service } = setup({
      snapshot: { data: DOCUMENT, model: model() },
      saveModel: () => Promise.reject(new Error('model upload failed')),
    });
    await service.offerIfNeeded(7);

    await service.migrate('merge');

    expect(service.status()).toBe('done');
    await service.offerAgain();
    expect(service.alreadyMoved()).toBe(true);
  });

  it('forgets the previous user entirely when the session is wiped', async () => {
    const { service, fakes } = setup();
    await service.offerIfNeeded(7);
    service.remindLater();

    // What sign-out does. Without it, user A's "remind me later" would silence the offer for user B
    // on the same browser, and B's Data page would show A's report.
    fakes.resetForWipe?.();
    await service.offerIfNeeded(8);

    expect(service.status()).toBe('offered');
    expect(service.report()).toBeNull();
  });
});
