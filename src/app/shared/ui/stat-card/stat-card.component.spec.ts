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
});
