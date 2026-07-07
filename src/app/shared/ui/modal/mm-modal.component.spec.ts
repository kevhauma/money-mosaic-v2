import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { MmModalComponent } from './mm-modal.component';

describe('MmModalComponent', () => {
  let component: MmModalComponent;
  let fixture: ComponentFixture<MmModalComponent>;
  let dialogElement: HTMLDialogElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MmModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MmModalComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
    dialogElement = fixture.nativeElement.querySelector('dialog');

    // jsdom doesn't implement HTMLDialogElement.showModal/close; stub them so vi.spyOn has a
    // real property to wrap, mirroring how the component guards them with `?.()` at runtime.
    dialogElement.showModal ??= () => {};
    dialogElement.close ??= () => {};
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('calls showModal when open becomes true', async () => {
    const showModalSpy = vi.spyOn(dialogElement, 'showModal').mockImplementation(() => {});

    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    expect(showModalSpy).toHaveBeenCalled();
  });

  it('calls close when open becomes false', async () => {
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    const closeSpy = vi.spyOn(dialogElement, 'close').mockImplementation(() => {});
    fixture.componentRef.setInput('open', false);
    await fixture.whenStable();

    expect(closeSpy).toHaveBeenCalled();
  });

  it('resets the open model when the dialog fires a native close event', async () => {
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    dialogElement.dispatchEvent(new Event('close'));
    await fixture.whenStable();

    expect(component.open()).toBe(false);
  });

  it('resets the open model when the dialog fires a native cancel event', async () => {
    fixture.componentRef.setInput('open', true);
    await fixture.whenStable();

    dialogElement.dispatchEvent(new Event('cancel'));
    await fixture.whenStable();

    expect(component.open()).toBe(false);
  });
});
