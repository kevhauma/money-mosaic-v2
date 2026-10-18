import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { vi } from 'vitest';
import { COLUMN_FIELD_DEFS } from '../../column-mapping';
import type { ColumnControls, ColumnGroupVm, ColumnRowVm } from '../../column-statements';
import { ImportColumnsSectionComponent } from './import-columns-section.component';

const row = (overrides: Partial<ColumnRowVm>): ColumnRowVm => ({
  key: 'date',
  label: 'Date',
  reading: '30/09/2026 reads as 30 Sep 2026',
  readingProblem: false,
  marker: 'sure',
  markerLabel: '✓ sure',
  markerColor: 'success',
  ...overrides,
});

const GROUPS: ColumnGroupVm[] = [
  {
    id: 'needed',
    title: 'Needed',
    amountSwitch: true,
    rows: [
      row({}),
      row({
        key: 'description',
        label: 'Description',
        reading: 'BETALING MET KAART',
        marker: 'check',
        markerLabel: 'check this',
        markerColor: 'warning',
        runnerUp: 'or maybe: Omschrijving',
        clash: 'Also used for Who it was with',
      }),
    ],
  },
  {
    id: 'optional',
    title: 'Also found',
    caption: 'These make rules and transfers smarter.',
    amountSwitch: false,
    rows: [
      row({
        key: 'balance',
        label: 'Running balance',
        reading: '',
        reason: 'Sets a new account’s opening balance.',
        marker: 'missing',
        markerLabel: 'not found',
        markerColor: 'neutral',
      }),
    ],
  },
];

const controls = (): ColumnControls =>
  Object.fromEntries(
    COLUMN_FIELD_DEFS.map(({ key }) => [key, new FormControl('', { nonNullable: true })]),
  ) as ColumnControls;

describe('ImportColumnsSectionComponent', () => {
  let fixture: ComponentFixture<ImportColumnsSectionComponent>;
  let columnControls: ColumnControls;

  const mount = async (inputs: Record<string, unknown> = {}): Promise<HTMLElement> => {
    await TestBed.configureTestingModule({
      imports: [ImportColumnsSectionComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ImportColumnsSectionComponent);
    columnControls = controls();
    const values: Record<string, unknown> = {
      fileName: 'argenta-export.csv',
      headers: ['Datum', 'Omschrijving', 'Datum'],
      groups: GROUPS,
      controls: columnControls,
      amountMode: 'single',
      open: true,
      summary: 'Date ← Datum · Description ← Omschrijving',
      nameControl: new FormControl('argenta-export', { nonNullable: true }),
      rememberControl: new FormControl(true, { nonNullable: true }),
      ...inputs,
    };
    for (const [name, value] of Object.entries(values)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  const buttonNamed = (element: HTMLElement, text: string): HTMLButtonElement =>
    [...element.querySelectorAll('button')].find((b) => b.textContent?.trim() === text)!;

  it('lists each field with its reading, marker, runner-up and clash, in two groups', async () => {
    const element = await mount();

    expect(element.querySelector('[data-group="needed"]')?.textContent).toContain('Needed');
    expect(element.querySelector('[data-group="optional"]')?.textContent).toContain(
      'These make rules and transfers smarter.',
    );
    const description = element.querySelector('[data-column="description"]')!;
    expect(description.textContent).toContain('BETALING MET KAART');
    expect(description.textContent).toContain('or maybe: Omschrijving');
    expect(description.textContent).toContain('check this');
    expect(description.textContent).toContain('Also used for Who it was with');
    // A field with no column says what it is for instead of what it reads as.
    const balance = element.querySelector('[data-column="balance"]')!;
    expect(balance.textContent).toContain('Sets a new account’s opening balance.');
    expect(balance.textContent).toContain('not found');
  });

  it('offers every header, duplicates included, in a select bound to the host’s control', async () => {
    const element = await mount();
    const select = element.querySelector<HTMLSelectElement>('[data-column="date"] select')!;

    expect([...select.options].map((option) => option.text)).toEqual([
      'none',
      'Datum',
      'Omschrijving',
      'Datum',
    ]);
    expect(select.getAttribute('aria-label')).toBe('Date');
    select.value = 'Omschrijving';
    select.dispatchEvent(new Event('change'));
    expect(columnControls.date.value).toBe('Omschrijving');
  });

  it('emits the amount mode picked on the switch', async () => {
    const element = await mount();
    const emitted = vi.fn();
    fixture.componentInstance.amountModeChange.subscribe(emitted);

    buttonNamed(element, 'Money out + money in').click();

    expect(emitted).toHaveBeenCalledWith('split');
  });

  it('holds "Looks right" while a needed field has no column, and says which', async () => {
    const element = await mount({ missing: ['Amount'] });

    expect(buttonNamed(element, 'Looks right').disabled).toBe(true);
    expect(element.textContent).toContain('Pick a column for Amount.');
  });

  it('emits confirmed from "Looks right"', async () => {
    const element = await mount();
    const confirmed = vi.fn();
    fixture.componentInstance.confirmed.subscribe(confirmed);

    buttonNamed(element, 'Looks right').click();

    expect(confirmed).toHaveBeenCalledTimes(1);
  });

  it('offers to remember the columns under an editable name', async () => {
    const element = await mount();

    expect(element.textContent).toContain('Remember these columns for files like this one');
    const name = element.querySelector<HTMLInputElement>('input[type="text"]')!;
    expect(name.value).toBe('argenta-export');
  });

  it('folds to one summary line with a Change action', async () => {
    const element = await mount({ open: false, note: 'Checked by you' });
    const changeRequested = vi.fn();
    fixture.componentInstance.changeRequested.subscribe(changeRequested);

    expect(element.querySelector('[data-column]')).toBeNull();
    expect(element.querySelector('[data-testid="columns-summary"]')?.textContent).toContain(
      'Date ← Datum',
    );
    buttonNamed(element, 'Change').click();
    expect(changeRequested).toHaveBeenCalledTimes(1);
  });
});
