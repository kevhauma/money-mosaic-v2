import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerTriangleFill, tablerTriangleInvertedFill } from '@ng-icons/tabler-icons/fill';
import { FlexComponent, PaperComponent, TypographyComponent } from '@/shared/ui';
import type { CategoryComparisonVm } from '../../category-comparison-vm';

/** Which side the card's decorative tilt leans — alternates per grid position (TICKET-STAT-23). */
export type CardTiltDirection = 'l' | 'r';

/**
 * One category's period-comparison card (TICKET-STAT-23, CR4-1 §2 Option B) — header, delta
 * badge, bar row, and avg/high/low footer for a single `CategoryComparisonVm` row. Purely
 * presentational: every display fact (delta color/icon, bar heights, tooltip text) already lives
 * on the VM the panel builds; this component only renders it.
 */
@Component({
  selector: 'app-comparison-category-card',
  imports: [RouterLink, NgIcon, FlexComponent, PaperComponent, TypographyComponent],
  templateUrl: './comparison-category-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerTriangleFill, tablerTriangleInvertedFill })],
})
export class ComparisonCategoryCardComponent {
  readonly category = input.required<CategoryComparisonVm>();
  readonly tiltDirection = input.required<CardTiltDirection>();
}
