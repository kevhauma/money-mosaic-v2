import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ButtonComponent, type ButtonShape } from './button.component';
import { MM_SQUISH_CLASS } from '@/shared/utils';

const ICON_ONLY_SHAPES: ButtonShape[] = ['square', 'circle'];

/** Angular's `[class]` binding applies/diffs individual class tokens rather than the concatenated string verbatim, so `element.className` doesn't preserve source order — compare as sets instead. */
const expectClasses = (element: Element, expected: string[]): void => {
  expect(new Set(element.className.split(' ').filter(Boolean))).toEqual(new Set(expected));
};

const SQUISH_TOKENS = MM_SQUISH_CLASS.split(' ');

describe('ButtonComponent', () => {
  let fixture: ComponentFixture<ButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ButtonComponent);
  });

  it('renders a native button by default', () => {
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expect(button).toBeTruthy();
    expectClasses(button, ['btn', ...SQUISH_TOKENS]);
  });

  it('omits the squish classes for the link variant', () => {
    fixture.componentRef.setInput('variant', 'link');
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button');
    expectClasses(button, ['btn', 'btn-link']);
  });

  it('renders a routerLink anchor instead of a button when link is set', () => {
    fixture.componentRef.setInput('link', '/accounts');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('a')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it.each(ICON_ONLY_SHAPES)(
    'carries an aria-label when shape is "%s" and ariaLabel is set',
    (shape) => {
      fixture.componentRef.setInput('shape', shape);
      fixture.componentRef.setInput('ariaLabel', 'Remove item');
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('button').getAttribute('aria-label')).toBe(
        'Remove item',
      );
    },
  );

  it('applies the shape modifier class', () => {
    fixture.componentRef.setInput('shape', 'square');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button').className).toContain('btn-square');
  });

  it('omits the shape modifier class for the default shape', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button').className).not.toContain('btn-');
  });
});
