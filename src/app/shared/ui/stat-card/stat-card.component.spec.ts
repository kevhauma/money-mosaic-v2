import { provideRouter } from '@angular/router';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatCardComponent } from './stat-card.component';

describe('StatCardComponent', () => {
  let component: StatCardComponent;
  let fixture: ComponentFixture<StatCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(StatCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('label', 'Income');
    fixture.componentRef.setInput('value', '€1,000.00');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders as a plain stat when no link is provided', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('a')).toBeNull();
    expect(fixture.nativeElement.querySelector('.stat')).toBeTruthy();
  });

  it('renders as a link when a link is provided', async () => {
    fixture.componentRef.setInput('link', '/transactions');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('a')).toBeTruthy();
  });

  it('renders subLabel without a tooltip wrapper when no tooltip is provided', () => {
    fixture.componentRef.setInput('subLabel', '+12% vs. last year');
    fixture.detectChanges();
    const desc = fixture.nativeElement.querySelector('.stat-desc');
    expect(desc?.textContent?.trim()).toBe('+12% vs. last year');
    expect(fixture.nativeElement.querySelector('.tooltip')).toBeNull();
  });

  it('wraps subLabel in a daisyUI tooltip rendering each \\n-separated tooltip line on its own line', () => {
    fixture.componentRef.setInput('subLabel', '+12% vs. last year');
    fixture.componentRef.setInput(
      'tooltip',
      'Earned €1,000.00\nbetween Jul 1, 2025 and Jul 31, 2025',
    );
    fixture.detectChanges();
    const tooltip = fixture.nativeElement.querySelector('.tooltip');
    const lines = Array.from(tooltip?.querySelectorAll('.tooltip-content > div') ?? []).map((el) =>
      (el as HTMLElement).textContent?.trim(),
    );
    expect(lines).toEqual(['Earned €1,000.00', 'between Jul 1, 2025 and Jul 31, 2025']);
    expect(tooltip?.querySelector('.stat-desc')?.textContent?.trim()).toBe('+12% vs. last year');
  });
});
