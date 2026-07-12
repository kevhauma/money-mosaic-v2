import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RulesOverviewComponent } from './rules-overview.component';

// RuleProposalsComponent injects CategoryModelStore -> CategoryModelService, which eagerly
// constructs a real Worker (unavailable in jsdom) — stub it, same as category-model.service.spec.ts.
class FakeWorker {
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  postMessage = vi.fn();
  terminate = vi.fn();
}

describe('RulesOverviewComponent', () => {
  let component: RulesOverviewComponent;
  let fixture: ComponentFixture<RulesOverviewComponent>;

  beforeEach(async () => {
    vi.stubGlobal('Worker', FakeWorker);
    await TestBed.configureTestingModule({
      imports: [RulesOverviewComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(RulesOverviewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
