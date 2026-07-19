import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TypographyComponent } from './typography.component';

@Component({
  imports: [TypographyComponent],
  template: `<mm-text variant="heading" as="h2">Net worth</mm-text>`,
})
class HostComponent {}

/** Angular's `[class]` binding applies/diffs individual class tokens rather than the concatenated string verbatim, so `element.className` doesn't preserve source order — compare as sets instead. The per-variant `mm-text-*` theme-style marker is asserted once in its own test and filtered here so every variant list stays about the variant's actual styling. */
const expectClasses = (element: Element, expected: string[]): void => {
  const tokens = element.className.split(' ').filter((c) => c && !c.startsWith('mm-text-'));
  expect(new Set(tokens)).toEqual(new Set(expected));
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
    expectClasses(fixture.nativeElement.querySelector('span'), [
      'text-[2.25rem]',
      'font-bold',
      'tracking-[-0.02em]',
      'leading-[1.1]',
      'font-display',
    ]);
  });

  it('renders the heading variant classes', () => {
    fixture.componentRef.setInput('variant', 'heading');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('span'), [
      'text-[1.5rem]',
      'font-semibold',
      'tracking-[-0.01em]',
      'leading-[1.25]',
      'text-base-content',
      'font-display',
    ]);
  });

  it('renders the subheading variant classes', () => {
    fixture.componentRef.setInput('variant', 'subheading');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('span'), [
      'text-[1.0625rem]',
      'font-medium',
      'leading-[1.4]',
      'text-base-content/70',
    ]);
  });

  it('renders the body variant classes', () => {
    fixture.componentRef.setInput('variant', 'body');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('span'), ['text-base', 'leading-[1.6]']);
  });

  it('renders the caption variant classes', () => {
    fixture.componentRef.setInput('variant', 'caption');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('span'), [
      'text-[0.8125rem]',
      'leading-[1.5]',
      'text-base-content/70',
    ]);
  });

  it('renders the label variant classes', () => {
    fixture.componentRef.setInput('variant', 'label');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('span'), [
      'text-[0.75rem]',
      'font-semibold',
      'tracking-[0.06em]',
      'leading-[1.4]',
      'uppercase',
      'text-base-content/60',
    ]);
  });

  it('emits the mm-text theme-style marker for its variant', () => {
    fixture.componentRef.setInput('variant', 'heading');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('span').classList).toContain('mm-text-heading');
  });

  it('adds tabular-nums when numeric is set', () => {
    fixture.componentRef.setInput('variant', 'body');
    fixture.componentRef.setInput('numeric', true);
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('span'), [
      'text-base',
      'leading-[1.6]',
      'tabular-nums',
    ]);
  });

  it('overrides a variant default weight with the weight input', () => {
    fixture.componentRef.setInput('variant', 'body');
    fixture.componentRef.setInput('weight', 'semibold');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('span'), [
      'text-base',
      'leading-[1.6]',
      'font-semibold',
    ]);
  });

  it('overrides a variant default color with the color input', () => {
    fixture.componentRef.setInput('variant', 'body');
    fixture.componentRef.setInput('color', 'error');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('span'), [
      'text-base',
      'leading-[1.6]',
      'text-error',
    ]);
  });

  it('applies the align input as a text-alignment utility', () => {
    fixture.componentRef.setInput('variant', 'body');
    fixture.componentRef.setInput('align', 'center');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('span'), [
      'text-base',
      'leading-[1.6]',
      'text-center',
    ]);
  });

  it('passes through the class input', () => {
    fixture.componentRef.setInput('variant', 'body');
    fixture.componentRef.setInput('class', 'mt-2');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('span'), [
      'text-base',
      'leading-[1.6]',
      'mt-2',
    ]);
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
    expectClasses(heading, [
      'text-[1.5rem]',
      'font-semibold',
      'tracking-[-0.01em]',
      'leading-[1.25]',
      'text-base-content',
      'font-display',
    ]);
  });
});
