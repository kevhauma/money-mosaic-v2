import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { AbsoluteRangePanelComponent } from './absolute-range-panel.component';

describe('AbsoluteRangePanelComponent', () => {
  let component: AbsoluteRangePanelComponent;
  let fixture: ComponentFixture<AbsoluteRangePanelComponent>;

  // `reset()` is a plain imperative call (not an `effect()` reacting to an `isOpen` input) — the
  // parent calls it once right after mounting this component, which this helper mirrors.
  const setup = (fromExpr: string, toExpr: string): void => {
    fixture = TestBed.createComponent(AbsoluteRangePanelComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('fromExpr', fromExpr);
    fixture.componentRef.setInput('toExpr', toExpr);
    fixture.detectChanges();
    component.reset();
    fixture.detectChanges();
  };

  // Excludes the hidden native `type="date"` inputs behind each calendar button — only the two
  // visible text fields are indices [0]/[1] among plain (non-date) `<input>` elements.
  const textInputs = (): HTMLInputElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('input:not([type="date"])'));
  const fromInput = (): HTMLInputElement => textInputs()[0];
  const toInput = (): HTMLInputElement => textInputs()[1];
  const applyButton = (): HTMLButtonElement =>
    Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Apply time range'))!;
  const type = (input: HTMLInputElement, value: string): void => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };
  const setRecentRanges = (recentRanges: { fromExpr: string; toExpr: string }[]): void => {
    fixture.componentRef.setInput('recentRanges', recentRanges);
    fixture.detectChanges();
  };
  const findButton = (textFragment: string): HTMLButtonElement =>
    Array.from(
      fixture.nativeElement.querySelectorAll('button') as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes(textFragment))!;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AbsoluteRangePanelComponent],
    }).compileComponents();
  });

  it('should create', () => {
    setup('now-30d', 'now');
    expect(component).toBeTruthy();
  });

  it('seeds both fields from a relative applied range on reset()', () => {
    setup('now-30d', 'now');
    expect(fromInput().value).toBe('now-30d');
    expect(toInput().value).toBe('now');
  });

  it('seeds both fields from an absolute applied range on reset()', () => {
    setup('2026-01-01', '2026-06-30');
    expect(fromInput().value).toBe('2026-01-01');
    expect(toInput().value).toBe('2026-06-30');
  });

  it('reset() is the only trigger for reseeding — an fromExpr/toExpr change alone does not reseed', () => {
    setup('now-30d', 'now');
    type(fromInput(), 'now-7d');
    expect(fromInput().value).toBe('now-7d');

    // The applied range changes for an unrelated reason (e.g. prev/next) while the panel stays
    // mounted — must not clobber the in-progress edit until `reset()` is actually called again.
    fixture.componentRef.setInput('fromExpr', 'now-90d');
    fixture.detectChanges();
    expect(fromInput().value).toBe('now-7d');

    component.reset();
    fixture.detectChanges();
    expect(fromInput().value).toBe('now-90d');
  });

  it('accepts a relative expression and an absolute date in either field, previewing the resolved date', () => {
    setup('2026-07-01', '2026-07-31');
    type(fromInput(), 'now-90d');
    type(toInput(), '2026-08-01');

    expect(fixture.nativeElement.textContent).not.toContain('recognised');
    // Both fields resolve to a real date, shown as a "→ <date>" preview line.
    expect(fixture.nativeElement.textContent).toContain('→');
  });

  it.each([
    ['now-6h', 'works in whole days'],
    ['now-xd', "isn't a recognised"],
    ['', 'Enter a date'],
  ])(
    "shows the parser's reason inline for an invalid entry (%s) and disables Apply",
    (invalid, reasonFragment) => {
      setup('now-30d', 'now');
      type(fromInput(), invalid);

      expect(fixture.nativeElement.textContent).toContain(reasonFragment);
      expect(applyButton().disabled).toBe(true);
    },
  );

  it('does not clear, blank, or revert the field on an invalid entry', () => {
    setup('now-30d', 'now');
    type(fromInput(), 'now-xd');

    expect(fromInput().value).toBe('now-xd');
  });

  it('reports a From later than its To as a pair-level error and disables Apply', () => {
    setup('2026-01-01', '2026-06-30');
    type(fromInput(), '2026-08-01');
    type(toInput(), '2026-07-01');

    expect(fixture.nativeElement.textContent).toContain('From must be on or before To');
    expect(applyButton().disabled).toBe(true);
  });

  it('the calendar button writes an ISO date into the field, which stays editable afterwards', () => {
    setup('2026-01-01', '2026-01-31');
    // `showPicker()` is unimplemented in jsdom, so this drives the same path a real picker
    // selection would: mutate the hidden native date input, then dispatch `change`.
    const dateInput = fixture.nativeElement.querySelector('input[type="date"]') as HTMLInputElement;
    dateInput.value = '2026-08-03';
    dateInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();

    expect(fromInput().value).toBe('2026-08-03');
    // Still a plain editable text field — typing further changes it same as any other edit.
    type(fromInput(), 'now-7d');
    expect(fromInput().value).toBe('now-7d');
  });

  it('emits nothing until Apply is clicked', () => {
    setup('now-30d', 'now');
    const applySpy = vi.fn();
    component.apply.subscribe(applySpy);

    type(fromInput(), 'now-7d');

    expect(applySpy).not.toHaveBeenCalled();
  });

  it('Apply is disabled while either field is invalid', () => {
    setup('now-30d', 'now');
    type(fromInput(), 'now-xd');
    expect(applyButton().disabled).toBe(true);
  });

  it('Apply is disabled when nothing has changed since the panel opened', () => {
    setup('now-30d', 'now');
    expect(applyButton().disabled).toBe(true);
  });

  it('Apply is enabled once a valid edit changes the range, and emits the typed pair on click', () => {
    setup('now-30d', 'now');
    type(fromInput(), 'now-7d');
    expect(applyButton().disabled).toBe(false);

    const applySpy = vi.fn();
    component.apply.subscribe(applySpy);
    applyButton().click();

    expect(applySpy).toHaveBeenCalledExactlyOnceWith({ from: 'now-7d', to: 'now' });
  });

  it('hasUnappliedEdits reflects true after an edit and false again immediately after Apply (regression)', () => {
    // Guards the bug where `hasUnappliedEdits` compared a signal against a plain mutated field —
    // the computed's cache never invalidated on Apply, so it kept reporting `true` forever.
    setup('now-30d', 'now');
    expect(component.hasUnappliedEdits()).toBe(false);

    type(fromInput(), 'now-7d');
    expect(component.hasUnappliedEdits()).toBe(true);

    applyButton().click();
    fixture.detectChanges();
    expect(component.hasUnappliedEdits()).toBe(false);
  });

  it('discard() resets both fields back to the last-applied text', () => {
    setup('now-30d', 'now');
    type(fromInput(), 'now-7d');
    type(toInput(), 'now-1d');

    component.discard();
    fixture.detectChanges();

    expect(fromInput().value).toBe('now-30d');
    expect(toInput().value).toBe('now');
    expect(component.hasUnappliedEdits()).toBe(false);
  });

  it('focusApply() moves focus to the real native Apply button', () => {
    setup('now-7d', 'now');
    type(fromInput(), 'now-14d');

    component.focusApply();

    expect(document.activeElement).toBe(applyButton());
  });

  it('visibly flags Apply when unappliedEditsFlagged is set', () => {
    setup('now-30d', 'now');
    fixture.componentRef.setInput('unappliedEditsFlagged', true);
    fixture.detectChanges();

    expect(applyButton().className).toContain('ring-warning');
    expect(fixture.nativeElement.textContent).toContain('unapplied changes');
  });

  it('shows the empty state when there are no recent ranges (TICKET-STAT-40)', () => {
    setup('now-30d', 'now');

    expect(fixture.nativeElement.textContent).toContain('No recent ranges');
  });

  it('the empty state disappears once a recent range exists', () => {
    setup('now-30d', 'now');
    setRecentRanges([{ fromExpr: 'now-6d', toExpr: 'now' }]);

    expect(fixture.nativeElement.textContent).not.toContain('No recent ranges');
  });

  it('renders each recent range with its plain-language label and its currently-resolved dates', () => {
    setup('now-30d', 'now');
    setRecentRanges([{ fromExpr: 'now-6d', toExpr: 'now' }]);

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Last 6 days');
    expect(text).toMatch(/\d{2}\/\d{2}\/\d{4}\s*–\s*\d{2}\/\d{2}\/\d{4}/);
  });

  it('clicking a recent range fills both fields and stages the edit without applying', () => {
    setup('now-30d', 'now');
    setRecentRanges([{ fromExpr: 'now-90d', toExpr: 'now-1d' }]);
    const applySpy = vi.fn();
    component.apply.subscribe(applySpy);

    findButton('Last 90 days').click();
    fixture.detectChanges();

    expect(fromInput().value).toBe('now-90d');
    expect(toInput().value).toBe('now-1d');
    expect(applySpy).not.toHaveBeenCalled();
    expect(component.hasUnappliedEdits()).toBe(true);
  });
});

describe('AbsoluteRangePanelComponent: recent ranges resolve against today, not a frozen date (TICKET-STAT-40)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // A `RecentRange` persists only the expression (`now-30d`), never a resolved date — reading the
  // same stored pair on a later "today" (a reload days later, say) must resolve against *that* day,
  // not the day it was saved. Two separate mounts stand in for "saved then read later", since a
  // `computed()`'s cache — unlike `RangeStore`'s plain resolver methods — only invalidates on a
  // signal write, not on the wall clock moving underneath an already-rendered instance.
  it('the same stored expression resolves to different dates when read on a later day', () => {
    vi.setSystemTime(new Date('2026-07-01T00:00:00Z'));
    const first = TestBed.createComponent(AbsoluteRangePanelComponent);
    first.componentRef.setInput('fromExpr', 'now');
    first.componentRef.setInput('toExpr', 'now');
    first.componentRef.setInput('recentRanges', [{ fromExpr: 'now-30d', toExpr: 'now' }]);
    first.detectChanges();
    const firstText = first.nativeElement.textContent as string;

    vi.setSystemTime(new Date('2026-08-15T00:00:00Z'));
    const second = TestBed.createComponent(AbsoluteRangePanelComponent);
    second.componentRef.setInput('fromExpr', 'now');
    second.componentRef.setInput('toExpr', 'now');
    second.componentRef.setInput('recentRanges', [{ fromExpr: 'now-30d', toExpr: 'now' }]);
    second.detectChanges();
    const secondText = second.nativeElement.textContent as string;

    expect(firstText).toContain('06/01/2026 – 07/01/2026');
    expect(secondText).toContain('07/16/2026 – 08/15/2026');
    // Both still describe it the same way — only the resolved-dates line moved.
    expect(firstText).toContain('Last 30 days');
    expect(secondText).toContain('Last 30 days');
  });
});
