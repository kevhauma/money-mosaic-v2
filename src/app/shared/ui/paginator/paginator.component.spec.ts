import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PaginatorComponent } from './paginator.component';

describe('PaginatorComponent', () => {
  let component: PaginatorComponent;
  let fixture: ComponentFixture<PaginatorComponent>;

  const setInputs = (currentPage: number, totalPages: number) => {
    fixture.componentRef.setInput('currentPage', currentPage);
    fixture.componentRef.setInput('totalPages', totalPages);
    fixture.componentRef.setInput('pageRange', { start: 1, end: 50, total: 120 });
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaginatorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaginatorComponent);
    component = fixture.componentInstance;
    setInputs(2, 3);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the "showing" summary', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Showing 1–50 of 120');
  });

  it('emits currentPage - 1 when Prev is clicked', () => {
    const emitSpy = vi.fn();
    component.pageChange.subscribe(emitSpy);
    fixture.detectChanges();

    const prev = [...fixture.nativeElement.querySelectorAll('button')].find((button) =>
      button.textContent.includes('Prev'),
    );
    prev.click();

    expect(emitSpy).toHaveBeenCalledWith(1);
  });

  it('emits currentPage + 1 when Next is clicked', () => {
    const emitSpy = vi.fn();
    component.pageChange.subscribe(emitSpy);
    fixture.detectChanges();

    const next = [...fixture.nativeElement.querySelectorAll('button')].find((button) =>
      button.textContent.includes('Next'),
    );
    next.click();

    expect(emitSpy).toHaveBeenCalledWith(3);
  });

  it('hides the navigation controls when there is a single page', () => {
    setInputs(1, 1);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });
});
