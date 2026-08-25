import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IncomeInferenceNoteComponent } from './income-inference-note.component';

/** Stands in for the real store-bound control the note projects, so this spec needs no store. */
@Component({
  selector: 'app-projected-control',
  template: '<p>the control</p>',
})
class ProjectedControlComponent {}

@Component({
  imports: [IncomeInferenceNoteComponent, ProjectedControlComponent],
  template: `
    <app-income-inference-note statement="No career start set." subject="your career start date">
      <app-projected-control />
    </app-income-inference-note>
  `,
})
class HostComponent {}

describe('IncomeInferenceNoteComponent (TICKET-INC-23)', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HTMLElement;

  const toggle = (): HTMLButtonElement => host.querySelector('button') as HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    host = fixture.nativeElement as HTMLElement;
  });

  it('states the assumption without opening anything', () => {
    expect(host.textContent).toContain('No career start set.');
    // The control is projected but not rendered: a note that opened every control on arrival would
    // be the settings wall again, one panel at a time.
    expect(host.querySelector('app-projected-control')).toBeNull();
  });

  it('names what the toggle changes, so three of these on a page stay distinguishable', () => {
    expect(toggle().getAttribute('aria-label')).toBe('Change your career start date');
    expect(toggle().getAttribute('aria-expanded')).toBe('false');
    expect(toggle().textContent?.trim()).toBe('Change this');
  });

  it('reveals the real control in place, and says how to put it away again', () => {
    toggle().click();
    fixture.detectChanges();

    expect(host.querySelector('app-projected-control')).not.toBeNull();
    expect(toggle().textContent?.trim()).toBe('Close');
    expect(toggle().getAttribute('aria-label')).toBe('Close your career start date');
    expect(toggle().getAttribute('aria-expanded')).toBe('true');
  });

  it('closes again on a second press', () => {
    toggle().click();
    fixture.detectChanges();
    toggle().click();
    fixture.detectChanges();

    expect(host.querySelector('app-projected-control')).toBeNull();
    expect(toggle().textContent?.trim()).toBe('Change this');
  });
});
