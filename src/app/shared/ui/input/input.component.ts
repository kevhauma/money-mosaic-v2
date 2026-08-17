import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { daisyClasses } from '@/shared/utils';

export type InputColor =
  'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
export type InputSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type InputType = 'text' | 'number' | 'date' | 'email';

@Component({
  selector: 'mm-input',
  imports: [],
  templateUrl: './input.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
})
export class InputComponent implements ControlValueAccessor {
  readonly type = input<InputType>('text');
  readonly color = input<InputColor>();
  readonly size = input<InputSize>('md');
  readonly placeholder = input('');
  readonly step = input<string>();
  readonly min = input<string>();
  readonly max = input<string>();
  readonly maxlength = input<number>();
  readonly ariaInvalid = input(false);
  /** Accessible name for an input with no visible `<label>` of its own — e.g. a cell in an editable table, whose column header alone doesn't say which row it belongs to. */
  readonly ariaLabel = input<string>();
  /** Id of an element describing this field's current state (a validation reason, a live preview) — for a screen reader to announce alongside the field, not just its label (TICKET-STAT-39). */
  readonly ariaDescribedBy = input<string>();
  readonly class = input('', { alias: 'class' });

  /**
   * Re-emits the inner `<input>`'s blur, for a caller that saves on leaving a field rather than on
   * submit (TICKET-INC-10's always-editable salary table). Needed as an explicit output because
   * `blur` doesn't bubble, so `(blur)` on the `<mm-input>` element itself would never fire — and
   * `(focusout)`, which does bubble, would be a subtlety every call site had to know about.
   */
  readonly blurred = output<void>();

  protected readonly displayValue = signal('');
  protected readonly isDisabled = signal(false);

  private onChange: (value: string | number | null) => void = () => {};
  private onTouched: () => void = () => {};

  protected readonly classes = computed(() =>
    daisyClasses(
      'input',
      [this.color() && `input-${this.color()}`, this.size() !== 'md' && `input-${this.size()}`],
      this.class(),
    ),
  );

  writeValue(value: string | number | null): void {
    this.displayValue.set(value == null ? '' : String(value));
  }

  registerOnChange(fn: (value: string | number | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected handleInput(raw: string): void {
    this.displayValue.set(raw);
    if (this.type() === 'number') {
      this.onChange(raw === '' ? null : parseFloat(raw));
    } else {
      this.onChange(raw);
    }
  }

  protected handleBlur(): void {
    this.onTouched();
    this.blurred.emit();
  }
}
