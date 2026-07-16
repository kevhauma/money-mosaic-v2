import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { structuralFiltersSignal } from './structural-filters';

type FormValue = { categoryId: string; text: string };
type StructuralValue = { categoryId: string };

const pick = (value: FormValue): StructuralValue => ({ categoryId: value.categoryId });

describe('structuralFiltersSignal', () => {
  it('seeds from the initial form value, run through pick', () => {
    TestBed.runInInjectionContext(() => {
      const source = new Subject<FormValue>();
      const signal = structuralFiltersSignal(source, pick, { categoryId: '3', text: '' });

      expect(signal()).toEqual({ categoryId: '3' });
    });
  });

  it('propagates a genuine structural change', () => {
    TestBed.runInInjectionContext(() => {
      const source = new Subject<FormValue>();
      const signal = structuralFiltersSignal(source, pick, { categoryId: '', text: '' });

      source.next({ categoryId: '7', text: '' });

      expect(signal()).toEqual({ categoryId: '7' });
    });
  });

  it('does not re-emit when only a field outside the picked shape changes (CR-2.4)', () => {
    TestBed.runInInjectionContext(() => {
      const source = new Subject<FormValue>();
      const signal = structuralFiltersSignal(source, pick, { categoryId: '5', text: '' });

      source.next({ categoryId: '5', text: 'coffee' }); // same categoryId, only text differs
      source.next({ categoryId: '5', text: 'coffee shop' }); // still just text

      expect(signal()).toEqual({ categoryId: '5' }); // never touched by the text-only changes
    });
  });

  it('re-emits once a structural field actually changes after text-only churn', () => {
    TestBed.runInInjectionContext(() => {
      const source = new Subject<FormValue>();
      const signal = structuralFiltersSignal(source, pick, { categoryId: '5', text: '' });

      source.next({ categoryId: '5', text: 'coffee' });
      source.next({ categoryId: '9', text: 'coffee' });

      expect(signal()).toEqual({ categoryId: '9' });
    });
  });
});
