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

// The `[actions]` slot carries every page's own page-level controls (TICKET-UI-22), so it has
// to stay optional: a page with none must render exactly as a bare title row.
@Component({
  imports: [PageHeaderComponent],
  template: `<mm-page-header title="Income" />`,
})
class TitleOnlyHostComponent {}

@Component({
  imports: [PageHeaderComponent],
  template: `<mm-page-header title="Income">
    <button actions type="button">Career started</button>
  </mm-page-header>`,
})
class WithActionsHostComponent {}

@Component({
  imports: [PageHeaderComponent],
  template: `<mm-page-header title="Income">
    <span title-adornment>beta</span>
    <button actions type="button">Career started</button>
  </mm-page-header>`,
})
class WithAdornmentHostComponent {}

describe('PageHeaderComponent: the header contract', () => {
  const render = async <T>(host: Type<T>): Promise<ComponentFixture<T>> => {
    await TestBed.configureTestingModule({ imports: [host] }).compileComponents();
    const fixture = TestBed.createComponent(host);
    fixture.detectChanges();
    return fixture;
  };

  it('renders the title alone when a page projects nothing into it', async () => {
    const fixture = await render(TitleOnlyHostComponent);
    const header: HTMLElement = fixture.nativeElement;

    expect(header.querySelector('h1')?.textContent?.trim()).toBe('Income');
    expect(header.querySelector('button')).toBeNull();
  });

  it('renders projected actions alongside the title when a page does pass some', async () => {
    const fixture = await render(WithActionsHostComponent);
    const header: HTMLElement = fixture.nativeElement;

    expect(header.querySelector('h1')?.textContent?.trim()).toBe('Income');
    expect(header.querySelector('button')?.textContent?.trim()).toBe('Career started');
  });

  it('projects [title-adornment] beside the heading, not into the action group', async () => {
    const fixture = await render(WithAdornmentHostComponent);
    const header: HTMLElement = fixture.nativeElement;

    const adornment = header.querySelector('[title-adornment]');
    const titleBlock = header.querySelector('.mm-page-title');
    expect(adornment).not.toBeNull();
    // The adornment shares the title block's row with the heading, not the action group.
    expect(titleBlock?.contains(adornment as Node)).toBe(true);
    expect(titleBlock?.querySelector('h1')?.textContent?.trim()).toBe('Income');
  });

  it('projects [actions] into the right-hand group, not the title block', async () => {
    const fixture = await render(WithAdornmentHostComponent);
    const header: HTMLElement = fixture.nativeElement;

    const action = header.querySelector('button[actions]');
    const titleBlock = header.querySelector('.mm-page-title');
    expect(action).not.toBeNull();
    expect(titleBlock?.contains(action as Node)).toBe(false);
    expect(header.querySelector('.mm-page-actions')?.contains(action as Node)).toBe(true);
  });

  it('renders no caption paragraph for any input combination (TICKET-UI-22: no subtitles)', async () => {
    for (const host of [
      TitleOnlyHostComponent,
      WithActionsHostComponent,
      WithAdornmentHostComponent,
    ]) {
      TestBed.resetTestingModule();
      const fixture = await render(host);
      const header: HTMLElement = fixture.nativeElement;

      expect(header.querySelector('p')).toBeNull();
      expect(header.querySelector('.mm-text-caption')).toBeNull();
    }
  });

  it('wraps both the outer row and the action group, so four controls degrade rather than overflow at 375px', async () => {
    const fixture = await render(WithActionsHostComponent);
    const header: HTMLElement = fixture.nativeElement;

    // Asserted through the class `mm-flex [wrap]="true"` emits — on the primitive's inner div, not
    // its host, hence the `div` qualifiers. Both matter: the outer row drops the action group onto
    // its own line, and the group itself wraps its controls once there are more than a narrow
    // screen fits — without the second one, a four-control header overflows.
    expect(header.querySelector('mm-flex > div')?.classList.contains('flex-wrap')).toBe(true);
    expect(header.querySelector('div.mm-page-actions')?.classList.contains('flex-wrap')).toBe(true);
  });
});
