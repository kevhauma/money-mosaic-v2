import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ConfirmDialogComponent } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let component: ConfirmDialogComponent;
  let fixture: ComponentFixture<ConfirmDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('title', 'Delete this account?');
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('emits confirmed once and closes the modal when the confirm button is clicked', async () => {
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    const emitted: void[] = [];
    component.confirmed.subscribe((value) => emitted.push(value));

    const buttons = fixture.nativeElement.querySelectorAll('mm-button button');
    const confirmButton = buttons[buttons.length - 1] as HTMLButtonElement;
    confirmButton.click();
    await fixture.whenStable();

    expect(emitted.length).toBe(1);
    expect(component.open()).toBe(false);
  });

  it('closes without emitting confirmed when cancelled', async () => {
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    const emitted: void[] = [];
    component.confirmed.subscribe((value) => emitted.push(value));

    const buttons = fixture.nativeElement.querySelectorAll('mm-button button');
    const cancelButton = buttons[0] as HTMLButtonElement;
    cancelButton.click();
    await fixture.whenStable();

    expect(emitted.length).toBe(0);
    expect(component.open()).toBe(false);
  });

  it('applies the danger color to the confirm button when danger is set', async () => {
    fixture.componentRef.setInput('danger', true);
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    const buttons = fixture.nativeElement.querySelectorAll('mm-button button');
    const confirmButton = buttons[buttons.length - 1] as HTMLButtonElement;
    expect(confirmButton.className).toContain('btn-error');
  });

  describe('confirmPhrase gating', () => {
    it('keeps confirm disabled and rejects a submit attempt until the typed phrase matches exactly', async () => {
      fixture.componentRef.setInput('confirmPhrase', 'DELETE');
      fixture.componentRef.setInput('open', true);
      await fixture.whenStable();

      const emitted: void[] = [];
      component.confirmed.subscribe((value) => emitted.push(value));
      const buttons = fixture.nativeElement.querySelectorAll('mm-button button');
      const confirmButton = buttons[buttons.length - 1] as HTMLButtonElement;
      const phraseInput = fixture.nativeElement.querySelector(
        'input[type="text"]',
      ) as HTMLInputElement;

      // Empty field: disabled.
      expect(confirmButton.disabled).toBe(true);

      // Wrong / partial phrase: still disabled, and a click (were it possible) must not confirm.
      phraseInput.value = 'delete';
      phraseInput.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      expect(confirmButton.disabled).toBe(true);
      confirmButton.click();
      await fixture.whenStable();
      expect(emitted.length).toBe(0);
      expect(component.open()).toBe(true);

      // Exact phrase: enables and confirms.
      phraseInput.value = 'DELETE';
      phraseInput.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      expect(confirmButton.disabled).toBe(false);
      confirmButton.click();
      await fixture.whenStable();
      expect(emitted.length).toBe(1);
      expect(component.open()).toBe(false);
    });

    it('resets the typed phrase when the dialog is reopened', async () => {
      fixture.componentRef.setInput('confirmPhrase', 'DELETE');
      fixture.componentRef.setInput('open', true);
      await fixture.whenStable();
      const phraseInput = fixture.nativeElement.querySelector(
        'input[type="text"]',
      ) as HTMLInputElement;
      phraseInput.value = 'DELETE';
      phraseInput.dispatchEvent(new Event('input'));
      await fixture.whenStable();

      fixture.componentRef.setInput('open', false);
      await fixture.whenStable();
      fixture.componentRef.setInput('open', true);
      await fixture.whenStable();

      const buttons = fixture.nativeElement.querySelectorAll('mm-button button');
      const confirmButton = buttons[buttons.length - 1] as HTMLButtonElement;
      expect(confirmButton.disabled).toBe(true);
    });
  });
});
