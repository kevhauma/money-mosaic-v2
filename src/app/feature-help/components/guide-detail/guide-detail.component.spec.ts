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

  describe('page header (TICKET-PUB-09)', () => {
    const renderGuide = (slug = GUIDES[0].slug) => {
      const fixture = TestBed.createComponent(GuideDetailComponent);
      fixture.componentRef.setInput('slug', slug);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    };

    it('carries a "Back to how-to\'s" routerLink to /help in the start group', () => {
      const page = renderGuide();

      // A real href, not a history.back() handler — a guide opened from a feature page's "Guide"
      // button must still land on the list.
      const back = page.querySelector('mm-page-header a[href="/help"]');
      expect(back?.textContent?.trim()).toBe("Back to how-to's");
      expect(page.querySelector('.mm-page-actions-start')?.contains(back as Node)).toBe(true);
      expect(page.querySelector('.mm-page-actions')?.contains(back as Node)).toBe(false);
    });

    it("keeps the guide's own title and no subtitle, and wraps at 375px (TICKET-UI-22)", () => {
      const page = renderGuide();

      expect(page.querySelector('mm-page-header h1')?.textContent?.trim()).toBe(GUIDES[0].title);
      expect(page.querySelector('mm-page-header .mm-page-title p')).toBeNull();
      expect(page.querySelector('div.mm-page-actions-start')?.classList.contains('flex-wrap')).toBe(
        true,
      );
      expect(page.querySelector('div.mm-page-actions')?.classList.contains('flex-wrap')).toBe(true);
    });

    it('offers a route back to /help from the guide-not-found empty state, so a bad slug is no dead end', () => {
      const page = renderGuide('does-not-exist');

      expect(page.querySelector('mm-page-header')).toBeNull();
      expect(page.querySelector('mm-empty-state a[href="/help"]')?.textContent?.trim()).toBe(
        "Back to how-to's",
      );
    });
  });
});
