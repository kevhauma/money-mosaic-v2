import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  type OnInit,
  computed,
  signal,
  viewChild,
  input,
  output,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { tablerCalendar } from '@ng-icons/tabler-icons';
import type { RecentRange } from '@/core/data-access';
import {
  describeRangeExpression,
  formatDate,
  parseRangeExpression,
  resolveRangeExpression,
} from '@/shared/utils';
import { ButtonComponent } from '../button/button.component';
import { EmptyStateComponent } from '../empty-state/empty-state.component';
import { FieldsetComponent } from '../fieldset/fieldset.component';
import { InputComponent } from '../input/input.component';
import { TypographyComponent } from '../typography/typography.component';

export type AbsoluteRangeApplied = { from: string; to: string };

const todayIso = (): string => new Date().toISOString().slice(0, 10);

let nextInstanceId = 0;

type FieldEdge = 'from' | 'to';

type FieldState = {
  text: string;
  parsed: ReturnType<typeof parseRangeExpression>;
  /** The resolved boundary as a raw ISO date — what the calendar button's `value` needs. */
  resolvedIso: string | null;
  /** The same boundary, locale-formatted for the on-screen preview line. */
  preview: string | null;
};

/** One "Recently used ranges" row's view model (TICKET-STAT-40) — `range` is what clicking the row fills the fields with. */
type RecentRangeRow = { range: RecentRange; label: string; resolvedLine: string };

/**
 * The picker's left panel (TICKET-STAT-39): two expression fields (`now-90d`, or a bare ISO date),
 * each with a calendar button that writes into the field rather than replacing it, and an
 * Apply-staged commit — nothing here reaches the page until `apply` fires. Split out from
 * `mm-range-picker` itself so the parsing/validation/staging logic has its own mountable, testable
 * surface; a fresh instance is created every time the popover opens (mounted via `@if`, never
 * reused across opens), so `ngOnInit` seeds the fields once from `fromExpr`/`toExpr` — required
 * inputs are guaranteed resolved by then, unlike in the constructor. `reset()` stays a public
 * method (not folded into `ngOnInit` directly) so a test can reseed an already-constructed
 * instance without recreating it. The parent otherwise owns `discard()`/`focusApply()` (the two
 * `Esc` paths) and reads the public `hasUnappliedEdits` signal (to gate closing at all).
 *
 * A previous version seeded via a `queueMicrotask` called from the parent's `open()`, timed to run
 * after this component's view was created — that ordering held in tests (`fixture.detectChanges()`
 * runs synchronously) but not in a real zoneless app, where Angular's own change-detection
 * scheduling can run *after* an already-queued microtask, leaving `reset()` called against a
 * `viewChild` that hadn't resolved yet and silently no-op-ing (`?.reset()`) — the fields opened
 * blank. Caught only via a live browser check (TICKET-STAT-40), since STAT-38/39 both skipped
 * theirs.
 *
 * `[formControl]`, not `[ngModel]` — the established pattern for every other CVA-backed `mm-*`
 * field in this codebase (`mm-select`/`mm-input` elsewhere always bind via `ReactiveFormsModule`).
 * The field's own `FormControl` owns the native `writeValue` round-trip; `fromText`/`toText` below
 * mirror `valueChanges` into plain signals via `toSignal` purely so the parsing/validation
 * `computed()`s have something reactive to read — reading a `FormControl.value` directly in a
 * `computed()` would not be reactive in this zoneless app (the control's raw value isn't a signal).
 */
@Component({
  selector: 'mm-absolute-range-panel',
  imports: [
    ButtonComponent,
    EmptyStateComponent,
    FieldsetComponent,
    InputComponent,
    NgIcon,
    ReactiveFormsModule,
    TypographyComponent,
  ],
  templateUrl: './absolute-range-panel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  viewProviders: [provideIcons({ tablerCalendar })],
})
export class AbsoluteRangePanelComponent implements OnInit {
  /** The currently-applied range's canonical expression text — what `reset()` seeds the fields from. */
  readonly fromExpr = input.required<string>();
  readonly toExpr = input.required<string>();
  /** Set by the parent after a blocked close attempt (`Esc`/outside click while edits are unapplied) — visibly flags Apply. */
  readonly unappliedEditsFlagged = input(false);
  /** The last ten applied ranges, global and most-recent-first (TICKET-STAT-40). */
  readonly recentRanges = input<RecentRange[]>([]);

  readonly apply = output<AbsoluteRangeApplied>();

  protected readonly instanceId = nextInstanceId++;
  protected readonly fromHintId = `mm-absolute-range-from-hint-${this.instanceId}`;
  protected readonly toHintId = `mm-absolute-range-to-hint-${this.instanceId}`;

  protected readonly fromControl = new FormControl('', { nonNullable: true });
  protected readonly toControl = new FormControl('', { nonNullable: true });
  private readonly fromText = toSignal(this.fromControl.valueChanges, {
    initialValue: this.fromControl.value,
  });
  private readonly toText = toSignal(this.toControl.valueChanges, {
    initialValue: this.toControl.value,
  });
  // Signals, not plain fields — `hasUnappliedEdits` below is a `computed()`, which only
  // invalidates its cache when a signal it *read* changes; a plain mutable field updated outside
  // a signal write (as in `onApplyClick`) would leave that computed's cached value stale.
  private readonly appliedFromText = signal('');
  private readonly appliedToText = signal('');

  private readonly applyButton = viewChild('applyButton', { read: ElementRef<HTMLElement> });
  private readonly fromDateInput = viewChild<ElementRef<HTMLInputElement>>('fromDateInput');
  private readonly toDateInput = viewChild<ElementRef<HTMLInputElement>>('toDateInput');

  ngOnInit(): void {
    this.reset();
  }

  /**
   * Seeds both fields from the currently-applied `fromExpr`/`toExpr` — called imperatively by the
   * parent right after mounting this component (the popover just opened), not driven by an
   * `effect()` reacting to an `isOpen` input. An input-reactive reseed would also have to fire (or
   * deliberately not fire) on every later `fromExpr`/`toExpr` change while still mounted — e.g. a
   * prev/next click while the popover stays open — which is exactly the kind of implicit,
   * hard-to-bound reactive coupling this component avoids by making the reseed a plain method call
   * instead, on the same explicit "after mount" trigger `focusApply()`/`discard()` already use.
   */
  reset(): void {
    const from = this.fromExpr();
    const to = this.toExpr();
    this.appliedFromText.set(from);
    this.appliedToText.set(to);
    this.fromControl.setValue(from);
    this.toControl.setValue(to);
  }

  private readonly fromState = computed<FieldState>(() => this.fieldState(this.fromText(), 'from'));
  private readonly toState = computed<FieldState>(() => this.fieldState(this.toText(), 'to'));

  /** `edge` matters for a snap-suffixed expression (`now/M` means a different date as a `from` vs. a `to`), so each field previews against its own edge, not always `'from'`. */
  private fieldState(text: string, edge: FieldEdge): FieldState {
    const parsed = parseRangeExpression(text);
    const resolvedIso = parsed.ok ? resolveRangeExpression(parsed.value, todayIso(), edge) : null;
    return { text, parsed, resolvedIso, preview: resolvedIso ? formatDate(resolvedIso) : null };
  }

  protected readonly fromError = computed(() => {
    const parsed = this.fromState().parsed;
    return parsed.ok ? null : parsed.reason;
  });

  protected readonly toError = computed(() => {
    const parsed = this.toState().parsed;
    return parsed.ok ? null : parsed.reason;
  });

  protected readonly fromPreview = computed(() => this.fromState().preview);
  protected readonly toPreview = computed(() => this.toState().preview);
  protected readonly fromResolvedIso = computed(() => this.fromState().resolvedIso);
  protected readonly toResolvedIso = computed(() => this.toState().resolvedIso);

  /** From-after-To is a pair-level error, only meaningful once both fields parse on their own. */
  protected readonly pairError = computed(() => {
    const from = this.fromState().parsed;
    const to = this.toState().parsed;
    if (!from.ok || !to.ok) {
      return null;
    }
    const today = todayIso();
    const fromDate = resolveRangeExpression(from.value, today, 'from');
    const toDate = resolveRangeExpression(to.value, today, 'to');
    return fromDate > toDate ? 'From must be on or before To.' : null;
  });

  readonly hasUnappliedEdits = computed(
    () => this.fromText() !== this.appliedFromText() || this.toText() !== this.appliedToText(),
  );

  protected readonly canApply = computed(
    () =>
      this.fromError() === null &&
      this.toError() === null &&
      this.pairError() === null &&
      this.hasUnappliedEdits(),
  );

  /** Discards typed edits back to the last-applied text — the second-`Esc` escape hatch. */
  discard(): void {
    this.fromControl.setValue(this.appliedFromText());
    this.toControl.setValue(this.appliedToText());
  }

  focusApply(): void {
    this.applyButton()?.nativeElement.querySelector('button')?.focus();
  }

  /**
   * `showPicker()` opens the native date-picker UI — it's unimplemented in jsdom, so specs drive
   * the same `onCalendarChange` path directly by mutating the hidden input and dispatching
   * `change`, same as a real picker selection would.
   */
  protected openFromPicker(): void {
    this.fromDateInput()?.nativeElement.showPicker?.();
  }

  protected openToPicker(): void {
    this.toDateInput()?.nativeElement.showPicker?.();
  }

  protected onCalendarChange(edge: FieldEdge, event: Event): void {
    const { value } = event.target as HTMLInputElement;
    if (!value) {
      return;
    }
    (edge === 'from' ? this.fromControl : this.toControl).setValue(value);
  }

  /**
   * View model for the "Recently used ranges" list (TICKET-STAT-40): each row's plain-language
   * label (`describeRangeExpression` for a relative `from`, the formatted dates otherwise — same
   * fallback `mm-range-picker`'s own trigger label uses) plus its currently-resolved dates on a
   * second line, so a relative entry shows both what it means and what it means *today*.
   */
  protected readonly recentRangeRows = computed<RecentRangeRow[]>(() =>
    this.recentRanges().map((range) => {
      const today = todayIso();
      const parsedFrom = parseRangeExpression(range.fromExpr);
      const parsedTo = parseRangeExpression(range.toExpr);
      const resolvedFrom = parsedFrom.ok
        ? resolveRangeExpression(parsedFrom.value, today, 'from')
        : range.fromExpr;
      const resolvedTo = parsedTo.ok
        ? resolveRangeExpression(parsedTo.value, today, 'to')
        : range.toExpr;
      const resolvedLine = `${formatDate(resolvedFrom)} – ${formatDate(resolvedTo)}`;
      const label =
        parsedFrom.ok && parsedFrom.value.kind === 'relative'
          ? describeRangeExpression(parsedFrom.value)
          : resolvedLine;
      return { range, label, resolvedLine };
    }),
  );

  /** Fills both fields and stages the edit — does not apply, so every path through this panel still ends at Apply. */
  protected onRecentRangeClick(range: RecentRange): void {
    this.fromControl.setValue(range.fromExpr);
    this.toControl.setValue(range.toExpr);
  }

  protected onApplyClick(): void {
    if (!this.canApply()) {
      return;
    }
    const from = this.fromText();
    const to = this.toText();
    this.appliedFromText.set(from);
    this.appliedToText.set(to);
    this.apply.emit({ from, to });
  }
}
