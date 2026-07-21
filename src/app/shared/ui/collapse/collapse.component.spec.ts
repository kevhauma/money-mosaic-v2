import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { CollapseComponent } from './collapse.component';

@Component({
  selector: 'app-host',
  imports: [CollapseComponent],
  template: `
    <mm-collapse [(open)]="open">
      <span mm-collapse-title>Why does this happen?</span>
      <p>Because of reasons.</p>
    </mm-collapse>
  `,
})
class HostComponent {
  open = false;
}

describe('CollapseComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('starts closed and projects the title/content', () => {
    const root = fixture.nativeElement.querySelector('.collapse');
    expect(root.className).not.toContain('collapse-open');
    expect(fixture.nativeElement.querySelector('button').getAttribute('aria-expanded')).toBe(
      'false',
    );
    expect(fixture.nativeElement.textContent).toContain('Why does this happen?');
    expect(fixture.nativeElement.textContent).toContain('Because of reasons.');
  });

  it('toggles open on header click and mirrors state back via [(open)]', () => {
    fixture.nativeElement.querySelector('button').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.collapse').className).toContain('collapse-open');
    expect(fixture.nativeElement.querySelector('button').getAttribute('aria-expanded')).toBe(
      'true',
    );
    expect(host.open).toBe(true);
  });

  it('toggles closed again on a second click', () => {
    const button = fixture.nativeElement.querySelector('button');
    button.click();
    fixture.detectChanges();
    button.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.collapse').className).not.toContain(
      'collapse-open',
    );
    expect(host.open).toBe(false);
  });
});
