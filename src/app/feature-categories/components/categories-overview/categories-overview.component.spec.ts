import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { CategoriesOverviewComponent } from './categories-overview.component';

describe('CategoriesOverviewComponent', () => {
  let component: CategoriesOverviewComponent;
  let fixture: ComponentFixture<CategoriesOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CategoriesOverviewComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CategoriesOverviewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
