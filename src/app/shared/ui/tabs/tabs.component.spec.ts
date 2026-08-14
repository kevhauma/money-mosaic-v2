import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TabsComponent, type TabDefinition } from './tabs.component';

const VALUE_TABS: TabDefinition[] = [
  { label: 'One', value: 'one' },
  { label: 'Two', value: 'two' },
];

describe('TabsComponent', () => {
  let component: TabsComponent;
  let fixture: ComponentFixture<TabsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabsComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TabsComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('tabs', VALUE_TABS);
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('applies tab-active to exactly the tab matching selected', () => {
    fixture.componentRef.setInput('selected', 'one');
    fixture.detectChanges();

    const buttons: HTMLButtonElement[] = [...fixture.nativeElement.querySelectorAll('button.tab')];
    expect(
      buttons.find((b) => b.textContent?.trim() === 'One')?.classList.contains('tab-active'),
    ).toBe(true);
    expect(
      buttons.find((b) => b.textContent?.trim() === 'Two')?.classList.contains('tab-active'),
    ).toBe(false);
  });

  it('updates selected when a tab is clicked', () => {
    fixture.componentRef.setInput('selected', 'one');
    fixture.detectChanges();

    const buttons: HTMLButtonElement[] = [...fixture.nativeElement.querySelectorAll('button.tab')];
    buttons.find((b) => b.textContent?.trim() === 'Two')?.click();
    fixture.detectChanges();

    expect(component.selected()).toBe('two');
    const twoButton = buttons.find((b) => b.textContent?.trim() === 'Two');
    expect(twoButton?.classList.contains('tab-active')).toBe(true);
  });

  it('applies the variant modifier class', () => {
    fixture.componentRef.setInput('variant', 'box');
    fixture.detectChanges();

    const tablist = fixture.nativeElement.querySelector('[role="tablist"]');
    expect(tablist.classList.contains('tabs-box')).toBe(true);
  });

  it('omits the variant modifier class when unset', () => {
    fixture.detectChanges();

    const tablist = fixture.nativeElement.querySelector('[role="tablist"]');
    expect(tablist.className).toBe('tabs');
  });

  describe('disabled', () => {
    const buttons = (): HTMLButtonElement[] => [
      ...fixture.nativeElement.querySelectorAll('button.tab'),
    ];

    it('adds no disabled markup when it is not set', () => {
      fixture.componentRef.setInput('selected', 'one');
      fixture.detectChanges();

      const tablist = fixture.nativeElement.querySelector('[role="tablist"]');
      expect(tablist.classList.contains('opacity-60')).toBe(false);
      expect(buttons().every((b) => b.getAttribute('aria-disabled') === null)).toBe(true);
      expect(buttons().every((b) => b.getAttribute('tabindex') === null)).toBe(true);
    });

    it('marks the tabs inert and takes them out of the tab order', () => {
      fixture.componentRef.setInput('selected', 'one');
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      expect(buttons().every((b) => b.getAttribute('aria-disabled') === 'true')).toBe(true);
      expect(buttons().every((b) => b.getAttribute('tabindex') === '-1')).toBe(true);
      expect(
        fixture.nativeElement
          .querySelector('[role="tablist"]')
          .classList.contains('pointer-events-none'),
      ).toBe(true);
    });

    /**
     * The reason this uses `aria-disabled` rather than the native attribute: daisyUI styles the
     * active pill as `.tab-active:not(.tab-disabled,[disabled])`, so either of those would make
     * both tabs look identical and the control would stop saying which option is in effect.
     */
    it('still shows which tab is active, and dims the tablist rather than the tabs', () => {
      fixture.componentRef.setInput('selected', 'one');
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      expect(buttons().map((b) => b.classList.contains('tab-active'))).toEqual([true, false]);
      expect(buttons().some((b) => b.classList.contains('tab-disabled'))).toBe(false);
      expect(buttons().some((b) => b.disabled)).toBe(false);
      expect(
        fixture.nativeElement.querySelector('[role="tablist"]').classList.contains('opacity-60'),
      ).toBe(true);
    });

    it('refuses a click that reaches it anyway', () => {
      fixture.componentRef.setInput('selected', 'one');
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();

      // The tablist's `pointer-events-none` is a paint-level guard only — a synthetic or
      // programmatic click still lands, so the handler has to refuse the value itself.
      buttons()[1].click();
      fixture.detectChanges();

      expect(component.selected()).toBe('one');
    });
  });

  it('renders link tabs as routerLink anchors instead of buttons', () => {
    fixture.componentRef.setInput('tabs', [
      { label: 'Categories', value: 'categories', link: '/categories', exact: true },
      { label: 'Rules', value: 'rules', link: '/categories/rules' },
    ]);
    fixture.detectChanges();

    const anchors: HTMLAnchorElement[] = [...fixture.nativeElement.querySelectorAll('a.tab')];
    expect(anchors.length).toBe(2);
    expect(fixture.nativeElement.querySelectorAll('button.tab').length).toBe(0);
  });
});
