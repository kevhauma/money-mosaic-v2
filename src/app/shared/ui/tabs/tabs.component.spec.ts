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
