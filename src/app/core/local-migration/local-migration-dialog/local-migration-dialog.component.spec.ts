import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  CategoryModelRepository,
  DataManagementRepository,
  type AppDataExport,
  type LocalMigrationReport,
  type LocalMigrationState,
} from '@/core/data-access';
import { StoreResetService } from '@/core/store-reset';
import type { LocalDatabaseSummary } from '../local-database';
import { LocalDatabaseGateway } from '../local-database.gateway';
import { LocalMigrationService } from '../local-migration.service';
import { LocalMigrationDialogComponent } from './local-migration-dialog.component';

/**
 * The offer as the user meets it (TICKET-SRV-07). Driven through the **real** service with a fake
 * gateway and repository behind it, rather than a stubbed service, so what is asserted here is the
 * wiring a user actually gets rather than a second description of it.
 */

const SUMMARY: LocalDatabaseSummary = {
  accounts: 2,
  transactions: 400,
  categories: 12,
  earliestBookingDate: '2018-01-01',
  latestBookingDate: '2026-01-01',
  hasTrainedModel: true,
};

const DOCUMENT: AppDataExport = { schemaVersion: 16, exportedAt: 'x', tables: {} };

const REPORT: LocalMigrationReport = {
  migrated: { accounts: 2, transactions: 400, categories: 0 },
  reused: { categories: 11 },
  displaced: {},
  skipped: { rules: 1 },
  clearedReferences: 3,
  categoryIds: {},
};

const mount = async (
  state: LocalMigrationState,
): Promise<{ fixture: ComponentFixture<LocalMigrationDialogComponent>; text: () => string }> => {
  TestBed.configureTestingModule({
    imports: [LocalMigrationDialogComponent],
    providers: [
      {
        provide: LocalDatabaseGateway,
        useValue: {
          summary: () => Promise.resolve(SUMMARY),
          read: () => Promise.resolve({ data: DOCUMENT, model: undefined }),
          remove: () => Promise.resolve(),
        },
      },
      {
        provide: DataManagementRepository,
        useValue: {
          localMigrationState: () => Promise.resolve(state),
          migrateLocalDatabase: () => Promise.resolve(REPORT),
        },
      },
      { provide: CategoryModelRepository, useValue: { save: () => Promise.resolve(1) } },
      {
        provide: StoreResetService,
        // `register` because `LocalMigrationService` enrols itself for the sign-out wipe, the way a
        // store does — without it, one user's declined offer would outlive their session.
        useValue: { rehydrateAll: () => Promise.resolve(), register: () => undefined },
      },
    ],
  });

  const fixture = TestBed.createComponent(LocalMigrationDialogComponent);
  fixture.detectChanges();
  await TestBed.inject(LocalMigrationService).offerIfNeeded(1);
  fixture.detectChanges();

  return {
    fixture,
    text: () => (fixture.nativeElement as HTMLElement).textContent ?? '',
  };
};

const buttonLabelled = (fixture: ComponentFixture<unknown>, label: string): HTMLButtonElement => {
  const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')];
  const found = buttons.find((button) => button.textContent?.includes(label));
  if (found === undefined) throw new Error(`no button labelled "${label}"`);
  return found as HTMLButtonElement;
};

describe('LocalMigrationDialogComponent: the offer', () => {
  beforeEach(() => localStorage.clear());

  it('states the counts read from the browser database, and mentions the trained model', async () => {
    const { text } = await mount({ counts: {}, hasExistingData: false });

    expect(text()).toContain('400 transactions across 2 accounts');
    expect(text()).toContain('2018-01-01 to 2026-01-01');
    expect(text()).toContain('trained auto-categoriser');
  });

  it('offers the move straight away when the account holds nothing of its own', async () => {
    const { fixture, text } = await mount({ counts: {}, hasExistingData: false });

    expect(text()).not.toContain('This account is not empty');
    expect(buttonLabelled(fixture, 'Move it now').disabled).toBe(false);
  });
});

describe('LocalMigrationDialogComponent: an account that already has data', () => {
  beforeEach(() => localStorage.clear());

  const OCCUPIED: LocalMigrationState = {
    counts: { transactions: 12, accounts: 1 },
    hasExistingData: true,
  };

  /** The ticket's "the default is to refuse and explain, not to guess". */
  it('defaults to neither merge nor replace, and will not move until one is chosen', async () => {
    const { fixture, text } = await mount(OCCUPIED);

    expect(text()).toContain('This account is not empty');
    expect(text()).toContain('12 transactions and 1 accounts');
    expect(buttonLabelled(fixture, 'Move it now').disabled).toBe(true);
  });

  it('enables the move once merge is chosen', async () => {
    const { fixture } = await mount(OCCUPIED);

    fixture.componentInstance['setMode']('merge');
    fixture.detectChanges();

    expect(buttonLabelled(fixture, 'Move it now').disabled).toBe(false);
  });

  it('holds replace behind a confirmation that names what it destroys', async () => {
    const { fixture, text } = await mount(OCCUPIED);

    fixture.componentInstance['setMode']('replace');
    fixture.detectChanges();

    expect(text()).toContain('permanently erases the 12 transactions and 1 accounts');
    expect(buttonLabelled(fixture, 'Move it now').disabled).toBe(true);

    fixture.componentInstance['replaceConfirmed'].set(true);
    fixture.detectChanges();

    expect(buttonLabelled(fixture, 'Move it now').disabled).toBe(false);
  });
});

describe('LocalMigrationDialogComponent: after the move', () => {
  beforeEach(() => localStorage.clear());

  it('says what landed, what was matched and what could not be moved', async () => {
    const { fixture, text } = await mount({ counts: {}, hasExistingData: false });

    await TestBed.inject(LocalMigrationService).migrate('merge');
    fixture.detectChanges();

    expect(text()).toContain('400 transactions');
    expect(text()).toContain('11 categories');
    expect(text()).toContain('1 rules could not be moved');
    expect(text()).toContain('3 links were cleared');
    // A table with nothing in it is not listed as "0 categories".
    expect(text()).not.toContain('0 categories');
  });

  it('offers to delete the browser copy, and says the copy is gone once it is', async () => {
    const { fixture, text } = await mount({ counts: {}, hasExistingData: false });
    const service = TestBed.inject(LocalMigrationService);

    await service.migrate('merge');
    fixture.detectChanges();
    expect(text()).toContain('Consider exporting a file');

    await service.deleteLocalCopy();
    fixture.detectChanges();

    expect(text()).toContain('holds the only copy now');
    expect(() => buttonLabelled(fixture, 'Delete the browser copy')).toThrow();
  });
});
