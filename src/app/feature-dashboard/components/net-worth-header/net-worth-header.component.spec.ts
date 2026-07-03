import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NetWorthHeaderComponent } from './net-worth-header.component';

describe('NetWorthHeaderComponent', () => {
  let fixture: ComponentFixture<NetWorthHeaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NetWorthHeaderComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NetWorthHeaderComponent);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
