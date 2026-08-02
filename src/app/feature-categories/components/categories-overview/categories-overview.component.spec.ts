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
