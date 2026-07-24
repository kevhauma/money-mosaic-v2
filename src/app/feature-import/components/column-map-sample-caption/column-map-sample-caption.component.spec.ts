import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ColumnMapSampleCaptionComponent } from './column-map-sample-caption.component';

describe('ColumnMapSampleCaptionComponent', () => {
  let fixture: ComponentFixture<ColumnMapSampleCaptionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ColumnMapSampleCaptionComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ColumnMapSampleCaptionComponent);
  });

  it('renders nothing when neither sample nor warning is set', () => {
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('');
  });

  it('shows the sample with a leading arrow', () => {
    fixture.componentRef.setInput('sample', '14/07/2026');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('→ 14/07/2026');
  });

  it('shows the duplicate warning', () => {
    fixture.componentRef.setInput('warning', 'Also mapped to Date');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Also mapped to Date');
  });

  it('shows both together', () => {
    fixture.componentRef.setInput('sample', '14/07/2026');
    fixture.componentRef.setInput('warning', 'Also mapped to Date');
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('→ 14/07/2026');
    expect(text).toContain('Also mapped to Date');
  });
});
