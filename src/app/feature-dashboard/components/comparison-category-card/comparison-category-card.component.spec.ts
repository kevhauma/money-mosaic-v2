import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import type { CategoryComparisonVm } from '../../category-comparison-vm';
import { ComparisonCategoryCardComponent } from './comparison-category-card.component';

const baseVm = (overrides: Partial<CategoryComparisonVm> = {}): CategoryComparisonVm => ({
  categoryId: 1,
  name: 'Groceries',
  color: '#ff0000',
  bars: [],
  formattedFigures: { average: '€100.00', highest: '€150.00', lowest: '€50.00' },
  unchangedNote: null,
  deltaLabel: null,
  deltaColor: undefined,
  deltaIcon: undefined,
  ...overrides,
});

describe('ComparisonCategoryCardComponent', () => {
  let fixture: ComponentFixture<ComparisonCategoryCardComponent>;

  const setup = async (
    category: CategoryComparisonVm,
    tiltDirection: 'l' | 'r' = 'l',
  ): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [ComparisonCategoryCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(ComparisonCategoryCardComponent);
    fixture.componentRef.setInput('category', category);
    fixture.componentRef.setInput('tiltDirection', tiltDirection);
    fixture.detectChanges();
  };

  it('renders the category name and avg/high/low footer', async () => {
    await setup(baseVm());

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Groceries');
    expect(text).toContain('Avg €100.00');
    expect(text).toContain('High €150.00');
    expect(text).toContain('Low €50.00');
  });

  // TICKET-STAT-44 — a fixed cost collapses Avg/High/Low onto one figure over a flat 0% delta,
  // which reads as a card that failed to compute rather than as a bill that never changes.
  it('states the one figure once when it never moved, instead of printing it three times', async () => {
    await setup(
      baseVm({ formattedFigures: null, unchangedNote: '€950.00 every period — unchanged.' }),
    );

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('€950.00 every period — unchanged.');
    expect(text).not.toContain('Avg');
    expect(text).not.toContain('High');
    expect(text).not.toContain('Low');
  });

  it('renders no delta badge when deltaLabel is null', async () => {
    await setup(baseVm());

    expect(fixture.nativeElement.querySelector('ng-icon')).toBeNull();
  });

  it('renders the delta label with the VM-supplied color/icon directly, no local derivation', async () => {
    await setup(
      baseVm({ deltaLabel: '12%', deltaColor: 'warning', deltaIcon: 'tablerTriangleFill' }),
    );

    const badgeText = fixture.nativeElement.textContent as string;
    expect(badgeText).toContain('12%');
    const icon = fixture.nativeElement.querySelector('ng-icon');
    expect(icon).not.toBeNull();
  });

  it('applies the left-tilt class when tiltDirection is "l"', async () => {
    await setup(baseVm(), 'l');
    expect(fixture.nativeElement.querySelector('.mm-tilt-l')).not.toBeNull();
  });

  it('applies the right-tilt class when tiltDirection is "r"', async () => {
    await setup(baseVm(), 'r');
    expect(fixture.nativeElement.querySelector('.mm-tilt-r')).not.toBeNull();
  });

  it('links each bar to /transactions with its drill-down query params', async () => {
    await setup(
      baseVm({
        bars: [
          {
            key: '2026-07-01',
            formattedTotal: '€10.00',
            periodLabel: 'July 2026',
            tooltipLabel: 'July 2026\n€10.00',
            heightPercent: 50,
            isSelected: true,
            queryParams: { from: '2026-07-01', to: '2026-07-31' },
          },
        ],
      }),
    );

    const anchor = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(anchor.getAttribute('data-tip')).toBe('July 2026\n€10.00');
    expect(anchor.getAttribute('href')).toContain('/transactions');
  });
});
