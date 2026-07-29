import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { vi } from 'vitest';
import { linkControlToSetting } from './link-control-to-setting';

/** Stands in for a store signal plus its setter, so the test can drive both directions. */
@Component({ template: '' })
class HostComponent {
  readonly control = new FormControl('initial', { nonNullable: true });
  readonly stored = signal('initial');
  readonly writes: string[] = [];

  constructor() {
    linkControlToSetting(
      this.control,
      () => this.stored(),
      (value) => {
        this.writes.push(value);
        this.stored.set(value);
      },
    );
  }
}

describe('linkControlToSetting', () => {
  let fixture: ComponentFixture<HostComponent>;

  const host = (): HostComponent => {
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  it('pushes a user edit through to the setting', () => {
    const component = host();

    component.control.setValue('typed');

    expect(component.writes).toEqual(['typed']);
    expect(component.stored()).toBe('typed');
  });

  it('pulls a setting changed elsewhere back into the control', () => {
    const component = host();

    component.stored.set('from elsewhere');
    fixture.detectChanges();

    expect(component.control.value).toBe('from elsewhere');
  });

  it('does not echo the pulled value back to the setting (no write loop)', () => {
    const component = host();

    component.stored.set('from elsewhere');
    fixture.detectChanges();

    expect(component.writes).toEqual([]);
  });

  it('leaves the control untouched when the setting already matches', () => {
    const component = host();
    const setValue = vi.spyOn(component.control, 'setValue');

    component.stored.set('initial');
    fixture.detectChanges();

    expect(setValue).not.toHaveBeenCalled();
  });

  it('stops writing once the owning component is destroyed', () => {
    const component = host();

    fixture.destroy();
    component.control.setValue('after destroy');

    expect(component.writes).toEqual([]);
  });
});
