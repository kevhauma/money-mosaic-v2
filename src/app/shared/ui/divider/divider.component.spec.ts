import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { DividerComponent } from './divider.component';

@Component({
  selector: 'app-host',
  imports: [DividerComponent],
  template: `<mm-divider [orientation]="orientation" [class]="extraClass"
    >Joint account</mm-divider
  >`,
})
class HostComponent {
  orientation: 'horizontal' | 'vertical' = 'horizontal';
  extraClass = '';
}

describe('DividerComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('renders the bare divider class by default and projects the label', () => {
    fixture.detectChanges();

    const div = fixture.nativeElement.querySelector('div');
    expect(div.className).toBe('divider');
    expect(div.textContent.trim()).toBe('Joint account');
  });

  it('adds divider-horizontal for a vertical-line orientation', () => {
    host.orientation = 'vertical';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('div').className).toContain('divider-horizontal');
  });

  it('passes through extra classes', () => {
    host.extraClass = 'my-2';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('div').className).toContain('my-2');
  });
});
