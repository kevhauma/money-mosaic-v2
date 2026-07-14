import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RuleFormComponent } from './rule-form.component';

describe('RuleFormComponent', () => {
  let component: RuleFormComponent;
  let fixture: ComponentFixture<RuleFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RuleFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RuleFormComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

describe('RuleFormComponent: regex pattern length cap (TICKET-PERF-02)', () => {
  let component: RuleFormComponent;
  let fixture: ComponentFixture<RuleFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RuleFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RuleFormComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    fixture.detectChanges();
  });

  const conditions = () =>
    (
      component as unknown as {
        conditionsArray: { at: (i: number) => import('@angular/forms').FormGroup };
      }
    ).conditionsArray;

  it('rejects a regex pattern over the cap', () => {
    const group = conditions().at(0);
    group.patchValue({ field: 'description', operator: 'regex', value: 'a'.repeat(201) });

    expect(group.controls['value'].hasError('regexPatternMaxLength')).toBe(true);
  });

  it('accepts a regex pattern at the cap', () => {
    const group = conditions().at(0);
    group.patchValue({ field: 'description', operator: 'regex', value: 'a'.repeat(200) });

    expect(group.controls['value'].hasError('regexPatternMaxLength')).toBe(false);
  });

  it('does not cap the same long value for a non-regex operator', () => {
    const group = conditions().at(0);
    group.patchValue({ field: 'description', operator: 'contains', value: 'a'.repeat(201) });

    expect(group.controls['value'].hasError('regexPatternMaxLength')).toBe(false);
  });

  it('re-validates when switching from contains to regex on the same long value', () => {
    const group = conditions().at(0);
    group.patchValue({ field: 'description', operator: 'contains', value: 'a'.repeat(201) });
    expect(group.controls['value'].hasError('regexPatternMaxLength')).toBe(false);

    group.controls['operator'].setValue('regex');
    component['onOperatorChange'](group as never);

    expect(group.controls['value'].hasError('regexPatternMaxLength')).toBe(true);
  });
});
