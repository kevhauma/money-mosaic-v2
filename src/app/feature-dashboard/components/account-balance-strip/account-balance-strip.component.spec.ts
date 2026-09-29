import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AccountBalanceStripComponent } from './account-balance-strip.component';
import { provideFakeApi } from '@/core/data-access/fake-api.testing';

describe('AccountBalanceStripComponent', () => {
  let fixture: ComponentFixture<AccountBalanceStripComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountBalanceStripComponent],
      providers: [...provideFakeApi(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountBalanceStripComponent);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
