import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { DropdownComponent } from './dropdown.component';

@Component({
  selector: 'app-host',
  imports: [DropdownComponent],
  template: `
    <mm-dropdown [align]="align" [menu]="menu" [contentClass]="contentClass">
      <button trigger type="button">Open</button>
      @if (menu) {
        <li><button type="button">Item one</button></li>
        <li><button type="button">Item two</button></li>
      } @else {
        <div class="calendar-stand-in">Custom content</div>
      }
    </mm-dropdown>
  `,
})
class HostComponent {
  align: 'start' | 'end' | undefined;
  menu = true;
  contentClass = '';
}

describe('DropdownComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('projects the trigger and menu items', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[trigger]').textContent.trim()).toBe('Open');
    const items: HTMLLIElement[] = [
      ...fixture.nativeElement.querySelectorAll('ul.dropdown-content li'),
    ];
    expect(items.map((item) => item.textContent?.trim())).toEqual(['Item one', 'Item two']);
  });

  it('renders a ul.menu wrapper by default', () => {
    fixture.detectChanges();

    const ul = fixture.nativeElement.querySelector('ul');
    expect(ul).toBeTruthy();
    expect(new Set(ul.className.split(' '))).toEqual(new Set(['dropdown-content', 'menu']));
    expect(fixture.nativeElement.querySelector('div.dropdown-content')).toBeNull();
  });

  it('renders a div wrapper without the menu class when menu=false', () => {
    host.menu = false;
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ul')).toBeNull();
    const div = fixture.nativeElement.querySelector('div.dropdown-content');
    expect(div).toBeTruthy();
    expect(div.className).toBe('dropdown-content');
    expect(div.textContent).toContain('Custom content');
  });

  it('adds dropdown-end when align="end"', () => {
    host.align = 'end';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.dropdown').className).toContain('dropdown-end');
  });

  it('omits dropdown-end by default', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.dropdown').className).not.toContain(
      'dropdown-end',
    );
  });

  it('passes contentClass through to the content wrapper', () => {
    host.contentClass = 'w-56';
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ul').className).toContain('w-56');
  });
});
