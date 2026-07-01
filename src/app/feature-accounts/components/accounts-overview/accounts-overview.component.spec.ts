import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AccountsOverviewComponent } from './accounts-overview.component';

describe('AccountsOverviewComponent', () => {
  let component: AccountsOverviewComponent;
  let fixture: ComponentFixture<AccountsOverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountsOverviewComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountsOverviewComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
