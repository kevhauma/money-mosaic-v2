import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TransferReviewComponent } from './transfer-review.component';

describe('TransferReviewComponent', () => {
  let component: TransferReviewComponent;
  let fixture: ComponentFixture<TransferReviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TransferReviewComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(TransferReviewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
