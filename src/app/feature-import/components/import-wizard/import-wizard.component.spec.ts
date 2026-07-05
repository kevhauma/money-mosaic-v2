import { Component, input, model, output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi, type Mock } from 'vitest';
import type { CommitImportResult, ParsedRowResult } from '@/core/import';
import { CsvImportService } from '@/core/import';
import { AccountsStore } from '@/feature-accounts';
import { MappingProfilesStore } from '../../mapping-profiles.store';
import { ImportBatchesStore } from '../../import-batches.store';
import { ImportWizardComponent } from './import-wizard.component';
import { ImportSelectStepComponent } from '../import-select-step/import-select-step.component';
import { ImportMapStepComponent } from '../import-map-step/import-map-step.component';
import { ImportPreviewStepComponent } from '../import-preview-step/import-preview-step.component';
import { ImportSummaryStepComponent } from '../import-summary-step/import-summary-step.component';

// Light stand-ins for the step children so the wizard's own control-flow is what's under test —
// the real steps pull in the CSV service, Dexie repos, and detection logic we don't want here.
@Component({ selector: 'app-import-select-step', template: '' })
class SelectStubComponent {
  readonly accounts = input<unknown[]>([]);
  readonly queue = model<unknown[]>([]);
}
@Component({ selector: 'app-import-map-step', template: '' })
class MapStubComponent {
  readonly file = input.required<File>();
  readonly accountId = input.required<number>();
  readonly result = model<unknown>(null);
}
@Component({ selector: 'app-import-preview-step', template: '' })
class PreviewStubComponent {
  readonly rows = input.required<ParsedRowResult[]>();
}
@Component({ selector: 'app-import-summary-step', template: '' })
class SummaryStubComponent {
  readonly batch = input.required<unknown>();
  readonly showDoneLink = input(true);
  readonly undo = output<void>();
}

const MAPPING_PROFILE = {
  name: 'Custom mapping',
  delimiter: ';',
  decimalSeparator: ',',
  dateFormat: 'DD/MM/YYYY',
  encoding: 'utf-8',
  headerRows: 1,
  signConvention: 'as-is',
  columns: { date: 'Date', description: 'Desc' },
};
const VALID_RESULT = { mappingProfile: MAPPING_PROFILE };

const validRow = (): ParsedRowResult =>
  ({
    valid: true,
    transaction: { bookingDate: '2026-01-01', amount: 10 },
  }) as unknown as ParsedRowResult;

const csvFile = (name: string): File => new File(['Date;Desc\n01/01/2026;x'], name);

describe('ImportWizardComponent: combined map + preview step', () => {
  let fixture: ComponentFixture<ImportWizardComponent>;
  let component: InstanceType<typeof ImportWizardComponent>;
  let parse: Mock;
  let commitImport: Mock;

  const set = (key: string, value: unknown): void =>
    (component as unknown as Record<string, { set(v: unknown): void }>)[key].set(value);
  const read = <T>(key: string): T => (component as unknown as Record<string, () => T>)[key]();
  const primaryButton = (): HTMLButtonElement =>
    fixture.nativeElement.querySelectorAll('button')[1] as HTMLButtonElement;

  beforeEach(async () => {
    parse = vi.fn().mockResolvedValue({ headers: ['Date', 'Desc'], rows: [validRow()] });
    commitImport = vi.fn().mockImplementation(
      async (input: { accountId: number }): Promise<CommitImportResult> =>
        ({
          batch: { id: input.accountId },
          addedTransactions: [],
          duplicateCount: 0,
        }) as unknown as CommitImportResult,
    );

    await TestBed.configureTestingModule({
      imports: [ImportWizardComponent],
      providers: [
        provideRouter([]),
        { provide: CsvImportService, useValue: { parse } },
        { provide: ImportBatchesStore, useValue: { commitImport, undoImport: vi.fn() } },
        { provide: MappingProfilesStore, useValue: { upsertForBankAndAccount: vi.fn() } },
        { provide: AccountsStore, useValue: { activeAccounts: signal([]) } },
      ],
    })
      .overrideComponent(ImportWizardComponent, {
        remove: {
          imports: [
            ImportSelectStepComponent,
            ImportMapStepComponent,
            ImportPreviewStepComponent,
            ImportSummaryStepComponent,
          ],
        },
        add: {
          imports: [
            SelectStubComponent,
            MapStubComponent,
            PreviewStubComponent,
            SummaryStubComponent,
          ],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(ImportWizardComponent);
    component = fixture.componentInstance;
  });

  // Real timer wait — the app is zoneless, so fakeAsync/tick aren't available; wait past the
  // 300ms parse debounce and let the (resolved) worker mock settle.
  const settleParse = async (): Promise<void> => {
    await new Promise<void>((resolve) => setTimeout(resolve, 350));
    await fixture.whenStable();
    fixture.detectChanges();
  };

  const enterStep2WithFile = (): void => {
    set('queue', [{ file: csvFile('a.csv'), accountId: 1, autoDetected: false }]);
    set('currentFileIndex', 0);
    set('step', 2);
    fixture.detectChanges();
  };

  it('parses automatically once the mapping becomes valid', async () => {
    enterStep2WithFile();
    expect(read<ParsedRowResult[]>('parsedRows')).toEqual([]);

    set('mapResult', VALID_RESULT);
    fixture.detectChanges(); // flush the reactive-parse effect → schedules the debounced parse
    await settleParse();

    expect(parse).toHaveBeenCalledTimes(1);
    expect(parse).toHaveBeenCalledWith(expect.any(File), MAPPING_PROFILE);
    expect(read<ParsedRowResult[]>('parsedRows')).toHaveLength(1);
  });

  it('clears the preview to a placeholder when the mapping goes invalid', async () => {
    enterStep2WithFile();
    set('mapResult', VALID_RESULT);
    fixture.detectChanges();
    await settleParse();
    expect(read<ParsedRowResult[]>('parsedRows')).toHaveLength(1);

    set('mapResult', null);
    fixture.detectChanges();

    expect(read<ParsedRowResult[]>('parsedRows')).toEqual([]);
    expect(read('parseError')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Complete the required mapping fields');
  });

  it('disables the top confirm action while mapping invalid, parsing, or committing', async () => {
    enterStep2WithFile();
    expect(primaryButton().disabled).toBe(true); // mapping not yet valid

    set('mapResult', VALID_RESULT);
    fixture.detectChanges();
    expect(primaryButton().disabled).toBe(true); // parse pending (debounce window counts as parsing)
    await settleParse();
    expect(primaryButton().disabled).toBe(false); // valid + parsed

    set('committing', true);
    fixture.detectChanges();
    expect(primaryButton().disabled).toBe(true);
  });

  it('commits each file in a 2-file batch under its own account and reaches Summary', async () => {
    set('queue', [
      { file: csvFile('a.csv'), accountId: 11, autoDetected: false },
      { file: csvFile('b.csv'), accountId: 22, autoDetected: false },
    ]);
    set('currentFileIndex', 0);
    set('step', 2);

    // File 1
    set('parsedRows', [validRow()]);
    set('mapResult', VALID_RESULT);
    await (component as unknown as { goNext(): Promise<void> }).goNext();

    expect(commitImport).toHaveBeenCalledTimes(1);
    expect(commitImport.mock.calls[0][0]).toMatchObject({ accountId: 11 });
    expect(read('step')).toBe(2); // stays on the combined screen for file 2
    expect(read('currentFileIndex')).toBe(1);

    // File 2
    set('parsedRows', [validRow()]);
    set('mapResult', VALID_RESULT);
    await (component as unknown as { goNext(): Promise<void> }).goNext();

    expect(commitImport).toHaveBeenCalledTimes(2);
    expect(commitImport.mock.calls[1][0]).toMatchObject({ accountId: 22 });
    expect(read('step')).toBe(3); // Summary
    expect(read<CommitImportResult[]>('commitResults')).toHaveLength(2);
  });
});
