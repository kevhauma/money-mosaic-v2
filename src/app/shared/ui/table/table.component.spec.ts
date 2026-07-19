import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { TableComponent } from './table.component';

@Component({
  selector: 'app-host',
  imports: [TableComponent],
  template: `
    <mm-table [density]="density" [scroll]="scroll" [class]="wrapperClass">
      <thead>
        <tr>
          <th>Col</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Row</td>
        </tr>
      </tbody>
    </mm-table>
  `,
})
class HostComponent {
  density: 'compact' | 'normal' = 'normal';
  scroll: 'x' | 'auto' = 'x';
  wrapperClass = '';
}

describe('TableComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('renders a table with the base class and projects thead/tbody content', () => {
    fixture.detectChanges();

    const table = fixture.nativeElement.querySelector('table');
    expect(table.className).toBe('table');
    expect(table.querySelector('th').textContent).toBe('Col');
    expect(table.querySelector('td').textContent).toBe('Row');
  });

  it('adds table-xs for compact density', () => {
    host.density = 'compact';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('table').className).toBe('table table-xs');
  });

  it('wraps in an overflow-x-auto bordered div by default', () => {
    fixture.detectChanges();

    const wrapper = fixture.nativeElement.querySelector('div');
    expect(new Set(wrapper.className.split(' '))).toEqual(
      new Set(['mm-table-wrap', 'rounded-box', 'border', 'border-base-300', 'overflow-x-auto']),
    );
  });

  it('switches to overflow-auto when scroll="auto"', () => {
    host.scroll = 'auto';
    fixture.detectChanges();

    const wrapper = fixture.nativeElement.querySelector('div');
    expect(wrapper.className).toContain('overflow-auto');
    expect(wrapper.className).not.toContain('overflow-x-auto');
  });

  it('passes extra classes through to the wrapper', () => {
    host.wrapperClass = 'max-h-96 bg-base-100';
    fixture.detectChanges();

    const wrapper = fixture.nativeElement.querySelector('div');
    expect(wrapper.className).toContain('max-h-96');
    expect(wrapper.className).toContain('bg-base-100');
  });
});
