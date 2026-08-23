import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CategoryModelStore } from '@/feature-categories';
import { BadgeComponent, FlexComponent } from '@/shared/ui';
import { badgeColorFor, statusLabelFor } from '../../model-status-display';

/**
 * The auto-categoriser's verdict, small enough for the Auto-categoriser page's header (TICKET-ML-18) — the
 * page's single most important fact used to arrive third row down, inside `app-model-status`.
 *
 * Label and colour come from `model-status-display`, the same derivation the body's alert reads;
 * this component adds only the one thing a header needs beyond a word: `training` carries the live
 * epoch counter and a spinner, since "Training" alone says nothing about progress.
 */
@Component({
  selector: 'app-model-status-badge',
  imports: [DecimalPipe, BadgeComponent, FlexComponent],
  templateUrl: './model-status-badge.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModelStatusBadgeComponent {
  protected readonly categoryModelStore = inject(CategoryModelStore);

  protected readonly badgeColor = computed(() => badgeColorFor(this.categoryModelStore.status()));

  protected readonly statusLabel = computed(() => statusLabelFor(this.categoryModelStore.status()));

  protected readonly isTraining = computed(() => this.categoryModelStore.status() === 'training');
}
