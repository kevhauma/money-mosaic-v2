import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GranularityPickerComponent } from './granularity-picker.component';

describe('GranularityPickerComponent', () => {
  let component: GranularityPickerComponent;
  let fixture: ComponentFixture<GranularityPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GranularityPickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(GranularityPickerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('value', 'month');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits valueChange when a granularity button is clicked', () => {
    const emitSpy = vi.fn();
    component.valueChange.subscribe(emitSpy);
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll('.join button');
    const dayButton = [...buttons].find((button) => button.textContent.trim() === 'Day');
    dayButton.click();

    expect(emitSpy).toHaveBeenCalledWith('day');
  });

  it('marks the button matching the current value as active', () => {
    fixture.detectChanges();

    const buttons: HTMLButtonElement[] = [
      ...fixture.nativeElement.querySelectorAll('.join button'),
    ];
    const monthButton = buttons.find((button) => button.textContent.trim() === 'Month');
    const dayButton = buttons.find((button) => button.textContent.trim() === 'Day');

    expect(monthButton?.classList.contains('btn-active')).toBe(true);
    expect(dayButton?.classList.contains('btn-active')).toBe(false);
  });
});
