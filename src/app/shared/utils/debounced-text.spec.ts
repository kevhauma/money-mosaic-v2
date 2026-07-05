import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { debouncedTextSignal } from './debounced-text';

describe('debouncedTextSignal', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('seeds the initial value and defers emissions until the debounce settles', () => {
    TestBed.runInInjectionContext(() => {
      const source = new Subject<string>();
      const needle = debouncedTextSignal(source, { debounceMs: 150 });

      expect(needle()).toBe('');

      source.next('Coffee');
      expect(needle()).toBe(''); // still within the debounce window

      vi.advanceTimersByTime(150);
      expect(needle()).toBe('coffee'); // normalised (trim + lowercase) once settled
    });
  });

  it('keeps only the last value typed within the window', () => {
    TestBed.runInInjectionContext(() => {
      const source = new Subject<string>();
      const needle = debouncedTextSignal(source, { debounceMs: 150 });

      source.next('ne');
      vi.advanceTimersByTime(100);
      source.next('  NETFLIX  ');
      vi.advanceTimersByTime(150);

      expect(needle()).toBe('netflix');
    });
  });

  it('accepts a FormControl and reads its valueChanges', () => {
    TestBed.runInInjectionContext(() => {
      const control = new FormControl('', { nonNullable: true });
      const needle = debouncedTextSignal(control);

      control.setValue('  Groceries ');
      vi.advanceTimersByTime(150);

      expect(needle()).toBe('groceries');
    });
  });

  it('honours a custom normaliser and initial value', () => {
    TestBed.runInInjectionContext(() => {
      const source = new Subject<string>();
      const needle = debouncedTextSignal(source, {
        initialValue: 'SEED',
        normalise: (value) => value.toUpperCase(),
      });

      expect(needle()).toBe('SEED');

      source.next('abc');
      vi.advanceTimersByTime(150);
      expect(needle()).toBe('ABC');
    });
  });
});
