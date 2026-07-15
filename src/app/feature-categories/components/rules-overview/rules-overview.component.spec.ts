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

  it('shows a loading skeleton, not the "no rules yet" empty state, before RulesStore hydrates (TICKET-PERF-07)', async () => {
    const rulesRepository = { getAll: vi.fn().mockReturnValue(new Promise(() => {})) };
    await setup([{ provide: RulesRepository, useValue: rulesRepository }]);

    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.skeleton')).not.toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('No rules yet');
  });
});
