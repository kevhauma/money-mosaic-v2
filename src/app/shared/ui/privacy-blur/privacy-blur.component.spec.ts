import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MM_PRIVACY_BLURRED_CLASS } from '@/shared/utils';
import { PrivacyBlurComponent } from './privacy-blur.component';

/** `blurred` is a signal, not a plain field: this app change-detects zoneless, so a plain mutation never marks the host view dirty. */
@Component({
  imports: [PrivacyBlurComponent],
  template: `<mm-privacy-blur [blurred]="blurred()">€1,234.56</mm-privacy-blur>`,
})
class HostComponent {
  readonly blurred = signal(false);
}

describe('PrivacyBlurComponent: blur toggling', () => {
  let fixture: ComponentFixture<HostComponent>;

  const wrapper = (): HTMLElement => fixture.nativeElement.querySelector('mm-privacy-blur > span');

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
  });

  it('renders projected content untouched when blurred is false', () => {
    expect(wrapper().textContent?.trim()).toBe('€1,234.56');
    expect(wrapper().classList).not.toContain(MM_PRIVACY_BLURRED_CLASS);
  });

  it('applies the blur class and blocks text selection when blurred is true', () => {
    fixture.componentInstance.blurred.set(true);
    fixture.detectChanges();

    expect(wrapper().classList).toContain(MM_PRIVACY_BLURRED_CLASS);
    expect(wrapper().classList).toContain('select-none');
    // Still in the DOM — blur is a visual treatment, not a removal.
    expect(wrapper().textContent?.trim()).toBe('€1,234.56');
  });

  it('removes the blur class again when blurred goes back to false', () => {
    fixture.componentInstance.blurred.set(true);
    fixture.detectChanges();
    fixture.componentInstance.blurred.set(false);
    fixture.detectChanges();

    expect(wrapper().classList).not.toContain(MM_PRIVACY_BLURRED_CLASS);
    expect(wrapper().classList).not.toContain('select-none');
  });

  it('keeps pointer events on, so a link wrapping a blurred figure stays clickable', () => {
    fixture.componentInstance.blurred.set(true);
    fixture.detectChanges();

    expect(wrapper().classList).not.toContain('pointer-events-none');
  });
});
