import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppSettingsStore, ForecastSettingsStore } from '@/core/state';
import type { ForecastMode } from '@/core/data-access';
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
  MODE_OPTIONS,
  MODE_TABS,
  SCOPED_BASIS_HINT,
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
  protected readonly modeTabs = MODE_TABS;

  /** Which question the page is answering (TICKET-FUT-09) — page-level, so it leads the panel. */
  protected readonly mode = this.forecastSettingsStore.activeMode;
  protected readonly modeHint = computed(
    () => MODE_OPTIONS.find((option) => option.value === this.mode())?.hint,
  );

  /**
   * The basis is a two-option toggle, so it reads straight off the store rather than a control —
   * and off `ForecastStore`, not the settings row, so the toggle shows the basis the figures below
   * were actually measured on once a savings-account scope has fixed it.
   */
  protected readonly basis = this.forecastStore.effectiveBasis;

  /** Selecting savings accounts settles the basis question; the toggle then says so and sits out. */
  protected readonly basisLocked = computed(() => this.forecastStore.scopeAccountIds().size > 0);

  /** `<select>` values are strings; the store's is a number, so the coercion happens in one place. */
  protected readonly lookbackControl = new FormControl<string>('', { nonNullable: true });
  protected readonly safetyNetControl = new FormControl<string>('', {
    nonNullable: true,
    validators: [Validators.required, safetyNetValidator],
  });

  /** The effective basis' one-line explanation of what it counts, or why it is no longer a choice. */
  protected readonly basisHint = computed(() =>
    this.basisLocked()
      ? SCOPED_BASIS_HINT
      : BASIS_OPTIONS.find((option) => option.value === this.basis())?.hint,
  );

  protected readonly readout = computed(() => describeVelocity(this.forecastStore.velocity()));

  /** The savings accounts the forecast can be narrowed to (TICKET-FUT-08), ticked where selected. */
  protected readonly scopeOptions = computed(() => {
    const scope = this.forecastStore.scopeAccountIds();
    return this.forecastStore.scopeCandidates().map((account) => ({
      id: account.id!,
      name: account.name,
      checked: scope.has(account.id!),
    }));
  });

  /** No selection means every account — said in words, since an all-unticked list looks broken. */
  protected readonly scopeSummary = computed(
    () => this.forecastStore.scopeLabel() || 'All accounts',
  );

  /**
   * Unticking the last account reverts to "all accounts" rather than producing an empty forecast:
   * the zero-account state answers no question, so it is not reachable.
   */
  protected toggleScopeAccount(accountId: number, checked: boolean): void {
    const next = new Set(this.forecastStore.scopeAccountIds());
    if (checked) next.add(accountId);
    else next.delete(accountId);
    void this.forecastSettingsStore.setScopeAccountIds([...next]);
  }

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

  protected onModeChange(value: string | undefined): void {
    if (!value) return;
    void this.forecastSettingsStore.setMode(value as ForecastMode);
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
