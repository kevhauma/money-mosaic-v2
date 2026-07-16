import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TypographyComponent } from './typography.component';

@Component({
  imports: [TypographyComponent],
  template: `<mm-text variant="heading" as="h2">Net worth</mm-text>`,
})
class HostComponent {}

/** Angular's `[class]` binding applies/diffs individual class tokens rather than the concatenated string verbatim, so `element.className` doesn't preserve source order — compare as sets instead. */
const expectClasses = (element: Element, expected: string[]): void => {
  expect(new Set(element.className.split(' ').filter(Boolean))).toEqual(new Set(expected));
};

describe('TypographyComponent', () => {
  let fixture: ComponentFixture<TypographyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TypographyComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TypographyComponent);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the display variant classes', () => {
    fixture.componentRef.setInput('variant', 'display');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('span'), ['text-2xl', 'font-semibold']);
  });

  it('renders the heading variant classes', () => {
    fixture.componentRef.setInput('variant', 'heading');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('span'), [
      'text-2xl',
      'font-semibold',
      'text-base-content',
    ]);
  });

  it('renders the subheading variant classes', () => {
    fixture.componentRef.setInput('variant', 'subheading');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('span'), [
      'text-sm',
      'font-medium',
      'text-base-content/70',
    ]);
  });

  it('renders the body variant with no default classes', () => {
    fixture.componentRef.setInput('variant', 'body');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('span').className).toBe('');
  });

  it('renders the caption variant classes', () => {
    fixture.componentRef.setInput('variant', 'caption');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('span'), ['text-sm', 'text-base-content/70']);
  });

  it('renders the label variant classes', () => {
    fixture.componentRef.setInput('variant', 'label');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('span'), [
      'text-xs',
      'uppercase',
      'tracking-wide',
      'text-base-content/60',
    ]);
  });

  it('overrides a variant default weight with the weight input', () => {
    fixture.componentRef.setInput('variant', 'body');
    fixture.componentRef.setInput('weight', 'semibold');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('span').className).toBe('font-semibold');
  });

  it('overrides a variant default color with the color input', () => {
    fixture.componentRef.setInput('variant', 'body');
    fixture.componentRef.setInput('color', 'error');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('span').className).toBe('text-error');
  });

  it('applies the align input as a text-alignment utility', () => {
    fixture.componentRef.setInput('variant', 'body');
    fixture.componentRef.setInput('align', 'center');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('span').className).toBe('text-center');
  });

  it('passes through the class input', () => {
    fixture.componentRef.setInput('variant', 'body');
    fixture.componentRef.setInput('class', 'mt-2');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('span').className).toBe('mt-2');
  });

  it('defaults to rendering a span', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('span')).toBeTruthy();
  });

  it.each([
    ['p', 'p'],
    ['h1', 'h1'],
    ['h2', 'h2'],
    ['h3', 'h3'],
    ['h4', 'h4'],
  ] as const)('renders as a %s tag when as="%s"', (as, tag) => {
    fixture.componentRef.setInput('as', as);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector(tag)).toBeTruthy();
    expect(fixture.nativeElement.querySelector('span')).toBeNull();
  });

  it('projects content into the rendered tag', async () => {
    const hostFixture = TestBed.createComponent(HostComponent);
    hostFixture.detectChanges();
    await hostFixture.whenStable();

    const heading = hostFixture.nativeElement.querySelector('h2');
    expect(heading?.textContent?.trim()).toBe('Net worth');
    expectClasses(heading, ['text-2xl', 'font-semibold', 'text-base-content']);
  });
});
