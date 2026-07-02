import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { RulesOverviewComponent } from './rules-overview.component';

describe('RulesOverviewComponent', () => {
  let component: RulesOverviewComponent;
  let fixture: ComponentFixture<RulesOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RulesOverviewComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(RulesOverviewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
