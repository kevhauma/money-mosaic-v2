import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
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
  readonly maxlength = input<number>();
  readonly class = input('', { alias: 'class' });

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
  }
}
