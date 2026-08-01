import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import {
  ButtonComponent,
  FieldsetComponent,
  FlexComponent,
  InputComponent,
  LabelComponent,
  type InputColor,
} from '@/shared/ui';
import { linkControlToSetting, LocaleDatePipe } from '@/shared/utils';
import type { CareerStartDateRejection } from '../../career-start-date';
import { IncomeStore } from '../../income.store';

/**
 * Sets the date the user's working life started (FR-INC-12, TICKET-INC-12) — the anchor every
 * panel on `/income` reads through `IncomeStore.incomeRange`, so a stretch of student-era income or
 * a back-imported opening balance stops being read as part of the growth story. Lives in the page
 * header's `[actions]` slot rather than above the first panel: it re-anchors the whole page, not
 * one chart.
 *
 * A rejected date (in the future, or past the last transaction) is left *in* the field with the
 * reason under it rather than being snapped back — the store is only written on a date the page
 * could actually render, and `linkControlToSetting`'s pull-back effect only fires when the stored
 * value itself changes, so a rejected entry can't be silently overwritten mid-correction.
 */
@Component({
  selector: 'app-income-career-start',
  imports: [
    ButtonComponent,
    FieldsetComponent,
    FlexComponent,
    InputComponent,
    LabelComponent,
    LocaleDatePipe,
    ReactiveFormsModule,
  ],
  templateUrl: './income-career-start.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IncomeCareerStartComponent {
  private readonly incomeStore = inject(IncomeStore);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly careerStartDate = this.incomeStore.careerStartDate;

  /** Why the date currently in the field was refused, or `null` while it's acceptable. */
  protected readonly rejection = signal<CareerStartDateRejection>(null);

  /** daisyUI's own invalid affordance on the field itself; the message below it says why. */
  protected readonly fieldColor = computed<InputColor | undefined>(() =>
    this.rejection() === null ? undefined : 'error',
  );

  protected readonly isRejected = computed(() => this.rejection() !== null);

  /**
   * Caps the native picker at the same bound `rejectCareerStartDate` enforces — the last
   * transaction, or today for a user with none — so the common case is unreachable rather than
   * merely refused. Typing still gets past it, which is what the message below the field is for.
   */
  protected readonly maxDate = computed(
    () => this.incomeStore.latestTransactionDate() ?? this.incomeStore.fullHistoryRange().to,
  );

  protected readonly control = this.formBuilder.nonNullable.control(this.careerStartDate() ?? '');

  constructor() {
    linkControlToSetting(
      this.control,
      () => this.careerStartDate() ?? '',
      (value) => this.apply(value),
    );
  }

  /** The only path that clears the setting — see `apply`'s note on why an empty field isn't one. */
  protected clear(): void {
    this.control.setValue('');
    this.rejection.set(null);
    void this.incomeStore.setCareerStartDate(undefined);
  }

  /** Persists an acceptable date, or reports why it isn't one. */
  private apply(value: string): void {
    // An empty field is *not* an instruction to clear: a native date input reports `''` for any
    // incomplete entry and fires on every segment edit, so treating it as one would wipe the
    // stored date — and snap the whole page back to full history — halfway through retyping it.
    if (!value) return;

    const rejection = this.incomeStore.rejectCareerStartDate(value);
    this.rejection.set(rejection);
    if (rejection === null) {
      void this.incomeStore.setCareerStartDate(value);
    }
  }
}
