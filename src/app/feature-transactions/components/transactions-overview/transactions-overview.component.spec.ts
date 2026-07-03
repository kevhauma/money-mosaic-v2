import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';

import { TransactionsOverviewComponent } from './transactions-overview.component';

describe('TransactionsOverviewComponent', () => {
  let fixture: ComponentFixture<TransactionsOverviewComponent>;

  const setup = async (queryParams: Record<string, string>): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [TransactionsOverviewComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TransactionsOverviewComponent);
    await fixture.whenStable();
  };

  it('should create with no query params', async () => {
    await setup({});
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('pre-fills the filter form from drill-down query params (FR-STAT-6)', async () => {
    await setup({ from: '2026-07-01', to: '2026-07-31', categoryId: '3', accountId: '2' });

    const filterForm = (fixture.componentInstance as unknown as { filterForm: { value: unknown } })
      .filterForm;
    expect(filterForm.value).toEqual({
      accountId: '2',
      dateFrom: '2026-07-01',
      dateTo: '2026-07-31',
      categoryId: '3',
      text: '',
      amountMin: '',
      amountMax: '',
    });
  });

  it('accepts the uncategorised sentinel from a query param', async () => {
    await setup({ categoryId: 'uncategorised' });

    const filterForm = (
      fixture.componentInstance as unknown as { filterForm: { value: { categoryId: string } } }
    ).filterForm;
    expect(filterForm.value.categoryId).toBe('uncategorised');
  });
});
