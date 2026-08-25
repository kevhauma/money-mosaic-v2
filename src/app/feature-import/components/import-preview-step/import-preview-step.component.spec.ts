import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AppSettingsRepository, type Transaction } from '@/core/data-access';
import type { ParsedRowResult } from '@/core/import';
import { withCleanFormatSettings } from '@/shared/utils/format-settings.testing';
import { ImportPreviewStepComponent } from './import-preview-step.component';

const validRow = (overrides: Partial<Transaction> = {}): ParsedRowResult =>
  ({
    valid: true,
    transaction: {
      bookingDate: '2026-06-01',
      amount: -10,
      currency: 'EUR',
      rawDescription: 'Coffee',
      ...overrides,
    },
  }) as ParsedRowResult;

describe('ImportPreviewStepComponent: already-imported rows (TICKET-IMP-14)', () => {
  withCleanFormatSettings();

  let fixture: ComponentFixture<ImportPreviewStepComponent>;

  const setup = async (
    rows: ParsedRowResult[],
    duplicates: ReadonlySet<ParsedRowResult> = new Set(),
  ): Promise<HTMLElement> => {
    await TestBed.configureTestingModule({
      imports: [ImportPreviewStepComponent],
      providers: [
        { provide: AppSettingsRepository, useValue: { get: vi.fn().mockResolvedValue({ id: 1 }) } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(ImportPreviewStepComponent);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('duplicates', duplicates);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('marks a row the account already has, and leaves the rest reading valid', async () => {
    const seen = validRow();
    const fresh = validRow({ amount: -20, rawDescription: 'New one' });

    const element = await setup([seen, fresh], new Set([seen]));

    const statuses = [...element.querySelectorAll('tbody tr td:first-child')].map((cell) =>
      cell.textContent?.trim(),
    );
    expect(statuses).toEqual(['already imported', 'valid']);
  });

  it('offers no duplicates toggle when there are none', async () => {
    const element = await setup([validRow()]);

    expect(element.querySelector('mm-button')).toBeNull();
  });

  it('filters the table down to the already-imported rows on request', async () => {
    const seen = validRow();
    const fresh = validRow({ amount: -20, rawDescription: 'New one' });
    const element = await setup([seen, fresh], new Set([seen]));

    const toggle = element.querySelector('button') as HTMLButtonElement;
    // Pluralised by the shared helper, so a single duplicate does not read "1 rows".
    expect(toggle.textContent).toContain('Show the 1 row already imported');

    toggle.click();
    fixture.detectChanges();

    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(element.textContent).toContain('Coffee');
    expect(element.textContent).not.toContain('New one');
    expect(element.querySelector('button')?.textContent).toContain('Show all rows');
  });

  it('counts the filtered list, not the whole file, in the "showing the first N" note', async () => {
    // 60 rows, of which 55 are already present: the note has to describe what is on screen.
    const rows = Array.from({ length: 60 }, (_, index) =>
      validRow({ amount: -(index + 1), rawDescription: `Row ${index}` }),
    );
    const element = await setup(rows, new Set(rows.slice(0, 55)));

    expect(element.textContent).toContain('Showing the first 50 of 60 rows.');

    (element.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(element.textContent).toContain('Showing the first 50 of 55 rows.');
  });
});
