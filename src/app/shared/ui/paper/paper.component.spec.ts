import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaperComponent } from './paper.component';

/** Angular's `[class]` binding applies/diffs individual class tokens rather than the concatenated string verbatim, so `element.className` doesn't preserve source order — compare as sets instead. */
const expectClasses = (element: Element, expected: string[]): void => {
  expect(new Set(element.className.split(' ').filter(Boolean))).toEqual(new Set(expected));
};

const RAISED_SHADOW = 'shadow-[0_1px_2px_rgba(11,11,17,.06),0_1px_3px_rgba(11,11,17,.08)]';
const FLOATING_SHADOW = 'shadow-[0_4px_12px_rgba(11,11,17,.10),0_2px_4px_rgba(11,11,17,.06)]';
const DARK_SHADOW_NONE = 'dark:shadow-none';

describe('PaperComponent', () => {
  let fixture: ComponentFixture<PaperComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaperComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(PaperComponent);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the raised elevation (default) classes', () => {
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), [
      'card',
      'bg-base-100',
      'dark:bg-base-200',
      RAISED_SHADOW,
      DARK_SHADOW_NONE,
    ]);
  });

  it('renders the flat elevation classes', () => {
    fixture.componentRef.setInput('elevation', 'flat');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), [
      'card',
      'bg-base-100',
      'border',
      'border-base-300',
    ]);
  });

  it('renders the floating elevation classes', () => {
    fixture.componentRef.setInput('elevation', 'floating');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), [
      'card',
      'bg-base-100',
      'dark:bg-base-300',
      FLOATING_SHADOW,
      DARK_SHADOW_NONE,
    ]);
  });

  it('adds a dark aurora-violet ring when glow is set on a floating surface', () => {
    fixture.componentRef.setInput('elevation', 'floating');
    fixture.componentRef.setInput('glow', true);
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), [
      'card',
      'bg-base-100',
      'dark:bg-base-300',
      FLOATING_SHADOW,
      DARK_SHADOW_NONE,
      'dark:ring-1',
      'dark:ring-[oklch(60%_0.17_285_/_15%)]',
    ]);
  });

  it('adds h-full when fullHeight is set', () => {
    fixture.componentRef.setInput('fullHeight', true);
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), [
      'card',
      'bg-base-100',
      'dark:bg-base-200',
      RAISED_SHADOW,
      DARK_SHADOW_NONE,
      'h-full',
    ]);
  });

  it('passes through the class input', () => {
    fixture.componentRef.setInput('class', 'mt-2');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), [
      'card',
      'bg-base-100',
      'dark:bg-base-200',
      RAISED_SHADOW,
      DARK_SHADOW_NONE,
      'mt-2',
    ]);
  });

  it('renders as a plain div when no link is provided', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
    expect(fixture.nativeElement.querySelector('div.card')).toBeTruthy();
  });

  it('renders as a router link with hover transition when link is provided', async () => {
    fixture.componentRef.setInput('link', '/transactions');
    fixture.detectChanges();
    await fixture.whenStable();
    const anchor = fixture.nativeElement.querySelector('a');
    expect(anchor).toBeTruthy();
    expectClasses(anchor, [
      'card',
      'bg-base-100',
      'dark:bg-base-200',
      RAISED_SHADOW,
      DARK_SHADOW_NONE,
      'transition',
      'hover:bg-base-200',
    ]);
  });

  it('projects content into the card-body', () => {
    fixture.detectChanges();
    const cardBody = fixture.nativeElement.querySelector('.card-body');
    expect(cardBody).toBeTruthy();
  });

  it('overrides the background, replacing the dark-mode default entirely', () => {
    fixture.componentRef.setInput('background', 'bg-warning/10');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), [
      'card',
      'bg-warning/10',
      RAISED_SHADOW,
      DARK_SHADOW_NONE,
    ]);
  });

  it('overrides the flat border color', () => {
    fixture.componentRef.setInput('elevation', 'flat');
    fixture.componentRef.setInput('borderColor', 'error/40');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), [
      'card',
      'bg-base-100',
      'border',
      'border-error/40',
    ]);
  });

  it('overrides the inner body class', () => {
    fixture.componentRef.setInput('bodyClass', 'flex items-center gap-3 p-3');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('.card > div'), [
      'flex',
      'items-center',
      'gap-3',
      'p-3',
    ]);
  });

  it('passes through the style input', () => {
    fixture.componentRef.setInput('style', 'border-inline-start: 4px solid red');
    fixture.detectChanges();
    const el = fixture.nativeElement.querySelector('div.card') as HTMLElement;
    expect(el.style.borderInlineStart).toBe('4px solid red');
  });

  it('overrides the link hover tint', async () => {
    fixture.componentRef.setInput('link', '/transactions');
    fixture.componentRef.setInput('background', 'bg-warning/10');
    fixture.componentRef.setInput('linkHover', 'hover:bg-warning/20');
    fixture.detectChanges();
    await fixture.whenStable();
    const anchor = fixture.nativeElement.querySelector('a');
    expectClasses(anchor, [
      'card',
      'bg-warning/10',
      RAISED_SHADOW,
      DARK_SHADOW_NONE,
      'transition',
      'hover:bg-warning/20',
    ]);
  });
});
