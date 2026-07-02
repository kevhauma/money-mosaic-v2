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
