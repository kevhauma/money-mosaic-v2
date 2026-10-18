import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { vi } from 'vitest';
import type { CsvEncoding, DateFormat } from '@/core/data-access';
import type { ReadingControls, ReadingLineVm, ReadingStatementVm } from '../../reading-statements';
import { ImportReadingSectionComponent } from './import-reading-section.component';

const statement = (overrides: Partial<ReadingStatementVm>): ReadingStatementVm => ({
  key: 'delimiter',
  title: 'Columns are split by ;',
  evidence: '3 columns on every line',
  confidence: 'sure',
  current: ';',
  options: [
    { value: ';', label: 'Semicolon ;' },
    { value: ',', label: 'Comma ,' },
  ],
  ...overrides,
});

const STATEMENTS: ReadingStatementVm[] = [
  statement({}),
  statement({
    key: 'encoding',
    title: 'Text is UTF-8',
    evidence: 'Some letters look broken:',
    highlight: 'CAFÃ‰',
    confidence: 'unsure',
    current: 'utf-8',
    options: [
      { value: 'utf-8', label: 'UTF-8', preview: 'CAFÃ‰' },
      { value: 'windows-1252', label: 'Windows-1252', preview: 'CAFÉ' },
    ],
  }),
];

const LINES: ReadingLineVm[] = [
  {
    number: 1,
    role: 'header',
    cells: [
      { text: 'Datum', broken: false, color: 'base-content', weight: 'semibold' },
      { text: 'Omschrijving', broken: false, color: 'base-content', weight: 'semibold' },
    ],
  },
  {
    number: 2,
    role: 'data',
    cells: [
      { text: '30/09/2026', broken: false, color: 'base-content', weight: undefined },
      { text: 'CAFÃ‰', broken: true, color: 'warning', weight: 'bold' },
    ],
  },
];

const controls = (): ReadingControls => ({
  encoding: new FormControl<CsvEncoding>('utf-8', { nonNullable: true }),
  delimiter: new FormControl(';', { nonNullable: true }),
  headerRows: new FormControl(1, { nonNullable: true }),
  dateFormat: new FormControl<DateFormat>('DD/MM/YYYY', { nonNullable: true }),
  decimalSeparator: new FormControl(',', { nonNullable: true }),
});

describe('ImportReadingSectionComponent: how the file is read (TICKET-IMP-16)', () => {
  let fixture: ComponentFixture<ImportReadingSectionComponent>;
  let element: HTMLElement;
  let form: ReadingControls;

  const setup = async (open: boolean): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [ImportReadingSectionComponent],
    }).compileComponents();
    form = controls();
    fixture = TestBed.createComponent(ImportReadingSectionComponent);
    fixture.componentRef.setInput('fileName', 'argenta.csv');
    fixture.componentRef.setInput('delimiter', ';');
    fixture.componentRef.setInput('lines', LINES);
    fixture.componentRef.setInput('statements', STATEMENTS);
    fixture.componentRef.setInput('controls', form);
    fixture.componentRef.setInput('summary', 'Read as ; separated · comma decimals');
    fixture.componentRef.setInput('note', 'Opened because one thing looked unsure.');
    fixture.componentRef.setInput('open', open);
    await fixture.whenStable();
    element = fixture.nativeElement as HTMLElement;
  };

  const radioGroups = (): HTMLElement[] =>
    Array.from(element.querySelectorAll<HTMLElement>('[role="radiogroup"]'));
  const button = (label: string): HTMLButtonElement | undefined =>
    Array.from(element.querySelectorAll('button')).find(
      (candidate) => candidate.textContent?.trim() === label,
    );

  it('folds to one summary line with a Change action', async () => {
    await setup(false);
    const changed = vi.fn();
    fixture.componentInstance.changeRequested.subscribe(changed);

    expect(element.querySelector('[data-testid="reading-summary"]')?.textContent?.trim()).toBe(
      'Read as ; separated · comma decimals',
    );
    expect(element.querySelector('[data-testid="reading-lines"]')).toBeNull();

    button('Change')?.click();
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('shows the first lines with the separator marked and broken text called out', async () => {
    await setup(true);

    // Each line is its number, then the cells joined by the marked separator.
    const lineTexts = Array.from(element.querySelectorAll('[data-testid="reading-line"]')).map(
      (line) => line.textContent?.trim(),
    );
    expect(lineTexts).toEqual(['1Datum;Omschrijving', '230/09/2026;CAFÃ‰']);
    expect(element.querySelectorAll('[data-testid="reading-separator"]')).toHaveLength(2);
    const warned = Array.from(element.querySelectorAll('.text-warning')).map((node) =>
      node.textContent?.trim(),
    );
    expect(warned).toEqual(['CAFÃ‰']);
  });

  it('marks each statement sure or check-this and opens only the unsure ones', async () => {
    await setup(true);

    expect(element.textContent).toContain('✓ sure');
    expect(element.textContent).toContain('check this');
    expect(radioGroups().map((group) => group.getAttribute('aria-label'))).toEqual([
      'Text is UTF-8',
    ]);
  });

  it('opens a sure row’s options when its title is clicked', async () => {
    await setup(true);
    const title = button('Columns are split by ;')!;

    title.click();
    await fixture.whenStable();

    expect(radioGroups()).toHaveLength(2);
    expect(title.getAttribute('aria-expanded')).toBe('true');
  });

  it('labels each option with its preview and binds the radios to the form control', async () => {
    await setup(true);

    const labels = Array.from(radioGroups()[0].querySelectorAll('label'));
    expect(labels.map((label) => label.textContent?.trim())).toEqual([
      'UTF-8 · CAFÃ‰',
      'Windows-1252 · CAFÉ',
    ]);
    const radios = labels.map((label) => label.querySelector('input')!);
    expect(radios.map((radio) => radio.checked)).toEqual([true, false]);

    radios[1].click();
    expect(form.encoding.value).toBe('windows-1252');
  });

  it('emits confirmed from "Read it like this"', async () => {
    await setup(true);
    const confirmed = vi.fn();
    fixture.componentInstance.confirmed.subscribe(confirmed);

    button('Read it like this')?.click();

    expect(confirmed).toHaveBeenCalledTimes(1);
  });
});
