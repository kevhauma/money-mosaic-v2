import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoadingSkeletonComponent } from './loading-skeleton.component';

describe('LoadingSkeletonComponent', () => {
  let fixture: ComponentFixture<LoadingSkeletonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoadingSkeletonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoadingSkeletonComponent);
  });

  it('renders 3 skeleton rows by default', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.skeleton')).toHaveLength(3);
  });

  it('renders the requested number of rows', () => {
    fixture.componentRef.setInput('rows', 5);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.skeleton')).toHaveLength(5);
  });

  it('forwards a class input onto the wrapper', () => {
    fixture.componentRef.setInput('class', 'mt-2');
    fixture.detectChanges();
    const wrapper = fixture.nativeElement.querySelector('div') as HTMLElement;
    expect(wrapper.classList).toContain('mt-2');
  });
});
