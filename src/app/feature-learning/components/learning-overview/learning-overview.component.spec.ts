import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LearningOverviewComponent } from './learning-overview.component';

// ModelStatusComponent injects CategoryModelStore -> CategoryModelService, which eagerly
// constructs a real Worker (unavailable in jsdom) — stub it, same as category-model.service.spec.ts.
class FakeWorker {
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  postMessage = vi.fn();
  terminate = vi.fn();
}

describe('LearningOverviewComponent', () => {
  let component: LearningOverviewComponent;
  let fixture: ComponentFixture<LearningOverviewComponent>;

  beforeEach(async () => {
    vi.stubGlobal('Worker', FakeWorker);
    await TestBed.configureTestingModule({
      imports: [LearningOverviewComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(LearningOverviewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the model-status badge in the header and the detail in the body (TICKET-ML-18)', () => {
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;

    // Per-state text and colour are covered on the badge itself
    // (`model-status-badge.component.spec.ts`), where every status is reachable without a trained
    // model; what this asserts is the placement the ticket is about.
    expect(page.querySelector('mm-page-header app-model-status-badge')).not.toBeNull();
    expect(page.querySelector('app-model-status')).not.toBeNull();
    expect(page.querySelector('mm-page-header app-model-status')).toBeNull();
  });

  it('renders no subtitle on /learning (TICKET-UI-22)', () => {
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;

    expect(page.querySelector('mm-page-header h1')?.textContent?.trim()).toBe('Learning');
    expect(page.querySelector('mm-page-header .mm-page-title p')).toBeNull();
  });
});
