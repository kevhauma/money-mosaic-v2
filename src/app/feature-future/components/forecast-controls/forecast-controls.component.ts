import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppSettingsStore, ForecastSettingsStore } from '@/core/state';
import type { SavingBasis } from '@/core/stats';
import {
  FieldsetComponent,
  FlexComponent,
  InputComponent,
  LabelComponent,
  PaperComponent,
  PrivacyBlurComponent,
  SelectComponent,
  TabsComponent,
  TypographyComponent,
} from '@/shared/ui';
import { linkControlToSetting } from '@/shared/utils';
import { ForecastStore } from '../../forecast.store';
import {
  BASIS_OPTIONS,
  BASIS_TABS,
  LOOKBACK_OPTIONS,
  describeVelocity,
} from '../../forecast-controls-vm';

/**
 * The three parameters behind every figure on `/future` (FR-FUT-1, TICKET-FUT-06), and the readout
 * that keeps them honest: how far back the saving rate is measured, what counts as saving, and how
 * much cash stays untouched.
 *
 * All three persist (`ForecastSettingsStore`), deliberately unlike `ChartOptionsStore`'s in-memory
 * rule — a legend that resets on reload is harmless, a forecast window that silently resets is not.
 *
 * The window is a count of **complete months**, not an arbitrary span, which is why these are
 * presets rather than a date-range picker: a 47-day window has no meaningful per-month rate, and
 * this page deliberately has no `RangeStore` (TICKET-FUT-03).
 */
@Component({
  selector: 'app-forecast-controls',
  imports: [
    ReactiveFormsModule,
    FieldsetComponent,
    FlexComponent,
    InputComponent,
    LabelComponent,
    PaperComponent,
    PrivacyBlurComponent,
    SelectComponent,
    TabsComponent,
    TypographyComponent,
  ],
  templateUrl: './forecast-controls.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForecastControlsComponent {
  private readonly forecastSettingsStore = inject(ForecastSettingsStore);
  private readonly forecastStore = inject(ForecastStore);

  protected readonly privacyMode = inject(AppSettingsStore).privacyModeEnabled;

  protected readonly lookbackOptions = LOOKBACK_OPTIONS;
  protected readonly basisTabs = BASIS_TABS;

  /** The basis is a two-option toggle, so it reads straight off the store rather than a control. */
  protected readonly basis = this.forecastSettingsStore.basis;

  /** `<select>` values are strings; the store's is a number, so the coercion happens in one place. */
  protected readonly lookbackControl = new FormControl<string>('', { nonNullable: true });
  protected readonly safetyNetControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, safetyNetValidator],
  });

  /** The chosen basis' one-line explanation of what it counts, resolved off the current value. */
  protected readonly basisHint = computed(
    () => BASIS_OPTIONS.find((option) => option.value === this.forecastSettingsStore.basis())?.hint,
  );

  protected readonly readout = computed(() => describeVelocity(this.forecastStore.velocity()));

  constructor() {
    linkControlToSetting(
      this.lookbackControl,
      () => String(this.forecastSettingsStore.lookbackMonths()),
      (value) => void this.forecastSettingsStore.setLookbackMonths(Number(value)),
    );
    linkControlToSetting(
      this.safetyNetControl,
      () => String(this.forecastSettingsStore.safetyNetAmount()),
      (value) => this.writeSafetyNet(value),
    );
  }

  protected onBasisChange(value: string | undefined): void {
    if (!value) return;
    void this.forecastSettingsStore.setBasis(value as SavingBasis);
  }

  /**
   * A rejected safety net is *not* written: leaving the last good value in place keeps the forecast
   * below meaningful while the user is mid-edit, rather than blanking it on every keystroke that
   * passes through an invalid state.
   */
  private writeSafetyNet(value: string): void {
    if (this.safetyNetControl.invalid) return;
    void this.forecastSettingsStore.setSafetyNetAmount(Number(value));
  }

  protected get safetyNetError(): string {
    const control = this.safetyNetControl;
    if (control.valid) return '';
    return control.hasError('required')
      ? 'Enter an amount, or 0 for none.'
      : 'Enter zero or a positive amount.';
  }
}

/** Zero is a real answer here ("keep nothing aside"), a negative one is not. */
function safetyNetValidator(control: { value: string }): { safetyNet: true } | null {
  const value = Number(control.value);
  return Number.isFinite(value) && value >= 0 ? null : { safetyNet: true };
}
