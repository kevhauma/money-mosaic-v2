import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import type { PendingAccountDraft } from '../import-select-step/import-select-step.component';
import { AccountDraftEditorComponent } from './account-draft-editor.component';

const draft: PendingAccountDraft = {
  id: 'draft-1',
  ownerFile: new File(['a'], 'bank.csv'),
  name: 'Rabobank',
  iban: 'BE00123',
  type: 'checking',
};

describe('AccountDraftEditorComponent (TICKET-IMP-08)', () => {
  let fixture: ComponentFixture<AccountDraftEditorComponent>;

  const setup = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [AccountDraftEditorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountDraftEditorComponent);
    fixture.componentRef.setInput('draft', draft);
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it("renders the draft's current name, IBAN, and type", async () => {
    await setup();
    const [nameInput, ibanInput] = fixture.nativeElement.querySelectorAll('input');
    const select = fixture.nativeElement.querySelector('select');

    expect(nameInput.value).toBe('Rabobank');
    expect(ibanInput.value).toBe('BE00123');
    expect(select.value).toBe('checking');
  });

  it('emits nameChange with the typed value', async () => {
    await setup();
    const emitSpy = vi.fn();
    fixture.componentInstance.nameChange.subscribe(emitSpy);
    const [nameInput] = fixture.nativeElement.querySelectorAll('input');

    nameInput.value = 'New Name';
    nameInput.dispatchEvent(new Event('input'));

    expect(emitSpy).toHaveBeenCalledWith('New Name');
  });

  it('emits ibanChange with the typed value', async () => {
    await setup();
    const emitSpy = vi.fn();
    fixture.componentInstance.ibanChange.subscribe(emitSpy);
    const [, ibanInput] = fixture.nativeElement.querySelectorAll('input');

    ibanInput.value = 'NL00987';
    ibanInput.dispatchEvent(new Event('input'));

    expect(emitSpy).toHaveBeenCalledWith('NL00987');
  });

  it('emits typeChange with the selected value', async () => {
    await setup();
    const emitSpy = vi.fn();
    fixture.componentInstance.typeChange.subscribe(emitSpy);
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;

    select.value = 'savings';
    select.dispatchEvent(new Event('change'));

    expect(emitSpy).toHaveBeenCalledWith('savings');
  });

  it('emits cancelled when the Cancel button is clicked', async () => {
    await setup();
    const emitSpy = vi.fn();
    fixture.componentInstance.cancelled.subscribe(emitSpy);
    const button = [...fixture.nativeElement.querySelectorAll('button')].find(
      (b: HTMLButtonElement) => b.textContent?.trim() === 'Cancel',
    ) as HTMLButtonElement;

    button.click();

    expect(emitSpy).toHaveBeenCalled();
  });
});
