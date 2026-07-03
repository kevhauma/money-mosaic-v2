import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { ActionQueuePanelComponent } from './action-queue-panel.component';

describe('ActionQueuePanelComponent', () => {
  let fixture: ComponentFixture<ActionQueuePanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActionQueuePanelComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(ActionQueuePanelComponent);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders nothing when both queues are empty', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.card')).toBeNull();
  });
});
