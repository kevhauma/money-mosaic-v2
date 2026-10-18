import { TestBed } from '@angular/core/testing';
import type { ReadingLineVm } from '../../reading-statements';
import { ImportReadingLinesComponent } from './import-reading-lines.component';

describe('ImportReadingLinesComponent: the first lines as read (TICKET-IMP-16)', () => {
  const render = async (delimiter: string, lines: ReadingLineVm[]): Promise<HTMLElement> => {
    await TestBed.configureTestingModule({
      imports: [ImportReadingLinesComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(ImportReadingLinesComponent);
    fixture.componentRef.setInput('delimiter', delimiter);
    fixture.componentRef.setInput('lines', lines);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('draws a tab separator as an arrow', async () => {
    const element = await render('\t', [
      {
        number: 1,
        role: 'header',
        cells: [
          { text: 'Date', broken: false, color: 'base-content', weight: 'semibold' },
          { text: 'Amount', broken: false, color: 'base-content', weight: 'semibold' },
        ],
      },
    ]);
    expect(element.querySelector('[data-testid="reading-separator"]')?.textContent).toBe('⇥');
  });

  it('says so when there are no lines', async () => {
    const element = await render(';', []);
    expect(element.textContent?.trim()).toBe('The file has no lines to read.');
  });
});
