import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DataManagementRepository, type AppDataExport } from '@/core/data-access';
import { StoreResetService } from '@/core/store-reset';
import { DataManagementOverviewComponent } from './data-management-overview.component';

type Internals = {
  exporting: () => boolean;
  errorMessage: () => string | null;
  importDialogOpen: () => boolean;
  importMode: { (): 'merge' | 'replace'; set: (value: 'merge' | 'replace') => void };
  importing: () => boolean;
  reloadPromptOpen: () => boolean;
  deleteDialogOpen: { (): boolean; set: (value: boolean) => void };
  deleting: () => boolean;
  exportData: () => Promise<void>;
  onFileSelected: (event: Event) => Promise<void>;
  confirmImport: () => Promise<void>;
  deleteAllConfirmed: () => Promise<void>;
  qrSendOpen: { (): boolean; set: (value: boolean) => void };
  qrReceiveOpen: { (): boolean; set: (value: boolean) => void };
  onQrReceived: (transfer: { data: AppDataExport; omitted: Record<string, string[]> }) => void;
  importNote: () => string | null;
  reloadPage: () => void;
};

const backup: AppDataExport = {
  schemaVersion: 1,
  exportedAt: '2026-07-01T00:00:00.000Z',
  tables: { accounts: [] },
};

const fileSelectEvent = (file: File | null): Event =>
  ({ target: { files: file ? [file] : [], value: '' } }) as unknown as Event;

describe('DataManagementOverviewComponent', () => {
  let fixture: ComponentFixture<DataManagementOverviewComponent>;

  const dataManagementRepository = {
    exportAll: vi.fn().mockResolvedValue(backup),
    importAll: vi.fn().mockResolvedValue(undefined),
    deleteAll: vi.fn().mockResolvedValue(undefined),
  };

  const storeReset = { resetAll: vi.fn(), rehydrateAll: vi.fn().mockResolvedValue(undefined) };

  const setup = async (): Promise<void> => {
    vi.clearAllMocks();
    dataManagementRepository.exportAll.mockResolvedValue(backup);
    dataManagementRepository.importAll.mockResolvedValue(undefined);
    dataManagementRepository.deleteAll.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [DataManagementOverviewComponent],
      providers: [
        { provide: DataManagementRepository, useValue: dataManagementRepository },
        { provide: StoreResetService, useValue: storeReset },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DataManagementOverviewComponent);
    await fixture.whenStable();
  };

  const internals = (): Internals => fixture.componentInstance as unknown as Internals;

  /**
   * The panel this replaced asked the browser for persistent storage and reported whether the
   * database here was safe from eviction (FR-DAT-4). There is no database here to evict since
   * TICKET-SRV-08, so the page says where the data actually is instead — and the wrong half of
   * that is the half that would survive a careless edit, so it is asserted rather than read.
   */
  describe('where the data lives', () => {
    it('says the data is on the server, and claims nothing about this browser', async () => {
      await setup();
      const text = (fixture.nativeElement as HTMLElement).textContent ?? '';

      expect(text).toContain('stored on the Money Mosaic server');
      expect(text).not.toContain('Persistent storage');
      expect(text).not.toMatch(/evict/i);
    });

    /**
     * TICKET-SRV-09 asks for this warning to be unmissable rather than a footnote, and the README
     * carries the same one. It is asserted because what it costs to lose is not cosmetic: the
     * server has no TLS, no CSRF tokens, no rate limiting and no session expiry, so somebody who
     * port-forwards it has published their bank history.
     */
    it('warns, unmissably, that the server must not be exposed to the internet', async () => {
      await setup();
      const host = fixture.nativeElement as HTMLElement;

      // In an alert rather than in body copy — the difference between a warning and a sentence.
      // Matched on the alert's own text rather than on any warning alert in the template, so the
      // import note appearing cannot stand in for this one.
      const warnings = [...host.querySelectorAll('mm-alert[status="warning"]')];
      const exposure = warnings.find((alert) =>
        /must not be exposed to the internet/.test(alert.textContent ?? ''),
      );

      expect(exposure).toBeTruthy();
      expect(exposure?.textContent).toMatch(/no rate limiting/);
    });
  });

  describe('export', () => {
    /**
     * The one thing a backup silently leaves behind (TICKET-DAT-05's closing note): the trained
     * model is three `ArrayBuffer`s and `JSON.stringify` turns each into `{}`. That has always been
     * true; what TICKET-SRV-08 fixes is that the page never said so, and a user restoring a backup
     * found out by noticing the suggestions were gone.
     */
    it('says the trained model is not in the file, rather than dropping it silently', async () => {
      await setup();

      expect((fixture.nativeElement as HTMLElement).textContent).toContain(
        'The trained auto-categoriser is not in the file',
      );
    });

    it('downloads the exported data as a JSON file, no network request involved', async () => {
      await setup();
      const createObjectURL = vi.fn().mockReturnValue('blob:mock');
      const revokeObjectURL = vi.fn();
      vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

      await internals().exportData();

      expect(dataManagementRepository.exportAll).toHaveBeenCalledExactlyOnceWith();
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      const blobArg = createObjectURL.mock.calls[0][0] as Blob;
      expect(blobArg.type).toBe('application/json');
      expect(clickSpy).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock');
      expect(internals().exporting()).toBe(false);

      clickSpy.mockRestore();
      vi.unstubAllGlobals();
    });

    it('surfaces a repository failure as an error message instead of throwing', async () => {
      await setup();
      dataManagementRepository.exportAll.mockRejectedValueOnce(new Error('disk full'));

      await internals().exportData();

      expect(internals().errorMessage()).toBe('disk full');
    });
  });

  describe('import file selection', () => {
    it('opens the import dialog defaulted to merge (the non-destructive choice) after picking a valid backup file', async () => {
      await setup();
      const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });

      await internals().onFileSelected(fileSelectEvent(file));

      expect(internals().importDialogOpen()).toBe(true);
      expect(internals().importMode()).toBe('merge');
    });

    it('rejects a file that is not a valid backup without opening the dialog', async () => {
      await setup();
      const file = new File(['not json'], 'garbage.json', { type: 'application/json' });

      await internals().onFileSelected(fileSelectEvent(file));

      expect(internals().importDialogOpen()).toBe(false);
      expect(internals().errorMessage()).toMatch(/not a valid/i);
    });

    it('is a no-op when the file picker is dismissed without choosing a file', async () => {
      await setup();

      await internals().onFileSelected(fileSelectEvent(null));

      expect(internals().importDialogOpen()).toBe(false);
    });
  });

  describe('QR transfer (TICKET-DAT-05)', () => {
    it('routes a scanned payload into the same replace-vs-merge dialog a chosen file uses', async () => {
      await setup();
      internals().qrReceiveOpen.set(true);

      internals().onQrReceived({ data: backup, omitted: {} });

      expect(internals().qrReceiveOpen()).toBe(false);
      expect(internals().importDialogOpen()).toBe(true);
      expect(internals().importMode()).toBe('merge');

      await internals().confirmImport();

      expect(dataManagementRepository.importAll).toHaveBeenCalledExactlyOnceWith(backup, 'merge');
      expect(internals().reloadPromptOpen()).toBe(true);
    });

    it('warns at the point of no return when the transfer left the source CSV behind', async () => {
      await setup();

      internals().onQrReceived({ data: backup, omitted: { transactions: ['rawLine', 'rawRow'] } });
      fixture.detectChanges();
      await fixture.whenStable();

      expect(internals().importNote()).toMatch(/original CSV rows/i);
      // Named once, not once per omitted field.
      expect(
        internals()
          .importNote()
          ?.match(/original CSV rows/gi),
      ).toHaveLength(1);
      expect(internals().importNote()).toMatch(/clear them/i);
      expect(fixture.nativeElement.textContent as string).toContain('original CSV rows');
    });

    it('clears a leftover transfer warning when a file is picked instead', async () => {
      await setup();
      internals().onQrReceived({ data: backup, omitted: { transactions: ['rawLine'] } });
      expect(internals().importNote()).not.toBeNull();

      const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });
      await internals().onFileSelected(fileSelectEvent(file));

      expect(internals().importNote()).toBeNull();
    });

    it('offers send and receive without mounting either dialog until asked', async () => {
      await setup();

      expect(fixture.nativeElement.querySelector('app-qr-send-dialog')).toBeNull();
      expect(fixture.nativeElement.querySelector('app-qr-receive-dialog')).toBeNull();

      internals().qrSendOpen.set(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.nativeElement.querySelector('app-qr-send-dialog')).not.toBeNull();
    });
  });

  describe('replace vs merge choice', () => {
    it('requires an explicit choice and flags Replace as destructive in the confirm affordance', async () => {
      await setup();
      const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });
      await internals().onFileSelected(fileSelectEvent(file));
      fixture.detectChanges();
      await fixture.whenStable();

      // Merge (the default) shows no destructive warning.
      expect(fixture.nativeElement.textContent as string).not.toContain("can't be undone");

      internals().importMode.set('replace');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.nativeElement.textContent as string).toContain("can't be undone");
      const confirmButton = Array.from(
        fixture.nativeElement.querySelectorAll('mm-button button') as NodeListOf<HTMLButtonElement>,
      ).find((button) => button.textContent?.includes('Replace data'));
      expect(confirmButton?.className).toContain('btn-error');
    });

    it('confirmImport calls importAll with the chosen mode, then prompts to reload on success', async () => {
      await setup();
      const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });
      await internals().onFileSelected(fileSelectEvent(file));
      internals().importMode.set('replace');

      await internals().confirmImport();

      expect(dataManagementRepository.importAll).toHaveBeenCalledExactlyOnceWith(backup, 'replace');
      expect(internals().importDialogOpen()).toBe(false);
      expect(internals().reloadPromptOpen()).toBe(true);
    });

    it('reloads every store after a restore, so declining the reload leaves nothing stale (TICKET-IMP-19)', async () => {
      await setup();
      const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });
      await internals().onFileSelected(fileSelectEvent(file));

      await internals().confirmImport();

      expect(storeReset.resetAll).toHaveBeenCalledTimes(1);
      expect(storeReset.rehydrateAll).toHaveBeenCalledTimes(1);
    });

    it('keeps the dialog open with an error message when importAll fails, so the user can retry', async () => {
      await setup();
      const file = new File([JSON.stringify(backup)], 'backup.json', { type: 'application/json' });
      await internals().onFileSelected(fileSelectEvent(file));
      dataManagementRepository.importAll.mockRejectedValueOnce(new Error('schema too new'));

      await internals().confirmImport();

      expect(internals().errorMessage()).toBe('schema too new');
      expect(internals().importDialogOpen()).toBe(true);
      expect(internals().reloadPromptOpen()).toBe(false);

      // Retry without re-selecting the file should still work, since pendingImport survived.
      dataManagementRepository.importAll.mockResolvedValueOnce(undefined);
      await internals().confirmImport();
      expect(internals().reloadPromptOpen()).toBe(true);
    });
  });

  describe('delete all data', () => {
    it('deleteAllConfirmed calls deleteAll then reloads the page on success', async () => {
      await setup();
      const reload = vi.fn();
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', { value: { reload }, writable: true });

      await internals().deleteAllConfirmed();

      expect(dataManagementRepository.deleteAll).toHaveBeenCalledExactlyOnceWith();
      expect(reload).toHaveBeenCalledTimes(1);
      expect(internals().deleting()).toBe(false);

      Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
    });

    it('surfaces a repository failure as an error message instead of reloading', async () => {
      await setup();
      dataManagementRepository.deleteAll.mockRejectedValueOnce(new Error('write failed'));
      const reload = vi.fn();
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', { value: { reload }, writable: true });

      await internals().deleteAllConfirmed();

      expect(internals().errorMessage()).toBe('write failed');
      expect(reload).not.toHaveBeenCalled();

      Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
    });
  });

  describe('reload prompt', () => {
    it('reloadPage reloads the page', async () => {
      await setup();
      // jsdom's `window.location.reload` isn't directly spy-able (non-configurable), so replace the
      // whole `location` object for this assertion.
      const reload = vi.fn();
      const originalLocation = window.location;
      Object.defineProperty(window, 'location', { value: { reload }, writable: true });

      internals().reloadPage();

      expect(reload).toHaveBeenCalledTimes(1);
      Object.defineProperty(window, 'location', { value: originalLocation, writable: true });
    });
  });
});
