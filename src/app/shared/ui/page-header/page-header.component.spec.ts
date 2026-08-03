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

// The two action slots carry every page's own page-level controls (TICKET-UI-22/UI-24), so both
// have to stay optional: a page with none must render exactly as a bare title row.
@Component({
  imports: [PageHeaderComponent],
  template: `<mm-page-header title="Income" />`,
})
class TitleOnlyHostComponent {}

@Component({
  imports: [PageHeaderComponent],
  template: `<mm-page-header title="Income">
    <button actions-end type="button">Career started</button>
  </mm-page-header>`,
})
class WithActionsHostComponent {}

// Both sections at once: a scope control beside the title, an action over on the right
// (TICKET-UI-24) — the shape /accounts and /dashboard now render.
@Component({
  imports: [PageHeaderComponent],
  template: `<mm-page-header title="Income">
    <span actions-start>this month</span>
    <button actions-end type="button">Career started</button>
  </mm-page-header>`,
})
class WithBothSectionsHostComponent {}

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

  it('projects [actions-start] beside the heading, not into the end group (TICKET-UI-24)', async () => {
    const fixture = await render(WithBothSectionsHostComponent);
    const header: HTMLElement = fixture.nativeElement;

    const scopeControl = header.querySelector('[actions-start]');
    const startGroup = header.querySelector('.mm-page-actions-start');
    expect(scopeControl).not.toBeNull();
    // The scope control shares the start group's row with the heading, and never leaks right.
    expect(startGroup?.contains(scopeControl as Node)).toBe(true);
    expect(startGroup?.querySelector('h1')?.textContent?.trim()).toBe('Income');
    expect(header.querySelector('.mm-page-actions')?.contains(scopeControl as Node)).toBe(false);
  });

  it('projects [actions-end] into the right-hand group, not the start group (TICKET-UI-24)', async () => {
    const fixture = await render(WithBothSectionsHostComponent);
    const header: HTMLElement = fixture.nativeElement;

    const action = header.querySelector('button[actions-end]');
    expect(action).not.toBeNull();
    expect(header.querySelector('.mm-page-actions-start')?.contains(action as Node)).toBe(false);
    expect(header.querySelector('.mm-page-actions')?.contains(action as Node)).toBe(true);
  });

  it('orders the header title · [actions-start] ‖ [actions-end] (TICKET-UI-24)', async () => {
    const fixture = await render(WithBothSectionsHostComponent);
    const header: HTMLElement = fixture.nativeElement;

    const order = Array.from(
      header.querySelectorAll('h1, [actions-start], [actions-end]') as NodeListOf<HTMLElement>,
    ).map((el) => el.textContent?.trim());

    expect(order).toEqual(['Income', 'this month', 'Career started']);
  });

  it('renders no caption paragraph for any input combination (TICKET-UI-22: no subtitles)', async () => {
    for (const host of [
      TitleOnlyHostComponent,
      WithActionsHostComponent,
      WithBothSectionsHostComponent,
    ]) {
      TestBed.resetTestingModule();
      const fixture = await render(host);
      const header: HTMLElement = fixture.nativeElement;

      expect(header.querySelector('p')).toBeNull();
      expect(header.querySelector('.mm-text-caption')).toBeNull();
    }
  });

  it('keeps the bar sticky at the top, under the drawer and the overlays (TICKET-UI-25)', async () => {
    const fixture = await render(WithBothSectionsHostComponent);
    const bar = (fixture.nativeElement as HTMLElement).querySelector('.mm-page-header-bar');

    // Asserted class by class so a later utility reshuffle can't silently drop one: `z-10` is the
    // deliberate rung — below the drawer's `z-20`, far below daisyUI's `z-999` overlays.
    expect(bar).not.toBeNull();
    for (const cls of ['navbar', 'sticky', 'top-0', 'z-10']) {
      expect(bar?.classList.contains(cls)).toBe(true);
    }
  });

  it('wraps the outer row and both action groups, so four controls degrade rather than overflow at 375px', async () => {
    const fixture = await render(WithBothSectionsHostComponent);
    const header: HTMLElement = fixture.nativeElement;

    // Asserted through the class `mm-flex [wrap]="true"` emits — on the primitive's inner div, not
    // its host, hence the `div` qualifiers. All three matter: the outer row drops the end group
    // onto its own line, and each group wraps its own controls once there are more than a narrow
    // screen fits — without those, a four-control header overflows (TICKET-UI-24).
    expect(header.querySelector('mm-flex > div')?.classList.contains('flex-wrap')).toBe(true);
    expect(header.querySelector('div.mm-page-actions-start')?.classList.contains('flex-wrap')).toBe(
      true,
    );
    expect(header.querySelector('div.mm-page-actions')?.classList.contains('flex-wrap')).toBe(true);
  });
});
