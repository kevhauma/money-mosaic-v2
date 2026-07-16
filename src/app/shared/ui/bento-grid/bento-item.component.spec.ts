import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BentoItemComponent } from './bento-item.component';

const expectClasses = (element: Element, expected: string[]): void => {
  expect(new Set(element.className.split(' ').filter(Boolean))).toEqual(new Set(expected));
};

describe('BentoItemComponent', () => {
  let fixture: ComponentFixture<BentoItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BentoItemComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BentoItemComponent);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders no span classes at the 1x1 default', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('div').className).toBe('');
  });

  it('renders a col-span class when colSpan is set', () => {
    fixture.componentRef.setInput('colSpan', '2');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), ['col-span-2']);
  });

  it('renders a row-span class when rowSpan is set', () => {
    fixture.componentRef.setInput('rowSpan', '3');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), ['row-span-3']);
  });

  it('renders both col-span and row-span classes when both are set', () => {
    fixture.componentRef.setInput('colSpan', '2');
    fixture.componentRef.setInput('rowSpan', '2');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), ['col-span-2', 'row-span-2']);
  });

  it('passes through the class input', () => {
    fixture.componentRef.setInput('class', 'order-first');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), ['order-first']);
  });

  it('has no color, border, or padding classes of its own', () => {
    fixture.componentRef.setInput('colSpan', '2');
    fixture.detectChanges();
    const className = fixture.nativeElement.querySelector('div').className as string;
    expect(className).not.toMatch(/border|bg-|shadow|rounded|\bp-\d/);
  });
});
