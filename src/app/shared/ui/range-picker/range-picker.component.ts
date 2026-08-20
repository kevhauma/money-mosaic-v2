import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  tablerChevronLeft,
  tablerChevronRight,
  tablerClock,
  tablerSearch,
} from '@ng-icons/tabler-icons';
import type { RecentRange } from '@/core/data-access';
import {
  describeRangeExpression,
  formatAlignedRangeLabel,
  formatDate,
  parseRangeExpression,
  QUICK_RANGES,
  quickRangeById,
  type QuickRangeEntry,
  type QuickRangeGroup,
} from '@/shared/utils';
import {
  AbsoluteRangePanelComponent,
  type AbsoluteRangeApplied,
} from '../absolute-range-panel/absolute-range-panel.component';
import { ButtonComponent } from '../button/button.component';
import { FlexComponent } from '../flex/flex.component';
import { PaperComponent } from '../paper/paper.component';
import { TypographyComponent } from '../typography/typography.component';

export type RangePickerValue = {
  /** A `QUICK_RANGES` id (TICKET-STAT-37), or `'custom'` for a hand-built range. */
  preset: string;
  from: string;
  to: string;
  /** Unresolved `range-expression` text behind `from`/`to` (TICKET-STAT-39) — what the absolute panel seeds from. */
  fromExpr: string;
  toExpr: string;
  /** The last ten applied ranges, global and most-recent-first (TICKET-STAT-40). */
  recentRanges: RecentRange[];
};

type QuickRangeGroupVm = { group: QuickRangeGroup; label: string; entries: QuickRangeEntry[] };

const GROUP_LABELS: Record<QuickRangeGroup, string> = {
  relative: 'Relative',
  'previous-period': 'Previous period',
  'current-period': 'Current period',
  everything: 'Everything',
};

/** Displayed once per group, in `QUICK_RANGES`' own authored order — the catalogue is already grouped, so this is stable rather than a sort. */
const GROUP_ORDER: QuickRangeGroup[] = [
  'relative',
  'previous-period',
  'current-period',
  'everything',
];

/**
 * The two-panel date-range picker (TICKET-STAT-38): a trigger button flanked by prev/next chevrons,
 * opening a popover with an absolute panel (`mm-absolute-range-panel`, TICKET-STAT-39's typed
 * expression fields + Apply staging) and a searchable, grouped quick-range list. Replaces
 * `mm-range-grouping-switcher` — same presentational contract (value in, outputs out), so
 * `pageRangeControl` needs no change.
 *
 * No CDK Overlay/`a11y` — `mm-dropdown`'s pure-CSS focus/blur mechanism can't give Esc-to-close,
 * outside-click-close, or a reliable focus return, so this manages its own `isOpen` signal and
 * native DOM listeners, the same manual-focus-management style `mm-modal` already uses (there it's
 * a native `<dialog>`; here it's an anchored popover, so the plumbing is bespoke instead). Closing
 * is additionally gated on the absolute panel's staged edits (TICKET-STAT-39) — see `attemptClose`.
 */
@Component({
  selector: 'mm-range-picker',
  imports: [
    AbsoluteRangePanelComponent,
    ButtonComponent,
    FlexComponent,
    NgIcon,
    PaperComponent,
    TypographyComponent,
  ],
  templateUrl: './range-picker.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [
    provideIcons({ tablerChevronLeft, tablerChevronRight, tablerClock, tablerSearch }),
  ],
})
export class RangePickerComponent {
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly value = input.required<RangePickerValue>();

  readonly presetChange = output<string>();
  readonly customRangeChange = output<AbsoluteRangeApplied>();
  readonly rangeShift = output<-1 | 1>();

  protected readonly isOpen = signal(false);
  protected readonly searchTerm = signal('');

  /** Set after a blocked close attempt (`Esc`/outside click/re-clicking the trigger while the absolute panel has unapplied edits) — flags Apply and unlocks the "second `Esc` discards" behaviour. */
  protected readonly unappliedEditsWarningActive = signal(false);

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  // `mm-button`'s template ref is a component instance by default — `read: ElementRef` gets its
  // host `<mm-button>` element instead, which is itself un-focusable (no tabindex); the focus
  // fallback in `forceClose()` below has to reach one level deeper, into the native `<button>` it renders.
  private readonly triggerButton = viewChild('triggerButton', { read: ElementRef<HTMLElement> });
  private readonly quickRangeList = viewChild<ElementRef<HTMLElement>>('quickRangeList');
  private readonly absolutePanel = viewChild(AbsoluteRangePanelComponent);

  private elementFocusedBeforeOpen: HTMLElement | null = null;

  /** Entries with no fixed, repeatable length ("so far" variants, `all-time`) have no target to shift to (TICKET-STAT-16), catalogue-driven via `QuickRangeEntry.steppingDisabled`. */
  protected readonly navigationDisabled = computed(
    () => quickRangeById(this.value().preset)?.steppingDisabled === true,
  );

  /**
   * The catalogue label for a named quick range; for a hand-built (`'custom'`) range with a
   * relative `fromExpr` ("now-30d"), STAT-35's `describeRangeExpression` — its own doc comment
   * names exactly this trigger as the intended use. Otherwise the same calendar-alignment label
   * `mm-date-range-input` already shows ("July 2026"), falling back to the raw dates.
   */
  protected readonly triggerLabel = computed(() => {
    const { preset, from, to, fromExpr } = this.value();
    const catalogueLabel = quickRangeById(preset)?.label;
    if (catalogueLabel) {
      return catalogueLabel;
    }
    const parsedFrom = parseRangeExpression(fromExpr);
    if (parsedFrom.ok && parsedFrom.value.kind === 'relative') {
      return describeRangeExpression(parsedFrom.value);
    }
    return formatAlignedRangeLabel(from, to) ?? `${formatDate(from)} – ${formatDate(to)}`;
  });

  protected readonly filteredGroups = computed<QuickRangeGroupVm[]>(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const matches = term
      ? QUICK_RANGES.filter((entry) => entry.label.toLowerCase().includes(term))
      : QUICK_RANGES;

    return GROUP_ORDER.map((group) => ({
      group,
      label: GROUP_LABELS[group],
      entries: matches.filter((entry) => entry.group === group),
    })).filter((groupVm) => groupVm.entries.length > 0);
  });

  protected toggle(): void {
    if (this.isOpen()) {
      this.attemptClose();
    } else {
      this.open();
    }
  }

  private open(): void {
    this.elementFocusedBeforeOpen = document.activeElement as HTMLElement | null;
    this.isOpen.set(true);
    // Deferred a tick: the search input doesn't exist in the DOM until the `@if` below renders
    // it. `mm-absolute-range-panel` seeds itself from `fromExpr`/`toExpr` on its own `ngOnInit` —
    // no reset() call needed here (a `queueMicrotask`-timed one used to live in this block, but
    // its ordering assumption against Angular's own change-detection scheduling didn't hold in a
    // real zoneless app; see that component's doc comment).
    queueMicrotask(() => {
      this.searchInput()?.nativeElement.focus();
    });
  }

  /**
   * The gated close path (TICKET-STAT-39) — `Esc`, an outside click, and re-clicking the trigger
   * all funnel through here. A first blocked attempt while the absolute panel has unapplied edits
   * doesn't close: it flags Apply and focuses it instead, so the user sees exactly what's stopping
   * them. `Esc` alone gets a second, explicit way through (`onEscape` below) — an outside click or
   * re-clicking the trigger keeps re-blocking rather than discarding, since "click away" is too
   * easy to trigger by accident to double as "I meant to lose my edits".
   */
  private attemptClose(): void {
    if (!this.isOpen()) {
      return;
    }
    if (this.absolutePanel()?.hasUnappliedEdits()) {
      this.unappliedEditsWarningActive.set(true);
      this.absolutePanel()?.focusApply();
      return;
    }
    this.forceClose();
  }

  /** Closes unconditionally — used once a close has already been decided (Apply, a discarded edit, a quick-range pick), never as the first response to an `Esc`/outside click. */
  private forceClose(): void {
    if (!this.isOpen()) {
      return;
    }
    this.isOpen.set(false);
    this.searchTerm.set('');
    this.unappliedEditsWarningActive.set(false);

    const previouslyFocused = this.elementFocusedBeforeOpen;
    this.elementFocusedBeforeOpen = null;
    if (previouslyFocused?.isConnected) {
      previouslyFocused.focus();
    } else {
      // `triggerButton()` reads `<mm-button>`'s own host element, which has no `tabindex` and so
      // is never itself focusable — the real target is the native `<button>` its template renders.
      this.triggerButton()?.nativeElement.querySelector('button')?.focus();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (!this.isOpen()) {
      return;
    }
    // The "second Esc discards" escape hatch: a blocked attempt already flagged the warning, so
    // this Esc is the deliberate follow-up rather than the first ask.
    if (this.unappliedEditsWarningActive() && this.absolutePanel()?.hasUnappliedEdits()) {
      this.absolutePanel()?.discard();
      this.forceClose();
      return;
    }
    this.attemptClose();
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) {
      return;
    }
    if (!this.elementRef.nativeElement.contains(event.target as Node)) {
      this.attemptClose();
    }
  }

  protected onSearchInput(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
  }

  protected selectQuickRange(id: string): void {
    this.presetChange.emit(id);
    // A quick range always wins over staged edits (STAT-39's Description: "the two commit models
    // coexist; the collision resolves in favour of the more recent, more explicit action") — so
    // this closes unconditionally rather than routing through `attemptClose`'s guard. `forceClose`
    // unmounts `mm-absolute-range-panel` (it lives inside the `@if (isOpen())` block below), which
    // is what actually discards any staged edits; the next open reseeds a fresh instance from
    // `fromExpr`/`toExpr`, which by then reflect the range just picked.
    this.forceClose();
  }

  protected onAbsoluteApply(range: AbsoluteRangeApplied): void {
    this.customRangeChange.emit(range);
    this.forceClose();
  }

  /** Roving keyboard navigation across the flattened, currently-visible quick-range buttons — the panel re-filters on every keystroke, so the button set is read fresh rather than cached. */
  protected onQuickRangeListKeydown(event: KeyboardEvent): void {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    const buttons = Array.from(
      this.quickRangeList()?.nativeElement.querySelectorAll<HTMLButtonElement>(
        'button[data-quick-range-id]',
      ) ?? [],
    );
    if (buttons.length === 0) {
      return;
    }
    event.preventDefault();
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex =
      currentIndex === -1 ? 0 : (currentIndex + delta + buttons.length) % buttons.length;
    buttons[nextIndex].focus();
  }

  protected onPrevious(): void {
    this.rangeShift.emit(-1);
  }

  protected onNext(): void {
    this.rangeShift.emit(1);
  }
}
