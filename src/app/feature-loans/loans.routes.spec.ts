import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { LOANS_ROUTES } from './loans.routes';

describe('LOANS_ROUTES (TICKET-LOAN-02)', () => {
  it('resolves the overview at /loans via lazy loadChildren', async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'loans', children: LOANS_ROUTES }])],
    });

    expect(await TestBed.inject(Router).navigateByUrl('/loans')).toBe(true);
  });
});
