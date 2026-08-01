import {
  type AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { AppSettingsStore } from '@/core/state';
import { GUIDES, GuideStepsComponent } from '@/feature-help';
import { ButtonComponent, PaperComponent, TypographyComponent } from '@/shared/ui';

/** The guide this page introduces itself with (TICKET-PUB-07's content). */
export const INCOME_GUIDE_SLUG = 'getting-started-with-the-income-page';

/** How many of the guide's steps the intro shows — its quick-setup path, not the whole reference. */
const QUICK_SETUP_STEPS = 3;

/**
 * The Income page's first-visit intro (TICKET-PUB-08): what this page is for, the three things to
 * set up, and a way straight to the settings page where each of them is explained beside the actual
 * control. Shown once, remembered, never in the way again.
 *
 * **Renders `GUIDES` data, never a second copy of the words** — the objection that kept a first-run
 * surface out of TICKET-PUB-07's scope, answered by sharing `GuideStepsComponent` with
 * `/help/:slug`. Change the guide and both surfaces change together.
 *
 * **Three steps, not seven.** The detail waits on the settings page, where the user will be looking
 * at the control it describes; a wall of text in front of a page they haven't seen yet is how an
 * intro gets skipped.
 *
 * Both exits — set up now, or skip — write the same thing, so however the user leaves they are
 * never asked again.
 */
@Component({
  selector: 'app-income-intro',
  imports: [ButtonComponent, GuideStepsComponent, PaperComponent, TypographyComponent],
  templateUrl: './income-intro.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeIntroComponent implements AfterViewInit {
  private readonly appSettingsStore = inject(AppSettingsStore);
  private readonly router = inject(Router);

  private readonly introRegion = viewChild<ElementRef<HTMLElement>>('introRegion');

  /**
   * Moves focus onto the intro as it renders. It replaces the page's whole content, so leaving
   * focus on `<body>` would make a keyboard or screen-reader user tab through the shell's nav to
   * reach the thing that just took over the page. Optional-called like `mm-modal`'s `showModal?.()`
   * — jsdom implements `focus` but the guard keeps this honest if the ref hasn't resolved.
   */
  ngAfterViewInit(): void {
    this.introRegion()?.nativeElement.focus?.();
  }

  protected readonly guide = computed(() =>
    GUIDES.find((entry) => entry.slug === INCOME_GUIDE_SLUG),
  );

  protected readonly quickSetupSteps = computed(
    () => this.guide()?.steps.slice(0, QUICK_SETUP_STEPS) ?? [],
  );

  protected readonly fullGuideLink = `/help/${INCOME_GUIDE_SLUG}`;

  /** Marks the guide seen and hands off to the settings page, flagged as the onboarding path. */
  protected async setUp(): Promise<void> {
    await this.appSettingsStore.markGuideSeen(INCOME_GUIDE_SLUG);
    await this.router.navigate(['/income/settings'], { queryParams: { from: 'setup' } });
  }

  /** Marks it seen and reveals the page as-is — same write, no navigation. */
  protected skip(): void {
    void this.appSettingsStore.markGuideSeen(INCOME_GUIDE_SLUG);
  }
}
