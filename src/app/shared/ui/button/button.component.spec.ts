import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ButtonComponent, type ButtonShape } from './button.component';

const ICON_ONLY_SHAPES: ButtonShape[] = ['square', 'circle'];

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
    expect(button.className).toBe('btn');
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
