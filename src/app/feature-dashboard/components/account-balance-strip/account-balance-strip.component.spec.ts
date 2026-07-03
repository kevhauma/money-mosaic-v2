import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AccountBalanceStripComponent } from './account-balance-strip.component';

describe('AccountBalanceStripComponent', () => {
  let fixture: ComponentFixture<AccountBalanceStripComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountBalanceStripComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountBalanceStripComponent);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
