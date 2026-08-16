import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AppSettingsStore } from '@/core/state';
import {
  FieldsetComponent,
  PaperComponent,
  SelectComponent,
  TypographyComponent,
} from '@/shared/ui';
import { formatMonthName, linkControlToSetting, parseIsoDate } from '@/shared/utils';

const DEFAULT_FISCAL_YEAR_START_MONTH = 1;

const todayIso = (): string => new Date().toISOString().slice(0, 10);

type MonthOption = { value: string; label: string };

/**
 * The setting a fiscal year begins on (TICKET-SET-09). Nothing consumes it yet — it exists so
 * STAT-37's two fiscal quick ranges have a boundary to resolve against — so this section is
 * intentionally inert beyond persisting the choice and showing what it means.
 *
 * The control holds a **string** month number ("1".."12"), not a number, because a native
 * `<select>`'s `(change)` value is always a string (`SelectComponent`'s `ControlValueAccessor`
 * doesn't coerce it) — the conversion to/from `AppSettingsStore.fiscalYearStartMonth` happens at
 * the two edges here rather than leaking a string-typed field into the store.
 */
@Component({
  selector: 'app-settings-reporting-section',
  imports: [
    ReactiveFormsModule,
    FieldsetComponent,
    PaperComponent,
    SelectComponent,
    TypographyComponent,
  ],
  templateUrl: './settings-reporting-section.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsReportingSectionComponent {
  private readonly appSettingsStore = inject(AppSettingsStore);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly monthOptions = computed<MonthOption[]>(() =>
    Array.from({ length: 12 }, (_, index) => {
      const monthNumber = index + 1;
      return { value: String(monthNumber), label: formatMonthName(monthNumber) };
    }),
  );

  protected readonly monthControl = this.formBuilder.nonNullable.control(
    String(this.appSettingsStore.fiscalYearStartMonth() ?? DEFAULT_FISCAL_YEAR_START_MONTH),
  );

  constructor() {
    linkControlToSetting(
      this.monthControl,
      () => String(this.appSettingsStore.fiscalYearStartMonth() ?? DEFAULT_FISCAL_YEAR_START_MONTH),
      (value) => void this.appSettingsStore.setFiscalYearStartMonth(Number(value)),
    );
  }

  /**
   * "April 2026 – March 2027": the fiscal year currently in progress under the chosen start
   * month, so the consequence of the setting is legible without doing the arithmetic yourself.
   * The cycle containing today started this calendar year if today's month is on/after the start
   * month, otherwise it started last year; a January start is the calendar year itself.
   *
   * Reads the **store's** signal rather than `monthControl.value` — a `FormControl`'s value isn't
   * itself a signal, so a template expression depending only on it would never be scheduled for
   * re-render in this zoneless app. Reading through the store keeps this reactive the same way
   * `SettingsCurrencyLocaleSectionComponent.currencyPreview()` is: downstream of a genuine signal.
   */
  protected fiscalYearSpanLabel(): string {
    const startMonth =
      this.appSettingsStore.fiscalYearStartMonth() ?? DEFAULT_FISCAL_YEAR_START_MONTH;
    const today = parseIsoDate(todayIso());
    const currentYear = today.getUTCFullYear();
    const currentMonth = today.getUTCMonth() + 1;

    const startYear = currentMonth >= startMonth ? currentYear : currentYear - 1;
    const endMonth = startMonth === 1 ? 12 : startMonth - 1;
    const endYear = startMonth === 1 ? startYear : startYear + 1;

    return `${formatMonthName(startMonth)} ${startYear} – ${formatMonthName(endMonth)} ${endYear}`;
  }
}
