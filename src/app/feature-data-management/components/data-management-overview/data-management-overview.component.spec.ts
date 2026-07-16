import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { DataManagementRepository, type AppDataExport } from '@/core/data-access';
import { DataManagementOverviewComponent } from './data-management-overview.component';

type Internals = {
  exporting: () => boolean;
  errorMessage: () => string | null;
  importDialogOpen: () => boolean;
  importMode: { (): 'merge' | 'replace'; set: (value: 'merge' | 'replace') => void };
  importing: () => boolean;
  reloadPromptOpen: () => boolean;
  exportData: () => Promise<void>;
  onFileSelected: (event: Event) => Promise<void>;
  confirmImport: () => Promise<void>;
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
  };

  const setup = async (): Promise<void> => {
    vi.clearAllMocks();
    dataManagementRepository.exportAll.mockResolvedValue(backup);
    dataManagementRepository.importAll.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [DataManagementOverviewComponent],
      providers: [{ provide: DataManagementRepository, useValue: dataManagementRepository }],
    }).compileComponents();

    fixture = TestBed.createComponent(DataManagementOverviewComponent);
    await fixture.whenStable();
  };

  const internals = (): Internals => fixture.componentInstance as unknown as Internals;

  describe('export', () => {
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
