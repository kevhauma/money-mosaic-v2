import { Component, type Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PageHeaderComponent } from './page-header.component';

describe('PageHeaderComponent', () => {
  let component: PageHeaderComponent;
  let fixture: ComponentFixture<PageHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PageHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PageHeaderComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Accounts');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

// The `[actions]` slot carries the Income page's career-start control (TICKET-INC-12), so it has
// to stay optional: every other page passes no content and must render exactly as before.
@Component({
  imports: [PageHeaderComponent],
  template: `<mm-page-header title="Income" subtitle="How your income moves" />`,
})
class NoActionsHostComponent {}

@Component({
  imports: [PageHeaderComponent],
  template: `<mm-page-header title="Income" subtitle="How your income moves">
    <button actions type="button">Career started</button>
  </mm-page-header>`,
})
class WithActionsHostComponent {}

describe('PageHeaderComponent: the actions content slot', () => {
  const render = async <T>(host: Type<T>): Promise<ComponentFixture<T>> => {
    await TestBed.configureTestingModule({ imports: [host] }).compileComponents();
    const fixture = TestBed.createComponent(host);
    fixture.detectChanges();
    return fixture;
  };

  it('renders title and subtitle unchanged when a page projects nothing into it', async () => {
    const fixture = await render(NoActionsHostComponent);
    const header: HTMLElement = fixture.nativeElement;

    expect(header.querySelector('h1')?.textContent?.trim()).toBe('Income');
    expect(header.textContent).toContain('How your income moves');
    expect(header.querySelector('button')).toBeNull();
  });

  it('renders projected content alongside the title when a page does pass some', async () => {
    const fixture = await render(WithActionsHostComponent);
    const header: HTMLElement = fixture.nativeElement;

    expect(header.querySelector('h1')?.textContent?.trim()).toBe('Income');
    expect(header.querySelector('button')?.textContent?.trim()).toBe('Career started');
  });
});
