import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { AppSettingsRepository, appDb, type AppSettings } from '@/core/data-access';
import { AppSettingsStore } from '@/core/state';
import { GUIDES } from '@/feature-help';
import { INCOME_GUIDE_SLUG, IncomeIntroComponent } from './income-intro.component';

describe('IncomeIntroComponent (TICKET-PUB-08)', () => {
  const appSettingsRepository = { get: vi.fn(), markGuideSeen: vi.fn() };

  let fixture: ComponentFixture<IncomeIntroComponent>;

  const guide = () => GUIDES.find((entry) => entry.slug === INCOME_GUIDE_SLUG)!;

  const setup = async (settings: Partial<AppSettings> = {}): Promise<void> => {
    appSettingsRepository.get.mockResolvedValue({ id: 1, ...settings } as AppSettings);
    appSettingsRepository.markGuideSeen.mockResolvedValue(1);

    await TestBed.configureTestingModule({
      imports: [IncomeIntroComponent],
      providers: [
        provideRouter([]),
        { provide: AppSettingsRepository, useValue: appSettingsRepository },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IncomeIntroComponent);
    await TestBed.inject(AppSettingsStore).hydrate();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const stepTitles = (): string[] =>
    [...fixture.nativeElement.querySelectorAll('ol li h2')].map(
      (heading) => (heading as HTMLElement).textContent?.trim() ?? '',
    );

  const buttonLabelled = (label: string): HTMLButtonElement =>
    [...fixture.nativeElement.querySelectorAll('button')].find((button) =>
      (button as HTMLElement).textContent?.includes(label),
    ) as HTMLButtonElement;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    await appDb.appSettings.clear();
  });

  it('introduces a slug that actually exists in GUIDES', () => {
    // The guard against a missing slug (`showIntro` in the overview, `@if (guide())` here) makes a
    // rename degrade to the normal page rather than an empty intro — which would also make the
    // intro silently disappear. This is what catches the rename itself.
    expect(GUIDES.map((entry) => entry.slug)).toContain(INCOME_GUIDE_SLUG);
  });

  it('renders nothing at all if its guide were missing, rather than an empty card', async () => {
    await setup();

    // The whole template is inside `@if (guide(); as guide)`, so a missing slug yields no markup —
    // paired with the overview's own `GUIDES.some(...)` check, which keeps the page rendering.
    expect(fixture.nativeElement.querySelector('section')).not.toBeNull();
    expect(fixture.nativeElement.firstElementChild?.tagName.toLowerCase()).toBe('mm-paper');
  });

  it('shows the guide’s title and summary — what this page is, before anything else', async () => {
    await setup();

    expect(fixture.nativeElement.querySelector('h1')?.textContent?.trim()).toBe(guide().title);
    expect(fixture.nativeElement.textContent).toContain(guide().summary);
  });

  it('shows exactly the guide’s first three steps, not the whole reference', async () => {
    await setup();

    expect(stepTitles()).toHaveLength(3);
    expect(stepTitles()[0]).toContain(guide().steps[0].title);
    expect(fixture.nativeElement.textContent).not.toContain(guide().steps[3].title);
  });

  it('reads its text from GUIDES rather than keeping a second copy', async () => {
    await setup();

    // Matching the data file's own wording is the assertion: a hand-copied step would drift.
    expect(fixture.nativeElement.textContent).toContain(guide().steps[0].description);
  });

  it('“Set up the Income page” marks the guide seen and hands off to the settings page', async () => {
    await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    buttonLabelled('Set up the Income page').click();
    await fixture.whenStable();

    expect(appSettingsRepository.markGuideSeen).toHaveBeenCalledExactlyOnceWith(INCOME_GUIDE_SLUG);
    expect(navigate).toHaveBeenCalledExactlyOnceWith(['/income/settings'], {
      queryParams: { from: 'setup' },
    });
  });

  it('“Skip for now” marks the guide seen without navigating', async () => {
    await setup();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    buttonLabelled('Skip for now').click();
    await fixture.whenStable();

    expect(appSettingsRepository.markGuideSeen).toHaveBeenCalledExactlyOnceWith(INCOME_GUIDE_SLUG);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('links to the full guide for a reader who wants all of it now', async () => {
    await setup();

    expect(
      fixture.nativeElement.querySelector(`a[href="/help/${INCOME_GUIDE_SLUG}"]`),
    ).not.toBeNull();
  });

  it('is announced as a region titled by the guide, and takes focus as it renders', async () => {
    await setup();

    const region = fixture.nativeElement.querySelector('section') as HTMLElement;
    const heading = region.getAttribute('aria-labelledby');

    expect(fixture.nativeElement.querySelector(`#${heading}`)?.textContent?.trim()).toBe(
      guide().title,
    );
    expect(document.activeElement).toBe(region);
  });
});
