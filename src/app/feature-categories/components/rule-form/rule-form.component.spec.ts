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

describe('RuleFormComponent: pre-filled draft without a persisted id (TICKET-CAT-07)', () => {
  let component: RuleFormComponent;
  let fixture: ComponentFixture<RuleFormComponent>;

  const draftRule = {
    name: 'Rule from filter (2026-07-23)',
    priority: 10,
    enabled: true,
    continueOnMatch: false,
    conditionMatch: 'all' as const,
    conditions: [{ field: 'accountId' as const, operator: 'equals' as const, value: 1 }],
    action: { setCategoryId: 0 },
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RuleFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RuleFormComponent);
    component = fixture.componentInstance;
  });

  it('treats an id-less draft as "add", not "edit"', async () => {
    fixture.componentRef.setInput('rule', draftRule);
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    expect((component as unknown as { isEditingExisting: () => boolean }).isEditingExisting()).toBe(
      false,
    );
  });

  it('leaves categoryId unselected when the draft carries the 0 sentinel', async () => {
    fixture.componentRef.setInput('rule', draftRule);
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    const form = (component as unknown as { form: { value: { categoryId: string } } }).form;
    expect(form.value.categoryId).toBe('');
  });

  it('renders the excludedFiltersNote as a visible alert when provided', async () => {
    fixture.componentRef.setInput('rule', draftRule);
    fixture.componentRef.setInput(
      'excludedFiltersNote',
      "Date range filter isn't included — rules can't match on that yet.",
    );
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    fixture.detectChanges();

    const alertText = (fixture.nativeElement as HTMLElement).querySelector('mm-alert')?.textContent;
    expect(alertText).toContain("Date range filter isn't included");
  });

  it('renders no alert when excludedFiltersNote is null', async () => {
    fixture.componentRef.setInput('rule', draftRule);
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).querySelector('mm-alert')).toBeNull();
  });
});
