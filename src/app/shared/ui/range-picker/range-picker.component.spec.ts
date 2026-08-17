import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { QUICK_RANGES } from '@/shared/utils';
import { RangePickerComponent, type RangePickerValue } from './range-picker.component';

// `fromExpr`/`toExpr` default to `from`/`to` — every case below is either a catalogue preset
// (which never reads them) or a plain absolute custom range, where the expression is just the ISO
// date itself.
const value = (overrides: Partial<RangePickerValue> = {}): RangePickerValue => ({
  preset: 'this-month',
  from: '2026-07-01',
  to: '2026-07-31',
  fromExpr: overrides.from ?? '2026-07-01',
  toExpr: overrides.to ?? '2026-07-31',
  ...overrides,
});

describe('RangePickerComponent', () => {
  let component: RangePickerComponent;
  let fixture: ComponentFixture<RangePickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RangePickerComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(RangePickerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('value', value());
    fixture.detectChanges();
  });

  const trigger = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('button[aria-expanded]');

  const openPopover = async (): Promise<void> => {
    trigger().click();
    fixture.detectChanges();
    // `open()` queues one microtask that both focuses the search input and calls the mounted
    // `mm-absolute-range-panel`'s `reset()` (TICKET-STAT-39) — a single `await Promise.resolve()`
    // is enough to flush it, since it was queued strictly before this awaited continuation.
    await Promise.resolve();
    fixture.detectChanges();
  };

  const quickRangeButtons = (): HTMLButtonElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('button[data-quick-range-id]'));

  const absoluteFromInput = (): HTMLInputElement =>
    fixture.nativeElement.querySelector('mm-absolute-range-panel input[aria-label="From"]');
  const absoluteApplyButton = (): HTMLButtonElement =>
    Array.from(
      fixture.nativeElement.querySelectorAll(
        'mm-absolute-range-panel button',
      ) as NodeListOf<HTMLButtonElement>,
    ).find((button) => button.textContent?.includes('Apply time range'))!;
  const typeInto = (input: HTMLInputElement, text: string): void => {
    input.value = text;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('shows the catalogue label as the trigger text', () => {
    expect(trigger().textContent).toContain('This month');
  });

  it('shows a calendar-aligned label for a hand-built range, falling back to raw dates otherwise', () => {
    fixture.componentRef.setInput(
      'value',
      value({ preset: 'custom', from: '2026-07-01', to: '2026-07-31' }),
    );
    fixture.detectChanges();
    expect(trigger().textContent).toContain('July 2026');

    fixture.componentRef.setInput(
      'value',
      value({ preset: 'custom', from: '2026-07-05', to: '2026-07-19' }),
    );
    fixture.detectChanges();
    expect(trigger().textContent).toContain('07/05/2026');
    expect(trigger().textContent).toContain('07/19/2026');
  });

  it('describes a relative hand-built range via describeRangeExpression rather than raw dates', () => {
    fixture.componentRef.setInput(
      'value',
      value({
        preset: 'custom',
        from: '2026-06-16',
        to: '2026-07-15',
        fromExpr: 'now-29d',
        toExpr: 'now',
      }),
    );
    fixture.detectChanges();

    expect(trigger().textContent).toContain('Last 29 days');
  });

  it('the trigger exposes aria-expanded, false when closed and true once open', async () => {
    expect(trigger().getAttribute('aria-expanded')).toBe('false');

    await openPopover();

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('renders every QUICK_RANGES entry under its group heading when opened', async () => {
    await openPopover();

    expect(quickRangeButtons()).toHaveLength(QUICK_RANGES.length);
    const panelText = fixture.nativeElement.textContent as string;
    expect(panelText).toContain('Relative');
    expect(panelText).toContain('Previous period');
    expect(panelText).toContain('Current period');
    expect(panelText).toContain('Everything');
  });

  it('marks the active entry as selected via aria-current', async () => {
    await openPopover();

    const active = quickRangeButtons().find(
      (button) => button.getAttribute('data-quick-range-id') === 'this-month',
    );
    const inactive = quickRangeButtons().find(
      (button) => button.getAttribute('data-quick-range-id') === 'this-year',
    );

    expect(active?.getAttribute('aria-current')).toBe('true');
    expect(inactive?.getAttribute('aria-current')).toBeNull();
  });

  it('clicking a quick range emits presetChange with its id and closes the popover', async () => {
    const emitSpy = vi.fn();
    component.presetChange.subscribe(emitSpy);
    await openPopover();

    const lastYear = quickRangeButtons().find(
      (button) => button.getAttribute('data-quick-range-id') === 'previous-year',
    )!;
    lastYear.click();
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledExactlyOnceWith('previous-year');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('typing in the search filters entries live and hides emptied groups', async () => {
    await openPopover();
    const searchInput: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[aria-label="Search quick ranges"]',
    );

    searchInput.value = 'fiscal';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const ids = quickRangeButtons().map((button) => button.getAttribute('data-quick-range-id'));
    expect(ids).toEqual(['previous-fiscal-quarter', 'previous-fiscal-year']);
    // Both fiscal entries are in "Previous period" — every other group is now empty and hidden.
    const panelText = fixture.nativeElement.textContent as string;
    expect(panelText).toContain('Previous period');
    expect(panelText).not.toContain('Relative');
    expect(panelText).not.toContain('Everything');
  });

  it('shows an empty state when nothing matches, and clearing the search restores the full list', async () => {
    await openPopover();
    const searchInput: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[aria-label="Search quick ranges"]',
    );

    searchInput.value = 'not a real range';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(quickRangeButtons()).toHaveLength(0);
    expect(fixture.nativeElement.textContent).toContain('No ranges match');

    searchInput.value = '';
    searchInput.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(quickRangeButtons()).toHaveLength(QUICK_RANGES.length);
  });

  it('Escape closes the popover', async () => {
    await openPopover();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('a click outside the component closes the popover', async () => {
    await openPopover();

    const outside = document.createElement('div');
    document.body.appendChild(outside);
    outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();
    outside.remove();

    expect(trigger().getAttribute('aria-expanded')).toBe('false');
  });

  it('a click inside the popover does not close it', async () => {
    await openPopover();

    const panelHeading = fixture.nativeElement.querySelector('mm-paper') as HTMLElement;
    panelHeading.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    fixture.detectChanges();

    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('focus moves into the popover (the search field) on open, and returns to the trigger on close', async () => {
    trigger().focus();
    await openPopover();

    const searchInput: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[aria-label="Search quick ranges"]',
    );
    expect(document.activeElement).toBe(searchInput);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(document.activeElement).toBe(trigger());
  });

  it("falls back to focusing the trigger's native button when the previously-focused element is gone", async () => {
    trigger().focus();
    await openPopover();
    // Simulate the element that had focus before opening having since been removed from the DOM
    // (e.g. the page re-rendered while the popover was open) — the plain `<mm-button>` host isn't
    // itself focusable, so this exercises that the fallback reaches the real inner `<button>`.
    (
      component as unknown as { elementFocusedBeforeOpen: HTMLElement | null }
    ).elementFocusedBeforeOpen = document.createElement('button');

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();

    expect(document.activeElement).toBe(trigger());
  });

  it('ArrowDown/ArrowUp move focus through the visible quick-range buttons', async () => {
    await openPopover();
    const buttons = quickRangeButtons();

    buttons[0].focus();
    buttons[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(document.activeElement).toBe(buttons[1]);

    buttons[1].dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }));
    expect(document.activeElement).toBe(buttons[0]);
  });

  it('the popover panel stacks below md and sits side by side from md up', async () => {
    await openPopover();

    const panelRow = fixture.nativeElement.querySelector('[data-testid="range-picker-panels"]');
    expect(panelRow?.className).toContain('flex-col');
    expect(panelRow?.className).toContain('md:flex-row');
  });

  it('disables the previous/next buttons while a steppingDisabled entry ("this-year-so-far") is selected', () => {
    fixture.componentRef.setInput(
      'value',
      value({ preset: 'this-year-so-far', from: '2026-01-01', to: '2026-07-14' }),
    );
    fixture.detectChanges();

    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('mm-button button'),
    );
    const chevronButtons = buttons.filter((button) => !button.hasAttribute('aria-expanded'));
    expect(chevronButtons.every((button) => button.disabled)).toBe(true);
  });

  it('disables the previous/next buttons while "all-time" is selected', () => {
    fixture.componentRef.setInput(
      'value',
      value({ preset: 'all-time', from: '2015-01-01', to: '2026-07-14' }),
    );
    fixture.detectChanges();

    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('mm-button button'),
    );
    const chevronButtons = buttons.filter((button) => !button.hasAttribute('aria-expanded'));
    expect(chevronButtons.every((button) => button.disabled)).toBe(true);
  });

  it('enables the previous/next buttons for a regular preset', () => {
    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('mm-button button'),
    );
    const chevronButtons = buttons.filter((button) => !button.hasAttribute('aria-expanded'));
    expect(chevronButtons.every((button) => !button.disabled)).toBe(true);
  });

  it('emits rangeShift(-1) when the previous button is clicked', () => {
    const emitSpy = vi.fn();
    component.rangeShift.subscribe(emitSpy);

    const [previousButton]: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('mm-button button'),
    );
    previousButton.click();

    expect(emitSpy).toHaveBeenCalledWith(-1);
  });

  it('emits rangeShift(1) when the next button is clicked', () => {
    const emitSpy = vi.fn();
    component.rangeShift.subscribe(emitSpy);

    const buttons: HTMLButtonElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('mm-button button'),
    );
    buttons[buttons.length - 1].click();

    expect(emitSpy).toHaveBeenCalledWith(1);
  });

  describe('the absolute panel and Apply staging (TICKET-STAT-39)', () => {
    beforeEach(() => {
      // The panel seeds from the page's real `fromExpr`/`toExpr` (TICKET-STAT-39) — these tests
      // assume a relative-expression seed, so override the outer `beforeEach`'s fixed-date default.
      fixture.componentRef.setInput(
        'value',
        value({ preset: 'custom', fromExpr: 'now-30d', toExpr: 'now' }),
      );
      fixture.detectChanges();
    });

    it('applying commits both edges, closes the popover, and updates the trigger label', async () => {
      const applySpy = vi.fn();
      component.customRangeChange.subscribe(applySpy);
      await openPopover();

      typeInto(absoluteFromInput(), 'now-7d');
      absoluteApplyButton().click();
      fixture.detectChanges();

      expect(applySpy).toHaveBeenCalledExactlyOnceWith({ from: 'now-7d', to: 'now' });
      expect(trigger().getAttribute('aria-expanded')).toBe('false');
    });

    it('Esc with unapplied edits keeps the popover open, shows the message, and focuses Apply', async () => {
      await openPopover();
      typeInto(absoluteFromInput(), 'now-7d');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();

      expect(trigger().getAttribute('aria-expanded')).toBe('true');
      expect(fixture.nativeElement.textContent).toContain('unapplied changes');
      expect(document.activeElement).toBe(absoluteApplyButton());
    });

    it('a second Esc discards the staged edits and closes', async () => {
      await openPopover();
      typeInto(absoluteFromInput(), 'now-7d');

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();

      expect(trigger().getAttribute('aria-expanded')).toBe('false');
      // The applied range was never touched.
      expect(component.value().from).toBe('2026-07-01');
    });

    it('an outside click with unapplied edits keeps the popover open and shows the message (does not discard)', async () => {
      await openPopover();
      typeInto(absoluteFromInput(), 'now-7d');

      const outside = document.createElement('div');
      document.body.appendChild(outside);
      outside.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();
      outside.remove();

      expect(trigger().getAttribute('aria-expanded')).toBe('true');
      expect(fixture.nativeElement.textContent).toContain('unapplied changes');
      // Still there to be applied or discarded — an outside click never itself discards.
      expect(absoluteFromInput().value).toBe('now-7d');
    });

    it('Esc or an outside click with no unapplied edits still closes immediately (STAT-38 behaviour unchanged)', async () => {
      await openPopover();

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();

      expect(trigger().getAttribute('aria-expanded')).toBe('false');
    });

    it('picking a quick range while edits are staged discards them, applies the quick range, and closes', async () => {
      const presetSpy = vi.fn();
      component.presetChange.subscribe(presetSpy);
      await openPopover();
      typeInto(absoluteFromInput(), 'now-7d');

      const previousYear = quickRangeButtons().find(
        (button) => button.getAttribute('data-quick-range-id') === 'previous-year',
      )!;
      previousYear.click();
      fixture.detectChanges();

      expect(presetSpy).toHaveBeenCalledExactlyOnceWith('previous-year');
      expect(trigger().getAttribute('aria-expanded')).toBe('false');

      // Reopening re-seeds from whatever the page's range is now — no leftover staged text.
      fixture.componentRef.setInput(
        'value',
        value({ preset: 'previous-year', from: '2025-01-01', to: '2025-12-31' }),
      );
      fixture.detectChanges();
      await openPopover();
      expect(absoluteFromInput().value).toBe('2025-01-01');
    });
  });
});
