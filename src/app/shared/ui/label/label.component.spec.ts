import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { LabelComponent } from './label.component';

@Component({
  selector: 'app-host',
  imports: [LabelComponent],
  template: `<mm-label as="label"><input type="text" /></mm-label>`,
})
class HostComponent {}

describe('LabelComponent', () => {
  let fixture: ComponentFixture<LabelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabelComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LabelComponent);
  });

  it('renders a <p class="label"> by default', () => {
    fixture.detectChanges();

    const p = fixture.nativeElement.querySelector('p');
    expect(p).toBeTruthy();
    expect(p.className).toBe('label');
    expect(fixture.nativeElement.querySelector('label')).toBeNull();
  });

  it('renders a <label> when as="label"', () => {
    fixture.componentRef.setInput('as', 'label');
    fixture.detectChanges();

    const label = fixture.nativeElement.querySelector('label');
    expect(label).toBeTruthy();
    expect(label.className).toBe('label');
    expect(fixture.nativeElement.querySelector('p')).toBeNull();
  });

  it('applies the for attribute to a label tag', () => {
    fixture.componentRef.setInput('as', 'label');
    fixture.componentRef.setInput('for', 'my-field');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('label').getAttribute('for')).toBe('my-field');
  });

  it('adds text-error for the error variant', () => {
    fixture.componentRef.setInput('variant', 'error');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('p').className).toBe('label text-error');
  });

  it('switches the base class to fieldset-label for the fieldset variant', () => {
    fixture.componentRef.setInput('as', 'label');
    fixture.componentRef.setInput('variant', 'fieldset');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('label').className).toBe('fieldset-label');
  });

  it('passes through extra classes', () => {
    fixture.componentRef.setInput('as', 'label');
    fixture.componentRef.setInput('class', 'cursor-pointer gap-2');
    fixture.detectChanges();

    expect(new Set(fixture.nativeElement.querySelector('label').className.split(' '))).toEqual(
      new Set(['label', 'cursor-pointer', 'gap-2']),
    );
  });

  it('projects content through into the rendered label (regression: duplicate ng-content across @switch branches silently drops projection)', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const hostFixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    hostFixture.detectChanges();

    expect(hostFixture.nativeElement.querySelector('label input[type="text"]')).toBeTruthy();
  });
});
