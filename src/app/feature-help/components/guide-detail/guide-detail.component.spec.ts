import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GuideDetailComponent } from './guide-detail.component';
import { GUIDES } from '../../data/guides';

describe('GuideDetailComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuideDetailComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it("renders the matched guide's steps and a Try it link into the real route", () => {
    const guide = GUIDES[0];
    const fixture = TestBed.createComponent(GuideDetailComponent);
    fixture.componentRef.setInput('slug', guide.slug);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain(guide.title);
    for (const step of guide.steps) {
      expect(element.textContent).toContain(step.title);
    }

    const tryItLink = element.querySelector(`a[href="${guide.tryItRoute}"]`);
    expect(tryItLink).toBeTruthy();
  });

  it('shows an empty state for an unknown slug', () => {
    const fixture = TestBed.createComponent(GuideDetailComponent);
    fixture.componentRef.setInput('slug', 'does-not-exist');
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Guide not found');
  });
});
