import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BentoGridComponent } from './bento-grid.component';

/** Angular's `[class]` binding applies/diffs individual class tokens rather than the concatenated string verbatim, so `element.className` doesn't preserve source order — compare as sets instead. */
const expectClasses = (element: Element, expected: string[]): void => {
  expect(new Set(element.className.split(' ').filter(Boolean))).toEqual(new Set(expected));
};

describe('BentoGridComponent', () => {
  let fixture: ComponentFixture<BentoGridComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BentoGridComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BentoGridComponent);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('defaults to the 3-column responsive scale', () => {
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), [
      'grid',
      'gap-6',
      'grid-cols-1',
      'sm:grid-cols-2',
      'lg:grid-cols-3',
    ]);
  });

  it('renders the 2-column responsive scale', () => {
    fixture.componentRef.setInput('columns', '2');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), [
      'grid',
      'gap-6',
      'grid-cols-1',
      'sm:grid-cols-2',
    ]);
  });

  it('renders the 4-column responsive scale', () => {
    fixture.componentRef.setInput('columns', '4');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), [
      'grid',
      'gap-6',
      'grid-cols-1',
      'sm:grid-cols-2',
      'lg:grid-cols-4',
    ]);
  });

  it('passes through the class input', () => {
    fixture.componentRef.setInput('class', 'mb-6');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), [
      'grid',
      'gap-6',
      'grid-cols-1',
      'sm:grid-cols-2',
      'lg:grid-cols-3',
      'mb-6',
    ]);
  });

  it('has no color, border, or padding classes of its own', () => {
    fixture.detectChanges();
    const className = fixture.nativeElement.querySelector('div').className as string;
    expect(className).not.toMatch(/border|bg-|shadow|rounded|\bp-\d/);
  });
});
