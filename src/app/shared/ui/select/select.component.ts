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

export type SelectColor =
  'neutral' | 'primary' | 'secondary' | 'accent' | 'info' | 'success' | 'warning' | 'error';
export type SelectSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

@Component({
  selector: 'mm-select',
  imports: [],
  templateUrl: './select.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SelectComponent),
      multi: true,
    },
  ],
})
export class SelectComponent implements ControlValueAccessor {
  readonly color = input<SelectColor>();
  readonly size = input<SelectSize>('md');
  readonly class = input('', { alias: 'class' });

  protected readonly value = signal('');
  protected readonly isDisabled = signal(false);

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  protected readonly classes = computed(() =>
    daisyClasses(
      'select',
      [this.color() && `select-${this.color()}`, this.size() !== 'md' && `select-${this.size()}`],
      this.class(),
    ),
  );

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled.set(isDisabled);
  }

  protected handleChange(raw: string): void {
    this.value.set(raw);
    this.onChange(raw);
  }

  protected handleBlur(): void {
    this.onTouched();
  }
}
