import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed, type ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { HydrationBoundaryComponent } from './hydration-boundary.component';

@Component({
  selector: 'app-boundary-host',
  imports: [HydrationBoundaryComponent],
  template: `<mm-hydration-boundary
    [loading]="loading()"
    [error]="error()"
    (retry)="retries.set(retries() + 1)"
  >
    <p>The content</p>
  </mm-hydration-boundary>`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class BoundaryHostComponent {
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly retries = signal(0);
}

describe('HydrationBoundaryComponent', () => {
  let fixture: ComponentFixture<BoundaryHostComponent>;

  const host = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const text = (): string => host().textContent ?? '';

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BoundaryHostComponent],
      providers: [provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(BoundaryHostComponent);
    fixture.detectChanges();
  });

  it('shows the content when nothing is loading or broken', () => {
    expect(text()).toContain('The content');
    expect(host().querySelector('.skeleton')).toBeNull();
  });

  it('shows a skeleton instead of the content while loading', () => {
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();

    expect(host().querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    expect(text()).not.toContain('The content');
  });

  it('shows the failure and a retry, and never the content behind it', () => {
    fixture.componentInstance.loading.set(true);
    fixture.componentInstance.error.set('Cannot reach the server. Is it running?');
    fixture.detectChanges();

    expect(text()).toContain('Cannot reach the server. Is it running?');
    expect(text()).not.toContain('The content');
    // The failure wins over the load: a store that failed is not loading any more.
    expect(host().querySelector('.skeleton')).toBeNull();
    expect(host().querySelector('[role="alert"]')).not.toBeNull();
  });

  it('asks the page to retry when the button is pressed', () => {
    fixture.componentInstance.error.set('nope');
    fixture.detectChanges();

    host().querySelector('button')!.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.retries()).toBe(1);
  });
});
