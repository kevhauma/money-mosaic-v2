import { TestBed } from '@angular/core/testing';
import { FaqPageComponent } from './faq-page.component';
import { FAQ_ENTRIES } from '../../data/faq';

describe('FaqPageComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FaqPageComponent],
    }).compileComponents();
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
