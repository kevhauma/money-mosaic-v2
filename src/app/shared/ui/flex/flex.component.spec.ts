import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FlexComponent } from './flex.component';

describe('FlexComponent', () => {
  let fixture: ComponentFixture<FlexComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FlexComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(FlexComponent);
  });

  it('renders a bare flex class with no inputs set', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('div').className).toBe('flex');
  });

  it('adds flex-col for direction="col"', () => {
    fixture.componentRef.setInput('direction', 'col');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('div').className).toContain('flex-col');
  });

  it('omits flex-col for the default row direction', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('div').className).not.toContain('flex-col');
  });

  it('maps align to items-*', () => {
    fixture.componentRef.setInput('align', 'center');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('div').className).toContain('items-center');
  });

  it('maps justify to justify-*', () => {
    fixture.componentRef.setInput('justify', 'between');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('div').className).toContain('justify-between');
  });

  it('maps gap to gap-*', () => {
    fixture.componentRef.setInput('gap', '3');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('div').className).toContain('gap-3');
  });

  it('adds flex-wrap when wrap is true', () => {
    fixture.componentRef.setInput('wrap', true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('div').className).toContain('flex-wrap');
  });

  it('omits flex-wrap by default', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('div').className).not.toContain('flex-wrap');
  });

  it('composes every modifier together with class passthrough', () => {
    fixture.componentRef.setInput('direction', 'row');
    fixture.componentRef.setInput('align', 'center');
    fixture.componentRef.setInput('justify', 'between');
    fixture.componentRef.setInput('gap', '3');
    fixture.componentRef.setInput('wrap', true);
    fixture.componentRef.setInput('class', 'mb-6');
    fixture.detectChanges();

    const classes = new Set(fixture.nativeElement.querySelector('div').className.split(' '));
    expect(classes).toEqual(
      new Set(['flex', 'items-center', 'justify-between', 'gap-3', 'flex-wrap', 'mb-6']),
    );
  });
});
