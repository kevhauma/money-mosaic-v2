import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { FaqPageComponent } from './faq-page.component';
import { FAQ_ENTRIES } from '../../data/faq';

describe('FaqPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FaqPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  describe('page header (TICKET-PUB-09)', () => {
    it('carries a "Back to how-to\'s" routerLink to /help in the start group', () => {
      const fixture = TestBed.createComponent(FaqPageComponent);
      fixture.detectChanges();
      const page: HTMLElement = fixture.nativeElement;

      // A real href, not a history.back() handler — a deep-linked visitor must land on the list.
      const back = page.querySelector('mm-page-header a[href="/help"]');
      expect(back?.textContent?.trim()).toBe("Back to how-to's");
      expect(page.querySelector('.mm-page-actions-start')?.contains(back as Node)).toBe(true);
      expect(page.querySelector('.mm-page-actions')?.contains(back as Node)).toBe(false);
    });

    it('keeps its own title and no subtitle, and wraps at 375px (TICKET-UI-22)', () => {
      const fixture = TestBed.createComponent(FaqPageComponent);
      fixture.detectChanges();
      const page: HTMLElement = fixture.nativeElement;

      expect(page.querySelector('mm-page-header h1')?.textContent?.trim()).toBe('FAQ');
      expect(page.querySelector('mm-page-header .mm-page-title p')).toBeNull();
      expect(page.querySelector('div.mm-page-actions-start')?.classList.contains('flex-wrap')).toBe(
        true,
      );
      expect(page.querySelector('div.mm-page-actions')?.classList.contains('flex-wrap')).toBe(true);
    });
  });

  it('lists every FAQ question', () => {
    const fixture = TestBed.createComponent(FaqPageComponent);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const entry of FAQ_ENTRIES) {
      expect(text).toContain(entry.question);
    }
  });

  it('expands an entry on click to reveal its answer, and collapses again on a second click', () => {
    const fixture = TestBed.createComponent(FaqPageComponent);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const firstButton = element.querySelector('button') as HTMLButtonElement;
    expect(firstButton.getAttribute('aria-expanded')).toBe('false');

    firstButton.click();
    fixture.detectChanges();
    expect(firstButton.getAttribute('aria-expanded')).toBe('true');
    expect(element.textContent).toContain(FAQ_ENTRIES[0].answer);

    firstButton.click();
    fixture.detectChanges();
    expect(firstButton.getAttribute('aria-expanded')).toBe('false');
  });
});
