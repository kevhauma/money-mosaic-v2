import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { GuidesIndexComponent } from './guides-index.component';
import { GUIDES } from '../../data/guides';

describe('GuidesIndexComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GuidesIndexComponent],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('lists every guide with its title and links to its detail route', () => {
    const fixture = TestBed.createComponent(GuidesIndexComponent);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    for (const guide of GUIDES) {
      expect(text).toContain(guide.title);
    }

    const hrefs = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a')).map(
      (a) => a.getAttribute('href'),
    );
    for (const guide of GUIDES) {
      expect(hrefs).toContain(`/help/${guide.slug}`);
    }
  });
});
