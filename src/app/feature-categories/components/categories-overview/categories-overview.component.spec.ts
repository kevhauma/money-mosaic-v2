import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { CategoriesRepository } from '@/core/data-access';

import { CategoriesOverviewComponent } from './categories-overview.component';

describe('CategoriesOverviewComponent', () => {
  let fixture: ComponentFixture<CategoriesOverviewComponent>;

  const setup = async (providers: unknown[] = []): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [CategoriesOverviewComponent],
      providers: [provideRouter([]), ...providers],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriesOverviewComponent);
  };

  it('should create', async () => {
    await setup();
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('page header (TICKET-CAT-09)', () => {
    const headerControls = (): string[] =>
      Array.from(
        fixture.nativeElement.querySelectorAll(
          'mm-page-header mm-tabs, mm-page-header input[type="checkbox"], mm-page-header button',
        ) as NodeListOf<HTMLElement>,
      ).map((el) =>
        el.tagName === 'BUTTON' ? `button[${el.textContent?.trim()}]` : el.tagName.toLowerCase(),
      );

    it('renders the view switch inside the header and nowhere in the body', async () => {
      await setup();
      fixture.detectChanges();
      const page: HTMLElement = fixture.nativeElement;
      const header = page.querySelector('mm-page-header');

      const allTabs = Array.from(page.querySelectorAll('mm-tabs') as NodeListOf<HTMLElement>);
      expect(allTabs).toHaveLength(1);
      expect(header?.contains(allTabs[0])).toBe(true);
    });

    it('orders the header switch · show-archived · create', async () => {
      await setup();
      fixture.detectChanges();

      expect(headerControls()).toEqual(['mm-tabs', 'input', 'button[Add category]']);
    });

    it("puts the switch in the start group and this tab's own controls in the end group (TICKET-UI-24)", async () => {
      await setup();
      fixture.detectChanges();
      const header = fixture.nativeElement.querySelector('mm-page-header') as HTMLElement;
      const startGroup = header.querySelector('.mm-page-actions-start');
      const endGroup = header.querySelector('.mm-page-actions');

      const tabs = header.querySelector('mm-tabs');
      const toggle = header.querySelector('input[type="checkbox"]');
      const addButton = Array.from(header.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'Add category',
      );

      expect(startGroup?.contains(tabs as Node)).toBe(true);
      expect(endGroup?.contains(tabs as Node)).toBe(false);
      expect(endGroup?.contains(toggle as Node)).toBe(true);
      expect(endGroup?.contains(addButton as Node)).toBe(true);
    });

    it('keeps the switch routing between /categories and /rules', async () => {
      await setup();
      fixture.detectChanges();

      const hrefs = Array.from(
        fixture.nativeElement.querySelectorAll(
          'mm-page-header mm-tabs a',
        ) as NodeListOf<HTMLAnchorElement>,
      ).map((a) => a.getAttribute('href'));

      expect(hrefs).toEqual(['/categories', '/categories/rules']);
    });

    it('keeps the action row wrapping at 375px', async () => {
      await setup();
      fixture.detectChanges();

      const actions = fixture.nativeElement.querySelector('div.mm-page-actions') as HTMLElement;
      expect(actions.classList.contains('flex-wrap')).toBe(true);
    });
  });

  it('renders no subtitle and no range control — the page has no date-scoped content (TICKET-UI-22/UI-23)', async () => {
    await setup();
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;

    expect(page.querySelector('mm-page-header h1')?.textContent?.trim()).toBe('Categories');
    expect(page.querySelector('mm-page-header .mm-page-title p')).toBeNull();
    expect(page.querySelector('mm-range-grouping-switcher')).toBeNull();
  });

  it('shows a loading skeleton, not the "no categories yet" empty state, before CategoriesStore hydrates (TICKET-PERF-07)', async () => {
    const categoriesRepository = { getAll: vi.fn().mockReturnValue(new Promise(() => {})) };
    await setup([{ provide: CategoriesRepository, useValue: categoriesRepository }]);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.skeleton')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('No categories yet');
  });
});
