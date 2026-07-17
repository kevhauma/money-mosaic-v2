import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { FieldsetComponent } from './fieldset.component';

@Component({
  selector: 'app-host',
  imports: [FieldsetComponent],
  template: `<mm-fieldset legend="Name"><input /></mm-fieldset>`,
})
class HostComponent {}

describe('FieldsetComponent', () => {
  it('renders a fieldset with a legend element by default', async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    const fixture: ComponentFixture<HostComponent> = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const fieldset = fixture.nativeElement.querySelector('fieldset');
    expect(fieldset.className).toBe('fieldset');
    const legend = fieldset.querySelector('legend');
    expect(legend.className).toBe('fieldset-legend');
    expect(legend.textContent.trim()).toBe('Name');
    expect(fieldset.querySelector('input')).toBeTruthy();
  });

  it('renders a label-for legend instead of a legend element when "for" is set', async () => {
    const fixture: ComponentFixture<FieldsetComponent> = TestBed.createComponent(FieldsetComponent);
    fixture.componentRef.setInput('legend', 'Match');
    fixture.componentRef.setInput('for', 'conditionMatch');
    fixture.detectChanges();

    const fieldset = fixture.nativeElement.querySelector('fieldset');
    expect(fieldset.querySelector('legend')).toBeNull();
    const label = fieldset.querySelector('label.fieldset-legend');
    expect(label.getAttribute('for')).toBe('conditionMatch');
    expect(label.textContent.trim()).toBe('Match');
  });

  it('passes through extra classes on the outer fieldset', async () => {
    const fixture: ComponentFixture<FieldsetComponent> = TestBed.createComponent(FieldsetComponent);
    fixture.componentRef.setInput('legend', 'Match');
    fixture.componentRef.setInput('class', 'flex-row items-center gap-2');
    fixture.detectChanges();

    expect(new Set(fixture.nativeElement.querySelector('fieldset').className.split(' '))).toEqual(
      new Set(['fieldset', 'flex-row', 'items-center', 'gap-2']),
    );
  });
});
