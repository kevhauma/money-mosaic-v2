import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LearningOverviewComponent } from './learning-overview.component';

describe('LearningOverviewComponent', () => {
  let component: LearningOverviewComponent;
  let fixture: ComponentFixture<LearningOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LearningOverviewComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LearningOverviewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
