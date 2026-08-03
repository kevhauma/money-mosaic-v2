import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { RulesRepository } from '@/core/data-access';

import { RulesOverviewComponent } from './rules-overview.component';

describe('RulesOverviewComponent', () => {
  let fixture: ComponentFixture<RulesOverviewComponent>;

  const setup = async (providers: unknown[] = []): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [RulesOverviewComponent],
      providers: [provideRouter([]), ...providers],
    }).compileComponents();

    fixture = TestBed.createComponent(RulesOverviewComponent);
  };

  it('should create', async () => {
    await setup();
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });

  describe('page header (TICKET-CAT-09)', () => {
    it('renders the view switch inside the header and nowhere in the body', async () => {
      await setup();
      fixture.detectChanges();
      const page: HTMLElement = fixture.nativeElement;

      const allTabs = Array.from(page.querySelectorAll('mm-tabs') as NodeListOf<HTMLElement>);
      expect(allTabs).toHaveLength(1);
      expect(page.querySelector('mm-page-header')?.contains(allTabs[0])).toBe(true);
    });

    it('orders the header switch · re-run rules · create', async () => {
      await setup();
      fixture.detectChanges();

      const controls = Array.from(
        fixture.nativeElement.querySelectorAll(
          'mm-page-header mm-tabs, mm-page-header button',
        ) as NodeListOf<HTMLElement>,
      )
        // The switch renders its tabs as routerLink anchors, not buttons, so nothing to filter out.
        .map((el) =>
          el.tagName === 'BUTTON' ? `button[${el.textContent?.trim()}]` : el.tagName.toLowerCase(),
        );

      expect(controls).toEqual(['mm-tabs', 'button[Re-run rules]', 'button[Add rule]']);
    });

    it("puts the switch in the start group and this tab's own controls in the end group (TICKET-UI-24)", async () => {
      await setup();
      fixture.detectChanges();
      const header = fixture.nativeElement.querySelector('mm-page-header') as HTMLElement;
      const startGroup = header.querySelector('.mm-page-actions-start');
      const endGroup = header.querySelector('.mm-page-actions');

      const tabs = header.querySelector('mm-tabs');
      const buttons = Array.from(header.querySelectorAll('button'));
      const rerun = buttons.find((b) => b.textContent?.trim() === 'Re-run rules');
      const addButton = buttons.find((b) => b.textContent?.trim() === 'Add rule');

      expect(startGroup?.contains(tabs as Node)).toBe(true);
      expect(endGroup?.contains(tabs as Node)).toBe(false);
      expect(endGroup?.contains(rerun as Node)).toBe(true);
      expect(endGroup?.contains(addButton as Node)).toBe(true);
    });

    it('renders no subtitle and no range control', async () => {
      await setup();
      fixture.detectChanges();
      const page: HTMLElement = fixture.nativeElement;

      expect(page.querySelector('mm-page-header h1')?.textContent?.trim()).toBe('Rules');
      expect(page.querySelector('mm-page-header .mm-page-title p')).toBeNull();
      expect(page.querySelector('mm-range-grouping-switcher')).toBeNull();
    });

    it('renders the share bar below the header and above the filters', async () => {
      await setup();
      await fixture.whenStable();
      fixture.detectChanges();
      const page: HTMLElement = fixture.nativeElement;

      const order = Array.from(
        page.querySelectorAll(
          'mm-page-header, app-rule-share-bar, app-rule-filters',
        ) as NodeListOf<HTMLElement>,
      ).map((el) => el.tagName.toLowerCase());

      // `app-rule-filters` only mounts once there is at least one rule, so assert the pair that is
      // always present plus the relative position of whatever else rendered.
      expect(order[0]).toBe('mm-page-header');
      expect(order[1]).toBe('app-rule-share-bar');
      expect(order.indexOf('app-rule-filters')).not.toBe(1);
    });

    it('keeps the action row wrapping at 375px', async () => {
      await setup();
      fixture.detectChanges();

      const actions = fixture.nativeElement.querySelector('div.mm-page-actions') as HTMLElement;
      expect(actions.classList.contains('flex-wrap')).toBe(true);
    });
  });

  it('shows a loading skeleton, not the "no rules yet" empty state, before RulesStore hydrates (TICKET-PERF-07)', async () => {
    const rulesRepository = { getAll: vi.fn().mockReturnValue(new Promise(() => {})) };
    await setup([{ provide: RulesRepository, useValue: rulesRepository }]);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.skeleton')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('No rules yet');
  });
});
