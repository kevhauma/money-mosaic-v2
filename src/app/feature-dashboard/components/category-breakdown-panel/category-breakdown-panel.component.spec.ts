import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideEchartsCore } from 'ngx-echarts';
import { echarts } from '@/shared/echarts';
import { CategoryBreakdownPanelComponent } from './category-breakdown-panel.component';

describe('CategoryBreakdownPanelComponent', () => {
  let fixture: ComponentFixture<CategoryBreakdownPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoryBreakdownPanelComponent],
      providers: [provideRouter([]), provideEchartsCore({ echarts })],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoryBreakdownPanelComponent);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('shows an empty state when there is no data for the range', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No expense data for this range.');
  });
});
