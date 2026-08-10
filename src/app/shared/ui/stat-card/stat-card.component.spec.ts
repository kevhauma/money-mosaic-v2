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

  it('is upright by default and applies the mm-tilt hook when tilt is set', () => {
    fixture.detectChanges();
    const stat = fixture.nativeElement.querySelector('.stat');
    expect(stat.classList).not.toContain('mm-tilt-l');

    fixture.componentRef.setInput('tilt', 'a');
    fixture.detectChanges();
    expect(stat.classList).toContain('mm-tilt-l');

    fixture.componentRef.setInput('tilt', 'b');
    fixture.detectChanges();
    expect(stat.classList).toContain('mm-tilt-r');
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
    // Not a direct child: the lines sit inside the tooltip's own `mm-privacy-blur` wrapper since
    // TICKET-PRIV-02, so a hover can't hand back the figures a blurred card is hiding.
    const lines = Array.from(tooltip?.querySelectorAll('.tooltip-content div') ?? []).map((el) =>
      (el as HTMLElement).textContent?.trim(),
    );
    expect(lines).toEqual(['Earned €1,000.00', 'between Jul 1, 2025 and Jul 31, 2025']);
    expect(tooltip?.querySelector('.stat-desc')?.textContent?.trim()).toBe('+12% vs. last year');
  });

  describe('blurred input (TICKET-PRIV-01)', () => {
    const blurWrappers = (): HTMLElement[] =>
      Array.from(fixture.nativeElement.querySelectorAll('mm-privacy-blur > span'));

    it('leaves value and subLabel unblurred by default', () => {
      fixture.componentRef.setInput('subLabel', '+12% vs. last year');
      fixture.detectChanges();

      expect(blurWrappers()).toHaveLength(2);
      for (const wrapper of blurWrappers()) {
        expect(wrapper.classList).not.toContain('mm-privacy-blurred');
      }
    });

    it('masks both value and subLabel when blurred is true, leaving the label readable', () => {
      fixture.componentRef.setInput('subLabel', '+12% vs. last year');
      fixture.componentRef.setInput('blurred', true);
      fixture.detectChanges();

      expect(blurWrappers()).toHaveLength(2);
      for (const wrapper of blurWrappers()) {
        expect(wrapper.classList).toContain('mm-privacy-blurred');
      }
      expect(fixture.nativeElement.querySelector('.stat-title').textContent.trim()).toBe('Income');
      expect(fixture.nativeElement.querySelector('.stat-title mm-privacy-blur')).toBeNull();
    });

    it('masks the tooltip too, so a hover cannot hand back the figure (TICKET-PRIV-02)', () => {
      fixture.componentRef.setInput('subLabel', '+12% vs. last year');
      fixture.componentRef.setInput('tooltip', 'Jan 2025: €38,400.00');
      fixture.componentRef.setInput('blurred', true);
      fixture.detectChanges();

      const tooltipWrapper = fixture.nativeElement.querySelector(
        '.tooltip-content mm-privacy-blur > span',
      ) as HTMLElement;
      expect(tooltipWrapper.classList).toContain('mm-privacy-blurred');
      expect(tooltipWrapper.textContent).toContain('38,400');
    });

    it('leaves the tooltip sharp when the card is not blurred', () => {
      fixture.componentRef.setInput('subLabel', '+12% vs. last year');
      fixture.componentRef.setInput('tooltip', 'Jan 2025: €38,400.00');
      fixture.detectChanges();

      expect(
        (
          fixture.nativeElement.querySelector(
            '.tooltip-content mm-privacy-blur > span',
          ) as HTMLElement
        ).classList,
      ).not.toContain('mm-privacy-blurred');
    });

    it('keeps the drilldown link outside the blurred figure so it stays clickable', async () => {
      fixture.componentRef.setInput('link', '/transactions');
      fixture.componentRef.setInput('blurred', true);
      fixture.detectChanges();
      await fixture.whenStable();

      const anchor = fixture.nativeElement.querySelector('a');
      expect(anchor).toBeTruthy();
      expect(anchor.classList).not.toContain('mm-privacy-blurred');
      expect(anchor.querySelector('mm-privacy-blur > span').classList).toContain(
        'mm-privacy-blurred',
      );
    });
  });
});
