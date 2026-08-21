import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoansRepository } from '@/core/data-access';
import { LoansOverviewComponent } from './loans-overview.component';

const createFixture = async (): Promise<ComponentFixture<LoansOverviewComponent>> => {
  await TestBed.configureTestingModule({
    imports: [LoansOverviewComponent],
    providers: [{ provide: LoansRepository, useValue: { getAll: () => Promise.resolve([]) } }],
  }).compileComponents();

  const fixture = TestBed.createComponent(LoansOverviewComponent);
  fixture.detectChanges();
  return fixture;
};

describe('LoansOverviewComponent (TICKET-LOAN-02)', () => {
  it('renders a page header titled "Loans"', async () => {
    const fixture = await createFixture();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('mm-page-header')?.textContent).toContain('Loans');
  });

  it('renders a placeholder empty state — later LOAN-* tickets fill this page in', async () => {
    const fixture = await createFixture();
    const host = fixture.nativeElement as HTMLElement;

    expect(host.querySelector('mm-empty-state')).not.toBeNull();
    expect(host.textContent).toContain('Loan tracking is on its way');
  });
});
