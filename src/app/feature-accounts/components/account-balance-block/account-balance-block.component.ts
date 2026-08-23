import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  TypographyComponent,
  type TextColor,
  type TextVariant,
  type TextWeight,
} from '@/shared/ui';
import { negativeMoneyColor, SignedAmountPipe } from '@/shared/utils';

export type AccountBalanceBlockSize = 'md' | 'lg';

type SizeSpec = {
  variant: TextVariant;
  weight: TextWeight | undefined;
  balanceClass: string;
  shareClass: string;
  skeletonClass: string;
};

/** Preserves each consumer's pre-extraction typography exactly: `md` is the overview card's
 * rendering, `lg` the detail page's. */
const SIZE_SPECS: Record<AccountBalanceBlockSize, SizeSpec> = {
  md: {
    variant: 'display',
    weight: undefined,
    balanceClass: '',
    shareClass: 'text-xs text-base-content/60',
    skeletonClass: 'skeleton inline-block h-8 w-24',
  },
  lg: {
    variant: 'body',
    weight: 'semibold',
    balanceClass: 'text-4xl',
    shareClass: 'text-sm text-base-content/60',
    skeletonClass: 'skeleton inline-block h-10 w-32',
  },
};

/**
 * The `dataReady ? balance : skeleton` + "Your share" fragment shared by the accounts overview
 * card and the accounts detail page (TICKET-ACC-06, CR4-1 §4 Option B) — purely presentational;
 * consumers resolve `hasShare`/`shareDisplay` themselves (see `AccountCardVm` for the flag+number
 * split rationale). `display: contents` keeps the parent card-body flex layout treating the
 * fragment's elements as direct children.
 */
@Component({
  selector: 'app-account-balance-block',
  imports: [SignedAmountPipe, TypographyComponent],
  templateUrl: './account-balance-block.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      :host {
        display: contents;
      }
    `,
  ],
})
export class AccountBalanceBlockComponent {
  readonly dataReady = input(false);
  readonly balance = input.required<number>();
  readonly hasShare = input(false);
  readonly shareDisplay = input(0);
  readonly size = input<AccountBalanceBlockSize>('md');

  protected readonly spec = computed(() => SIZE_SPECS[this.size()]);
  /** Only losses are marked, per `negativeMoneyColor` — a green tint on every positive balance would
   * colour most of the accounts list (TICKET-UI-27). */
  protected readonly balanceColor = computed<TextColor | undefined>(() =>
    negativeMoneyColor(this.balance()),
  );
}
