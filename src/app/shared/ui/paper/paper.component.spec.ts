import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaperComponent } from './paper.component';
import { MM_SQUISH_CLASS } from '@/shared/utils';

/** Angular's `[class]` binding applies/diffs individual class tokens rather than the concatenated string verbatim, so `element.className` doesn't preserve source order — compare as sets instead. */
const expectClasses = (element: Element, expected: string[]): void => {
  expect(new Set(element.className.split(' ').filter(Boolean))).toEqual(new Set(expected));
};

/** Per-tier surface + elevation hook (styles.css) — the actual look comes from the active theme's `--mm-surface-*`/`--mm-elev-*` values, so the component only ever emits these stable markers. */
const FLAT_SURFACE = 'bg-(--mm-surface-flat)';
const RAISED_SURFACE = 'bg-(--mm-surface-raised)';
const FLOATING_SURFACE = 'bg-(--mm-surface-floating)';

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
      RAISED_SURFACE,
      'border',
      'border-base-300',
      'mm-elev-raised',
    ]);
  });

  it('renders the flat elevation classes', () => {
    fixture.componentRef.setInput('elevation', 'flat');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), [
      'card',
      FLAT_SURFACE,
      'border',
      'border-base-300',
      'mm-elev-flat',
    ]);
  });

  it('renders the floating elevation classes', () => {
    fixture.componentRef.setInput('elevation', 'floating');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), [
      'card',
      FLOATING_SURFACE,
      'border',
      'border-base-300',
      'mm-elev-floating',
    ]);
  });

  it('adds the mm-halo hook when glow is set on a floating surface', () => {
    fixture.componentRef.setInput('elevation', 'floating');
    fixture.componentRef.setInput('glow', true);
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), [
      'card',
      FLOATING_SURFACE,
      'border',
      'border-base-300',
      'mm-elev-floating',
      'mm-halo',
    ]);
  });

  it('ignores glow on non-floating elevations', () => {
    fixture.componentRef.setInput('glow', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('div').className).not.toContain('mm-halo');
  });

  it('adds h-full when fullHeight is set', () => {
    fixture.componentRef.setInput('fullHeight', true);
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), [
      'card',
      RAISED_SURFACE,
      'border',
      'border-base-300',
      'mm-elev-raised',
      'h-full',
    ]);
  });

  it('passes through the class input', () => {
    fixture.componentRef.setInput('class', 'mt-2');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), [
      'card',
      RAISED_SURFACE,
      'border',
      'border-base-300',
      'mm-elev-raised',
      'mt-2',
    ]);
  });

  it('renders as a plain div when no link is provided', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
    expect(fixture.nativeElement.querySelector('div.card')).toBeTruthy();
  });

  it('renders as a router link with the squish hook and hover tint when link is provided', async () => {
    fixture.componentRef.setInput('link', '/transactions');
    fixture.detectChanges();
    await fixture.whenStable();
    const anchor = fixture.nativeElement.querySelector('a');
    expect(anchor).toBeTruthy();
    expectClasses(anchor, [
      'card',
      RAISED_SURFACE,
      'border',
      'border-base-300',
      'mm-elev-raised',
      MM_SQUISH_CLASS,
      'hover:bg-base-200',
    ]);
  });

  it('projects content into the card-body', () => {
    fixture.detectChanges();
    const cardBody = fixture.nativeElement.querySelector('.card-body');
    expect(cardBody).toBeTruthy();
  });

  it('overrides the background, replacing the per-theme surface default entirely (border still applies)', () => {
    fixture.componentRef.setInput('background', 'bg-warning/10');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), [
      'card',
      'bg-warning/10',
      'border',
      'border-base-300',
      'mm-elev-raised',
    ]);
  });

  it('overrides the flat border color', () => {
    fixture.componentRef.setInput('elevation', 'flat');
    fixture.componentRef.setInput('borderColor', 'error/40');
    fixture.detectChanges();
    expectClasses(fixture.nativeElement.querySelector('div'), [
      'card',
      FLAT_SURFACE,
      'border',
      'border-error/40',
      'mm-elev-flat',
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
      'border',
      'border-base-300',
      'mm-elev-raised',
      MM_SQUISH_CLASS,
      'hover:bg-warning/20',
    ]);
  });
});
